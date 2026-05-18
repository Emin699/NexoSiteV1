import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable, cryptoRechargesTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { verifyLitecoinTx } from "../lib/ltc-verify";
import { notify, safeNotify } from "../lib/notifier";
import {
  InitiateCryptoRechargeBody,
  VerifyCryptoRechargeBody,
  GetWalletResponse,
  GetTransactionsResponse,
  InitiateCryptoRechargeResponse,
  VerifyCryptoRechargeResponse,
  GetPendingCryptoRechargesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const LTC_WALLET_ADDRESS = process.env["LTC_WALLET_ADDRESS"] ?? "";

router.get("/wallet", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    GetWalletResponse.parse({
      balance: Number(user.balance),
      loyaltyPoints: user.loyaltyPoints,
      totalRecharged: Number(user.totalRecharged),
      purchaseCount: user.purchaseCount,
    })
  );
});

router.get("/wallet/transactions", requireAuth, async (req, res): Promise<void> => {
  const txs = await db
    .select()
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, req.userId!))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(30);

  res.json(
    GetTransactionsResponse.parse(
      txs.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      }))
    )
  );
});

router.post("/wallet/recharge/crypto", requireAuth, async (req, res): Promise<void> => {
  const { getBoolSetting } = await import("../lib/app-settings.js");
  const enabled = await getBoolSetting("ltc_enabled", true);
  if (!enabled) {
    res.status(503).json({ error: "Recharge Litecoin temporairement en maintenance" });
    return;
  }
  // Nouveau système : aucun montant requis. L'utilisateur envoie ce qu'il veut ;
  // le watcher détecte la TX et crédite le montant reçu + bonus automatiquement.
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  let recharge: typeof cryptoRechargesTable.$inferSelect | undefined;
  try {
    [recharge] = await db
      .insert(cryptoRechargesTable)
      .values({
        userId: req.userId!,
        provider: "ltc",
        amountEur: "0.00",
        amountLtc: "0.00000000",
        address: LTC_WALLET_ADDRESS,
        status: "pending",
        expiresAt,
      })
      .returning();
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string } };
    const code = e.code ?? e.cause?.code;
    if (code === "23505") {
      res.status(503).json({ error: "Une recharge LTC est déjà en cours. Annule-la d'abord ou attends qu'elle expire." });
      return;
    }
    throw err;
  }

  if (!recharge) {
    res.status(503).json({ error: "Impossible de créer la session de recharge." });
    return;
  }

  safeNotify(async () => {
    const [me] = await db
      .select({ id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName })
      .from(usersTable)
      .where(eq(usersTable.id, req.userId!));
    if (me) notify.rechargeStarted({ user: me, method: "crypto", amount: 0 });
  });

  res.json(
    InitiateCryptoRechargeResponse.parse({
      sessionId: recharge.id,
      address: LTC_WALLET_ADDRESS,
      amountLtc: 0,
      amountEur: 0,
      exchangeRate: 0,
      expiresAt: expiresAt.toISOString(),
    })
  );
});

router.get("/wallet/recharge/crypto/pending", requireAuth, async (req, res): Promise<void> => {
  const now = new Date();
  const rows = await db
    .select()
    .from(cryptoRechargesTable)
    .where(and(
      eq(cryptoRechargesTable.userId, req.userId!),
      eq(cryptoRechargesTable.status, "pending"),
    ))
    .orderBy(desc(cryptoRechargesTable.createdAt))
    .limit(20);

  // Auto-mark expired ones (housekeeping)
  const expiredIds = rows.filter((r) => r.expiresAt < now).map((r) => r.id);
  if (expiredIds.length > 0) {
    await db
      .update(cryptoRechargesTable)
      .set({ status: "expired" })
      .where(sql`id = ANY(${expiredIds})`);
  }

  const stillPending = rows.filter((r) => r.expiresAt >= now);

  res.json(
    GetPendingCryptoRechargesResponse.parse(
      stillPending.map((r) => ({
        id: r.id,
        amountEur: Number(r.amountEur),
        amountLtc: Number(r.amountLtc),
        address: r.address,
        status: r.status,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
      }))
    )
  );
});

router.delete("/wallet/recharge/crypto/pending/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const [updated] = await db
    .update(cryptoRechargesTable)
    .set({ status: "cancelled" })
    .where(and(
      eq(cryptoRechargesTable.id, id),
      eq(cryptoRechargesTable.userId, req.userId!),
      eq(cryptoRechargesTable.status, "pending"),
    ))
    .returning();

  if (!updated) { res.status(404).json({ error: "Recharge introuvable" }); return; }
  res.json({ success: true });
});

