import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable, cryptoRechargesTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { verifyLitecoinTx } from "../lib/ltc-verify";
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

const LTC_WALLET_ADDRESS = process.env["LTC_WALLET_ADDRESS"] || "ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

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
  const parsed = InitiateCryptoRechargeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { amountEur } = parsed.data;

  if (amountEur < 5) {
    res.status(400).json({ error: "Montant minimum : 5€" });
    return;
  }
  if (amountEur > 5000) {
    res.status(400).json({ error: "Montant maximum : 5000€" });
    return;
  }

  let exchangeRate = 0;
  try {
    const response = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=litecoin&vs_currencies=eur"
    );
    const data = (await response.json()) as { litecoin?: { eur?: number } };
    exchangeRate = data?.litecoin?.eur ?? 80;
  } catch {
    exchangeRate = 80;
  }

  const amountWithFees = amountEur * 1.02;
  const amountLtc = Math.round((amountWithFees / exchangeRate) * 1e8) / 1e8;

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const [recharge] = await db
    .insert(cryptoRechargesTable)
    .values({
      userId: req.userId!,
      provider: "ltc",
      amountEur: amountEur.toFixed(2),
      amountLtc: amountLtc.toFixed(8),
      address: LTC_WALLET_ADDRESS,
      status: "pending",
      expiresAt,
    })
    .returning();

  res.json(
    InitiateCryptoRechargeResponse.parse({
      sessionId: recharge.id,
      address: LTC_WALLET_ADDRESS,
      amountLtc,
      amountEur,
      exchangeRate,
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

  const credited = Number(pending.amountEur);
  if (Math.abs(credited - amountEur) > 0.01) {
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false, message: "Le montant ne correspond pas à la session", newBalance: null,
    }));
    return;
  }

  // 2) On-chain verification — server fetches the tx and validates address+amount+confirmations.
  const expectedLtc = Number(pending.amountLtc);
  const verification = await verifyLitecoinTx(txHash, pending.address, 1);
  if (!verification.ok) {
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false, message: verification.reason, newBalance: null,
    }));
    return;
  }
  // Allow 1% under-payment tolerance for explorer rounding (but never less).
  if (verification.ltcReceived + 1e-8 < expectedLtc * 0.99) {
    res.json(VerifyCryptoRechargeResponse.parse({
      success: false,
      message: `Montant LTC reçu insuffisant (${verification.ltcReceived} / ${expectedLtc} LTC)`,
      newBalance: null,
    }));
    return;
  }

  // 3) Atomic credit — only the UPDATE that flips pending→verified actually grants funds.
  try {
    const result = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(cryptoRechargesTable)
        .set({ status: "verified", txHash, verifiedAt: new Date() })
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
        description: `Recharge Litecoin (${credited.toFixed(2)}€) — tx ${txHash.slice(0, 12)}…`,
      });

      return {
        success: true,
        message: `Recharge de ${credited.toFixed(2)}€ effectuée avec succès`,
        newBalance: Number(user.balance),
      };
    });
    res.json(VerifyCryptoRechargeResponse.parse(result));
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
