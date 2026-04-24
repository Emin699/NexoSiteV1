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
  | { ok: true; ltcReceived: number; confirmations: number }
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
        transaction?: { block_id?: number };
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
  return { ok: true, ltcReceived, confirmations };
}
