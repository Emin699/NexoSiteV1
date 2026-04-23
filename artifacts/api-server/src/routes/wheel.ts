import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable, wheelSpinsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { SpinWheelResponse, GetWheelStatusResponse } from "@workspace/api-zod";

const router: IRouter = Router();

type WheelReward = {
  type: string;
  label: string;
  value: number | null;
  probability: number;
};

const WHEEL_REWARDS: WheelReward[] = [
  { type: "nothing", label: "Rien", value: null, probability: 0.602 },
  { type: "balance", label: "+0.50€", value: 0.5, probability: 0.12 },
  { type: "balance", label: "+1.00€", value: 1.0, probability: 0.08 },
  { type: "balance", label: "+5.00€", value: 5.0, probability: 0.04 },
  { type: "coupon_percent", label: "Coupon -5%", value: 5, probability: 0.05 },
  { type: "coupon_amount", label: "Coupon -3€", value: 3, probability: 0.035 },
  { type: "free_spin", label: "Relance gratuite", value: null, probability: 0.03 },
  { type: "points", label: "+10 points", value: 10, probability: 0.02 },
  { type: "points", label: "+50 points", value: 50, probability: 0.015 },
  { type: "deezer", label: "Lien Deezer Premium", value: null, probability: 0.005 },
  { type: "points", label: "+100 points", value: 100, probability: 0.003 },
  { type: "jackpot", label: "JACKPOT 20€", value: 20, probability: 0 },
];

function spinWheel(): WheelReward {
  const rand = Math.random();
  let cumulative = 0;
  for (const reward of WHEEL_REWARDS) {
    cumulative += reward.probability;
    if (rand <= cumulative) {
      return reward;
    }
  }
  return WHEEL_REWARDS[0];
}

router.get("/wheel/status", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const now = new Date();
  const lastSpin = user.lastSpinAt;
  const hoursSinceLastSpin = lastSpin
    ? (now.getTime() - lastSpin.getTime()) / (1000 * 60 * 60)
    : 999;

  const canSpin = user.freeSpins > 0 || hoursSinceLastSpin >= 24;
  const nextSpinAt =
    !canSpin && lastSpin
      ? new Date(lastSpin.getTime() + 24 * 60 * 60 * 1000).toISOString()
      : null;
  const hoursUntilNextSpin =
    !canSpin && lastSpin ? Math.max(0, 24 - hoursSinceLastSpin) : null;

  res.json(
    GetWheelStatusResponse.parse({
      canSpin,
      freeSpins: user.freeSpins,
      nextSpinAt,
      hoursUntilNextSpin,
    })
  );
});

router.post("/wheel/spin", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const now = new Date();
  const lastSpin = user.lastSpinAt;
  const hoursSinceLastSpin = lastSpin
    ? (now.getTime() - lastSpin.getTime()) / (1000 * 60 * 60)
    : 999;

  const hasFreeSpins = user.freeSpins > 0;
  const canSpinByTime = hoursSinceLastSpin >= 24;

  if (!hasFreeSpins && !canSpinByTime) {
    res.status(400).json({ error: "Aucun tour disponible. Revenez dans 24h." });
    return;
  }

  const reward = spinWheel();

  let newBalance: number | null = null;
  let newPoints: number | null = null;

  const updates: Record<string, unknown> = {
    lastSpinAt: now,
  };

  if (hasFreeSpins) {
    updates.freeSpins = sql`${usersTable.freeSpins} - 1`;
  }

  if (reward.type === "balance" && reward.value) {
    const updatedBalance = Math.round((Number(user.balance) + reward.value) * 100) / 100;
    newBalance = updatedBalance;
    updates.balance = updatedBalance.toFixed(2);

    await db.insert(transactionsTable).values({
      userId: req.userId!,
      type: "credit",
      amount: reward.value.toFixed(2),
      description: `Roue du destin : ${reward.label}`,
    });
  } else if (reward.type === "points" && reward.value) {
    const updatedPoints = user.loyaltyPoints + reward.value;
    newPoints = updatedPoints;
    updates.loyaltyPoints = sql`${usersTable.loyaltyPoints} + ${reward.value}`;
  } else if (reward.type === "free_spin") {
    updates.freeSpins = sql`${usersTable.freeSpins} + 1`;
  }

  await db.update(usersTable).set(updates).where(eq(usersTable.id, req.userId!));

  await db.insert(wheelSpinsTable).values({
    userId: req.userId!,
    rewardType: reward.type,
    rewardValue: reward.value?.toString() ?? null,
  });

  res.json(
    SpinWheelResponse.parse({
      reward: reward.label,
      rewardType: reward.type,
      rewardValue: reward.value,
      message: reward.type === "nothing" ? "Pas de chance cette fois !" : `Félicitations ! ${reward.label}`,
      newBalance,
      newPoints,
    })
  );
});

export default router;