router.post("/wallet/recharge/crypto/verify", requireAuth, async (req, res): Promise<void> => {
  const parsed = VerifyCryptoRechargeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { txHash, amountEur, sessionId } = parsed.data;

  if (!txHash || !/^[a-fA-F0-9]{64}$/.test(txHash)) {
    res.json(
      VerifyCryptoRechargeResponse.parse({
        success: false,
        message: "Hash de transaction invalide",
        newBalance: null,
      })
    );
    return;
  }

  // 0) Reject if this txHash was ALREADY used to verify any recharge (cross-user replay protection).
  const [globalReplay] = await db
    .select()
    .from(cryptoRechargesTable)
    .where(and(
      eq(cryptoRechargesTable.txHash, txHash),
      eq(cryptoRechargesTable.status, "verified"),
    ));
  if (globalReplay) {
    if (globalReplay.userId === req.userId) {
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
      res.json(VerifyCryptoRechargeResponse.parse({
        success: true,
        message: "Recharge déjà confirmée précédemment",
        newBalance: u ? Number(u.balance) : null,
      }));
      return;
    }
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false,
      message: "Cette transaction a déjà été utilisée",
      newBalance: null,
    }));
    return;
  }

  // 1) Pick pending session (prefer explicit id, else most-recent pending for user).
  let pending: typeof cryptoRechargesTable.$inferSelect | null = null;
  if (sessionId) {
    const [r] = await db.select().from(cryptoRechargesTable)
      .where(and(eq(cryptoRechargesTable.id, sessionId), eq(cryptoRechargesTable.userId, req.userId!)));
    pending = r ?? null;
  } else {
    const [r] = await db.select().from(cryptoRechargesTable)
      .where(and(eq(cryptoRechargesTable.userId, req.userId!), eq(cryptoRechargesTable.status, "pending")))
      .orderBy(desc(cryptoRechargesTable.createdAt)).limit(1);
    pending = r ?? null;
  }

  if (!pending) {
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false, message: "Aucune recharge en attente trouvée", newBalance: null,
    }));
    return;
  }
  if (pending.status !== "pending") {
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false,
      message: `Recharge déjà ${pending.status === "verified" ? "validée" : pending.status}`,
      newBalance: null,
    }));
    return;
  }
  if (pending.expiresAt < new Date()) {
    await db.update(cryptoRechargesTable).set({ status: "expired" })
      .where(eq(cryptoRechargesTable.id, pending.id));
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false, message: "Session expirée — recommence", newBalance: null,
    }));
    return;
  }

  // 2) On-chain verification — server fetches the tx and validates address+confirmations.
  const verification = await verifyLitecoinTx(txHash, pending.address, 1);
  if (!verification.ok) {
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false, message: verification.reason, newBalance: null,
    }));
    return;
  }
  // Temporal guard: reject any tx older than the session (5s clock-skew slack).
  if (!verification.timestamp || verification.timestamp <= 0) {
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false,
      message: "Transaction non encore inscrite dans un bloc — réessaie",
      newBalance: null,
    }));
    return;
  }
  const txTimeMs = verification.timestamp * 1000;
  if (txTimeMs < pending.createdAt.getTime() - 5_000) {
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false,
      message: "Transaction antérieure à la session — non attribuable",
      newBalance: null,
    }));
    return;
  }

  // 3) Calculer le montant EUR reçu + bonus crypto (10% si > 100€, sinon 5%)
  let exchangeRate = 80;
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=eur");
    const d = await r.json() as { litecoin?: { eur?: number } };
    exchangeRate = d?.litecoin?.eur ?? 80;
  } catch { /* fallback */ }
  const amountEurBase = verification.ltcReceived * exchangeRate;
  const bonusPct = amountEurBase > 100 ? 10 : 5;
  const credited = Math.round(amountEurBase * (1 + bonusPct / 100) * 100) / 100;

  // 4) Atomic credit — only the UPDATE that flips pending→verified actually grants funds.
  try {
    const result = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(cryptoRechargesTable)
        .set({
          status: "verified",
          txHash,
          verifiedAt: new Date(),
          amountLtc: verification.ltcReceived.toFixed(8),
          amountEur: credited.toFixed(2),
        })
        .where(and(
          eq(cryptoRechargesTable.id, pending!.id),
          eq(cryptoRechargesTable.status, "pending"),
        ))
        .returning();
      if (claimed.length === 0) {
        throw Object.assign(new Error("Recharge déjà traitée"), { status: 409 });
      }

      const [user] = await tx.update(usersTable)
        .set({
          balance: sql`${usersTable.balance} + ${credited.toFixed(2)}`,
          totalRecharged: sql`${usersTable.totalRecharged} + ${credited.toFixed(2)}`,
        })
        .where(eq(usersTable.id, req.userId!))
        .returning();

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "credit",
        amount: credited.toFixed(2),
        description: `Recharge Litecoin +${bonusPct}% bonus (${credited.toFixed(2)}€) — tx ${txHash.slice(0, 12)}…`,
      });

      return {
        success: true,
        message: `Recharge de ${credited.toFixed(2)}€ crédités (+${bonusPct}% bonus inclus)`,
        newBalance: Number(user.balance),
        username: user.username,
        firstName: user.firstName,
      };
    });
    safeNotify(() => {
      notify.rechargeCompleted({
        user: { id: req.userId!, username: result.username, firstName: result.firstName },
        method: "crypto",
        amount: credited,
        newBalance: result.newBalance,
      });
    });
    res.json(VerifyCryptoRechargeResponse.parse({
      success: result.success,
      message: result.message,
      newBalance: result.newBalance,
    }));
  } catch (err) {
    req.log.error({ err, txHash }, "crypto verify failed");
    // Detect unique-constraint violation (Postgres code 23505) on tx_hash —
    // means another request claimed this tx first.
    const code = (err as { code?: string; cause?: { code?: string } }).code
      ?? (err as { cause?: { code?: string } }).cause?.code;
    if (code === "23505") {
      res.json(VerifyCryptoRechargeResponse.parse({
        success: false, message: "Cette transaction a déjà été utilisée", newBalance: null,
      }));
      return;
    }
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false, message: "Erreur lors de la vérification", newBalance: null,
    }));
  }
});

export default router;
