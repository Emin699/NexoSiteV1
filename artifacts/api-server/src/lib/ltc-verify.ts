/**
 * Verifies a Litecoin transaction on-chain using a public block explorer.
 *
 * Returns:
 *   - { ok: true, ltcReceived } when the tx exists, has >=1 confirmation, and
 *     pays at least one output worth `ltcReceived` to `expectedAddress`.
 *   - { ok: false, reason } otherwise.
 *
 * The explorer used is Blockchair (no API key required, generous free tier).
 * If the request fails entirely (network outage, rate-limit, etc.) we DO NOT
 * grant credit — we return ok=false with a transient reason so the user can
 * retry later. We never trust the client's claimed amount.
 */
export type LtcVerifyResult =
  | { ok: true; ltcReceived: number; confirmations: number; timestamp: number }
  | { ok: false; reason: string; transient?: boolean };

export async function verifyLitecoinTx(
  txHash: string,
  expectedAddress: string,
  minConfirmations = 1,
): Promise<LtcVerifyResult> {
  if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
    return { ok: false, reason: "Format de hash de transaction invalide" };
  }

  const url = `https://api.blockchair.com/litecoin/dashboards/transaction/${txHash}`;

  let resp: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
  } catch {
    return { ok: false, reason: "Explorer indisponible — réessaie", transient: true };
  }

  if (!resp.ok) {
    if (resp.status === 404) {
      return { ok: false, reason: "Transaction introuvable sur le réseau" };
    }
    return { ok: false, reason: `Explorer error ${resp.status}`, transient: true };
  }

  let body: {
    data?: Record<
      string,
      {
        transaction?: { block_id?: number; time?: string };
        outputs?: Array<{ recipient?: string; value?: number }>;
      }
    >;
    context?: { state?: number };
  };
  try {
    body = (await resp.json()) as typeof body;
  } catch {
    return { ok: false, reason: "Réponse explorer invalide", transient: true };
  }

  const entry = body?.data?.[txHash];
  if (!entry || !entry.transaction) {
    return { ok: false, reason: "Transaction introuvable sur le réseau" };
  }

  const blockId = entry.transaction.block_id ?? 0;
  const headBlock = body?.context?.state ?? 0;
  const confirmations = blockId > 0 && headBlock > 0 ? Math.max(0, headBlock - blockId + 1) : 0;
  if (confirmations < minConfirmations) {
    return {
      ok: false,
      reason: `Transaction non confirmée (${confirmations} confirmations, ${minConfirmations} requis)`,
      transient: true,
    };
  }

  const outputs = entry.outputs ?? [];
  const litoshiSent = outputs
    .filter((o) => o.recipient === expectedAddress)
    .reduce((sum, o) => sum + (o.value ?? 0), 0);

  if (litoshiSent <= 0) {
    return { ok: false, reason: "Cette transaction ne paie pas l'adresse attendue" };
  }

  // 1 LTC = 100,000,000 litoshis
  const ltcReceived = Math.round((litoshiSent / 1e8) * 1e8) / 1e8;
  // Block timestamp (UTC string from Blockchair). Falls back to 0 if absent.
  const timeStr = entry.transaction.time;
  const timestamp = timeStr ? Math.floor(new Date(timeStr + "Z").getTime() / 1000) : 0;
  return { ok: true, ltcReceived, confirmations, timestamp };
}

export type IncomingTx = {
  txHash: string;
  ltcReceived: number;
  confirmations: number;
  timestamp: number; // unix seconds
};

/**
 * Lists recent transactions that paid the given LTC address. Used by the
 * background recharge watcher to auto-detect incoming payments without any
 * manual user action. Returns the most recent ~100 txs (Blockchair default).
 */
export async function listIncomingTxs(
  address: string,
): Promise<{ ok: true; txs: IncomingTx[] } | { ok: false; reason: string }> {
  const url = `https://api.blockchair.com/litecoin/dashboards/address/${address}?limit=100`;

  let resp: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
  } catch {
    return { ok: false, reason: "Explorer indisponible" };
  }

  if (!resp.ok) {
    return { ok: false, reason: `Explorer error ${resp.status}` };
  }

  let body: {
    data?: Record<
      string,
      {
        transactions?: string[];
      }
    >;
    context?: { state?: number };
  };
  try {
    body = (await resp.json()) as typeof body;
  } catch {
    return { ok: false, reason: "Réponse explorer invalide" };
  }

  const entry = body?.data?.[address];
  const txHashes = entry?.transactions ?? [];
  if (txHashes.length === 0) return { ok: true, txs: [] };

  // Fetch tx details for the first up-to-10 hashes (Blockchair allows comma-separated).
  const subset = txHashes.slice(0, 10);
  const detailsUrl = `https://api.blockchair.com/litecoin/dashboards/transactions/${subset.join(",")}`;

  let detailsResp: Response;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    detailsResp = await fetch(detailsUrl, { signal: controller.signal });
    clearTimeout(timeout);
  } catch {
    return { ok: false, reason: "Explorer indisponible" };
  }

  if (!detailsResp.ok) return { ok: false, reason: `Explorer error ${detailsResp.status}` };

  let detailsBody: {
    data?: Record<
      string,
      {
        transaction?: { block_id?: number; time?: string };
        outputs?: Array<{ recipient?: string; value?: number }>;
      }
    >;
    context?: { state?: number };
  };
  try {
    detailsBody = (await detailsResp.json()) as typeof detailsBody;
  } catch {
    return { ok: false, reason: "Réponse explorer invalide" };
  }

  const head = detailsBody?.context?.state ?? 0;
  const txs: IncomingTx[] = [];
  for (const hash of subset) {
    const e = detailsBody?.data?.[hash];
    if (!e?.transaction) continue;
    const blockId = e.transaction.block_id ?? 0;
    const conf = blockId > 0 && head > 0 ? Math.max(0, head - blockId + 1) : 0;
    const litoshi = (e.outputs ?? [])
      .filter((o) => o.recipient === address)
      .reduce((s, o) => s + (o.value ?? 0), 0);
    if (litoshi <= 0) continue;
    const ts = e.transaction.time ? Math.floor(new Date(e.transaction.time + "Z").getTime() / 1000) : 0;
    txs.push({
      txHash: hash,
      ltcReceived: litoshi / 1e8,
      confirmations: conf,
      timestamp: ts,
    });
  }
  return { ok: true, txs };
}

