import { Router, type IRouter } from "express";
import { db, usersTable, referralsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { GetReferralResponse } from "@workspace/api-zod";
import { REFERRAL_REWARD_EUR, REFERRAL_CAP_EUR } from "../lib/referral-config";

const router: IRouter = Router();

function buildReferralLink(req: { protocol: string; get: (h: string) => string | undefined }, userId: number): string {
  const envBase = process.env["PUBLIC_URL"]?.replace(/\/+$/, "");
  const base = envBase && envBase.length > 0
    ? envBase
    : `${req.protocol}://${req.get("host") ?? "localhost"}`;
  return `${base}/?ref=${userId}`;
}

router.get("/referral", requireAuth, async (req, res): Promise<void> => {
  const userId = req.userId!;

  const referrals = await db
    .select({
      id: referralsTable.id,
      referredId: referralsTable.referredId,
      eligible: referralsTable.eligible,
      paid: referralsTable.paid,
      createdAt: referralsTable.createdAt,
    })
    .from(referralsTable)
    .where(eq(referralsTable.referrerId, userId));

  const totalEarned = referrals.filter((r) => r.paid).length * REFERRAL_REWARD_EUR;
  const remainingCap = Math.max(0, REFERRAL_CAP_EUR - totalEarned);

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
      referralLink: buildReferralLink(req, userId),
      referralCode: String(userId),
      totalEarned,
      remainingCap,
      rewardPerReferral: REFERRAL_REWARD_EUR,
      cap: REFERRAL_CAP_EUR,
      referrals: referralUsers,
    })
  );
});

export default router;
