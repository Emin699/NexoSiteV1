import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import {
  GetMeResponse,
  GetMeStatsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// NOTE: legacy POST /users/register removed (2026-04). It allowed creating
// unauthenticated ghost accounts with just a firstName, exposing the table to
// abusive bulk-creation. The real signup flow lives in /auth/register and goes
// through email verification.

router.get("/users/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json(
    GetMeResponse.parse({
      ...user,
      telegramId: user.telegramId,
      username: user.username,
      firstName: user.firstName,
      balance: Number(user.balance),
      totalRecharged: Number(user.totalRecharged),
      isAdmin: user.isAdmin === 1,
      createdAt: user.createdAt.toISOString(),
    })
  );
});

router.get("/users/me/stats", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const txResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, req.userId!));

  const spentResult = await db
    .select({ total: sql<number>`coalesce(sum(amount), 0)` })
    .from(transactionsTable)
    .where(
      sql`user_id = ${req.userId!} AND type = 'debit'`
    );

  const totalRecharged = Number(user.totalRecharged);
  const TIERS = [10, 30, 60, 100, 200, 350, 500];
  let currentTier = 0;
  let nextTierAt: number | null = null;

  for (let i = 0; i < TIERS.length; i++) {
    if (totalRecharged >= TIERS[i]) {
      currentTier = i + 1;
    } else {
      nextTierAt = TIERS[i];
      break;
    }
  }

  res.json(
    GetMeStatsResponse.parse({
      purchaseCount: user.purchaseCount,
      loyaltyPoints: user.loyaltyPoints,
      totalSpent: Number(spentResult[0]?.total ?? 0),
      transactionCount: Number(txResult[0]?.count ?? 0),
      totalRecharged,
      currentTier,
      nextTierAt,
    })
  );
});

export default router;
