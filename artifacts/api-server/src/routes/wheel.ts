import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable, wheelSpinsTable } from "@workspace/db";
import { eq, sql, and, or, gt, lt, isNull } from "drizzle-orm";
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
  const now = new Date();
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const reward = spinWheel();

  try {
    const result = await db.transaction(async (tx) => {
      // Atomic spin claim: only succeeds if user is eligible AT update time.
      // Eligibility = freeSpins > 0  OR  lastSpinAt < now-24h  OR  lastSpinAt IS NULL.
      // If they have free spins we decrement, otherwise we set lastSpinAt = now.
      // We do this in two separate conditional updates so we know which path was taken.
      const usedFreeSpin = await tx
        .update(usersTable)
        .set({ freeSpins: sql`${usersTable.freeSpins} - 1`, lastSpinAt: now })
        .where(and(
          eq(usersTable.id, req.userId!),
          gt(usersTable.freeSpins, 0),
        ))
        .returning();

      let userRow = usedFreeSpin[0] ?? null;
      if (!userRow) {
        const usedDaily = await tx
          .update(usersTable)
          .set({ lastSpinAt: now })
          .where(and(
            eq(usersTable.id, req.userId!),
            or(isNull(usersTable.lastSpinAt), lt(usersTable.lastSpinAt, cutoff)),
          ))
          .returning();
        userRow = usedDaily[0] ?? null;
      }

      if (!userRow) {
        // Either user missing or not eligible.
        const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        if (!u) throw Object.assign(new Error("User not found"), { status: 404 });
        throw Object.assign(new Error("Aucun tour disponible. Revenez dans 24h."), { status: 400 });
      }

      let newBalance: number | null = null;
      let newPoints: number | null = null;

      if (reward.type === "balance" && reward.value) {
        const [bumped] = await tx
          .update(usersTable)
          .set({ balance: sql`${usersTable.balance} + ${reward.value.toFixed(2)}` })
          .where(eq(usersTable.id, req.userId!))
          .returning();
        newBalance = Number(bumped.balance);
        await tx.insert(transactionsTable).values({
          userId: req.userId!,
          type: "credit",
          amount: reward.value.toFixed(2),
          description: `Roue du destin : ${reward.label}`,
        });
      } else if (reward.type === "points" && reward.value) {
        const [bumped] = await tx
          .update(usersTable)
          .set({ loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${reward.value}` })
          .where(eq(usersTable.id, req.userId!))
          .returning();
        newPoints = bumped.loyaltyPoints;
      } else if (reward.type === "free_spin") {
        await tx
          .update(usersTable)
          .set({ freeSpins: sql`${usersTable.freeSpins} + 1` })
          .where(eq(usersTable.id, req.userId!));
      }

      await tx.insert(wheelSpinsTable).values({
        userId: req.userId!,
        rewardType: reward.type,
        rewardValue: reward.value?.toString() ?? null,
      });

      return { newBalance, newPoints };
    });

    res.json(
      SpinWheelResponse.parse({
        reward: reward.label,
        rewardType: reward.type,
        rewardValue: reward.value,
        message: reward.type === "nothing" ? "Pas de chance cette fois !" : `Félicitations ! ${reward.label}`,
        newBalance: result.newBalance,
        newPoints: result.newPoints,
      })
    );
  } catch (err) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.status ? e.message : "Erreur lors du tirage" });
  }
});

export default router;
