import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import {
  RegisterUserBody,
  GetMeResponse,
  GetMeStatsResponse,
  RegisterUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/users/register", async (req, res): Promise<void> => {
  const parsed = RegisterUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { firstName, username, referredBy } = parsed.data;

  const existing = req.userId
    ? await db.select().from(usersTable).where(eq(usersTable.id, req.userId))
    : [];

  if (existing.length > 0) {
    const user = existing[0];
    res.json(
      RegisterUserResponse.parse({
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
    return;
  }

  const [newUser] = await db
    .insert(usersTable)
    .values({
      firstName: firstName || "User",
      username: username ?? null,
      referredBy: referredBy ?? null,
    })
    .returning();

  res.json(
    RegisterUserResponse.parse({
      ...newUser,
      telegramId: newUser.telegramId,
      username: newUser.username,
      firstName: newUser.firstName,
      balance: Number(newUser.balance),
      totalRecharged: Number(newUser.totalRecharged),
      isAdmin: newUser.isAdmin === 1,
      createdAt: newUser.createdAt.toISOString(),
    })
  );
});

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
