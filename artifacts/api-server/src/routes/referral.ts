import { Router, type IRouter } from "express";
import { db, usersTable, referralsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { GetReferralResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const BOT_URL = "https://nexoshop.replit.app";
const REFERRAL_REWARD = 5;
const REFERRAL_CAP = 80;

router.get("/referral", requireAuth, async (req, res): Promise<void> => {
  const referrals = await db
    .select({
      id: referralsTable.id,
      referredId: referralsTable.referredId,
      eligible: referralsTable.eligible,
      paid: referralsTable.paid,
      createdAt: referralsTable.createdAt,
    })
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, req.userId!));

  const totalEarned = referrals.filter((r) => r.paid).length * REFERRAL_REWARD;
  const remainingCap = Math.max(0, REFERRAL_CAP - totalEarned);

  const referralUsers = await Promise.all(
    referrals.map(async (r) => {
      const [u] = await db
        .select({ firstName: usersTable.firstName, username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.id, r.referredId));
      return {
        id: r.id,
        referredName: u?.username ? `@${u.username}` : u?.firstName ?? "Utilisateur",
        eligible: r.eligible,
        paid: r.paid,
        createdAt: r.createdAt.toISOString(),
      };
    })
  );

  res.json(
    GetReferralResponse.parse({
      referralLink: `${BOT_URL}?ref=${req.userId}`,
      totalEarned,
      remainingCap,
      referrals: referralUsers,
    })
  );
});

export default router;
