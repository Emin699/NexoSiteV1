import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable, cryptoRechargesTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import {
  InitiateCryptoRechargeBody,
  VerifyCryptoRechargeBody,
  GetWalletResponse,
  GetTransactionsResponse,
  InitiateCryptoRechargeResponse,
  VerifyCryptoRechargeResponse,
  GetPendingRechargesResponse,
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
    GetPendingRechargesResponse.parse(
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

  if (!txHash || txHash.length < 10) {
    res.json(
      VerifyCryptoRechargeResponse.parse({
        success: false,
        message: "Hash de transaction invalide",
        newBalance: null,
      })
    );
    return;
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Find pending recharge: prefer sessionId, fallback first matching pending of this user
      let pending: typeof cryptoRechargesTable.$inferSelect | null = null;
      if (sessionId) {
        const [r] = await tx
          .select()
          .from(cryptoRechargesTable)
          .where(and(
            eq(cryptoRechargesTable.id, sessionId),
            eq(cryptoRechargesTable.userId, req.userId!),
          ));
        pending = r ?? null;
      } else {
        const [r] = await tx
          .select()
          .from(cryptoRechargesTable)
          .where(and(
            eq(cryptoRechargesTable.userId, req.userId!),
            eq(cryptoRechargesTable.status, "pending"),
          ))
          .orderBy(desc(cryptoRechargesTable.createdAt))
          .limit(1);
        pending = r ?? null;
      }

      // Idempotence: if same tx hash already verified, return success without re-crediting
      const [alreadyDone] = await tx
        .select()
        .from(cryptoRechargesTable)
        .where(and(
          eq(cryptoRechargesTable.userId, req.userId!),
          eq(cryptoRechargesTable.txHash, txHash),
          eq(cryptoRechargesTable.status, "verified"),
        ));
      if (alreadyDone) {
        const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        return {
          success: true,
          message: "Recharge déjà confirmée précédemment",
          newBalance: u ? Number(u.balance) : null,
        };
      }

      if (!pending) {
        throw Object.assign(new Error("Aucune recharge en attente trouvée"), { status: 404 });
      }
      if (pending.status !== "pending") {
        throw Object.assign(new Error(`Recharge déjà ${pending.status === "verified" ? "validée" : pending.status}`), { status: 400 });
      }
      if (pending.expiresAt < new Date()) {
        await tx.update(cryptoRechargesTable).set({ status: "expired" }).where(eq(cryptoRechargesTable.id, pending.id));
        throw Object.assign(new Error("Session de recharge expirée. Recommence."), { status: 400 });
      }

      const credited = Number(pending.amountEur);
      // Sanity: amountEur from client must match (within 1 cent)
      if (Math.abs(credited - amountEur) > 0.01) {
        throw Object.assign(new Error("Le montant ne correspond pas à la session"), { status: 400 });
      }

      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, req.userId!));
      if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

      const newBalance = Math.round((Number(user.balance) + credited) * 100) / 100;
      const newTotalRecharged = Math.round((Number(user.totalRecharged) + credited) * 100) / 100;

      await tx
        .update(usersTable)
        .set({
          balance: newBalance.toFixed(2),
          totalRecharged: newTotalRecharged.toFixed(2),
        })
        .where(eq(usersTable.id, req.userId!));

      await tx
        .update(cryptoRechargesTable)
        .set({ status: "verified", txHash, verifiedAt: new Date() })
        .where(eq(cryptoRechargesTable.id, pending.id));

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "credit",
        amount: credited.toFixed(2),
        description: `Recharge Litecoin (${credited.toFixed(2)}€)`,
      });

      return {
        success: true,
        message: `Recharge de ${credited.toFixed(2)}€ effectuée avec succès`,
        newBalance,
      };
    });

    res.json(VerifyCryptoRechargeResponse.parse(result));
  } catch (err) {
    const e = err as { status?: number; message?: string };
    res.json(
      VerifyCryptoRechargeResponse.parse({
        success: false,
        message: e.message ?? "Erreur lors de la vérification",
        newBalance: null,
      })
    );
  }
});

export default router;
