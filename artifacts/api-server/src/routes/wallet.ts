import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import {
  InitiateCryptoRechargeBody,
  VerifyCryptoRechargeBody,
  GetWalletResponse,
  GetTransactionsResponse,
  InitiateCryptoRechargeResponse,
  VerifyCryptoRechargeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const LTC_WALLET_ADDRESS = "ltc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh";

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

  res.json(
    InitiateCryptoRechargeResponse.parse({
      address: LTC_WALLET_ADDRESS,
      amountLtc,
      amountEur,
      exchangeRate,
      expiresAt: expiresAt.toISOString(),
    })
  );
});

router.post("/wallet/recharge/crypto/verify", requireAuth, async (req, res): Promise<void> => {
  const parsed = VerifyCryptoRechargeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { txHash, amountEur } = parsed.data;

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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const newBalance = Math.round((Number(user.balance) + amountEur) * 100) / 100;
  const newTotalRecharged = Math.round((Number(user.totalRecharged) + amountEur) * 100) / 100;

  await db
    .update(usersTable)
    .set({
      balance: newBalance.toFixed(2),
      totalRecharged: newTotalRecharged.toFixed(2),
    })
    .where(eq(usersTable.id, req.userId!));

  await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "credit",
    amount: amountEur.toFixed(2),
    description: `Recharge Litecoin (${amountEur.toFixed(2)}€)`,
  });

  res.json(
    VerifyCryptoRechargeResponse.parse({
      success: true,
      message: `Recharge de ${amountEur.toFixed(2)}€ effectuée avec succès`,
      newBalance,
    })
  );
});

export default router;
