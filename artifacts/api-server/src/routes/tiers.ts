import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { GetTiersResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const TIERS = [
  { level: 1, name: "Bronze", requiredAmount: 10, reward: "+1 tour de roue gratuit" },
  { level: 2, name: "Argent", requiredAmount: 30, reward: "1 lien Deezer offert" },
  { level: 3, name: "Or", requiredAmount: 60, reward: "Coupon 10€ + 2 tours de roue" },
  { level: 4, name: "Platine", requiredAmount: 100, reward: "Coupon -30% + 5 tours de roue" },
  { level: 5, name: "Diamant", requiredAmount: 200, reward: "Coupon 20€ + 10 tours de roue" },
  { level: 6, name: "Maître", requiredAmount: 350, reward: "Coupon -50% + 20 tours de roue" },
  { level: 7, name: "Légende", requiredAmount: 500, reward: "1 an d'IPTV offert" },
];

router.get("/tiers", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select({ totalRecharged: usersTable.totalRecharged })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const totalRecharged = Number(user.totalRecharged);
  let currentTier = 0;
  let nextTierAt: number | null = null;
  let currentTierName = "Débutant";

  for (let i = 0; i < TIERS.length; i++) {
    if (totalRecharged >= TIERS[i].requiredAmount) {
      currentTier = TIERS[i].level;
      currentTierName = TIERS[i].name;
    } else {
      nextTierAt = TIERS[i].requiredAmount;
      break;
    }
  }

  const prevTierAmount = currentTier > 0 ? TIERS[currentTier - 1].requiredAmount : 0;
  const range = nextTierAt ? nextTierAt - prevTierAmount : 1;
  const progress = nextTierAt
    ? Math.min(100, ((totalRecharged - prevTierAmount) / range) * 100)
    : 100;

  res.json(
    GetTiersResponse.parse({
      currentTier,
      currentTierName,
      totalRecharged,
      nextTierAt,
      progress: Math.round(progress),
      tiers: TIERS.map((t) => ({
        level: t.level,
        name: t.name,
        requiredAmount: t.requiredAmount,
        reward: t.reward,
        unlocked: totalRecharged >= t.requiredAmount,
      })),
    })
  );
});

export default router;
