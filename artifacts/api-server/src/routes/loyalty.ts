import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { ConvertPointsBody, ConvertPointsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const POINTS_PER_EUR = 20;

router.post("/loyalty/convert", requireAuth, async (req, res): Promise<void> => {
  const parsed = ConvertPointsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { points } = parsed.data;

  if (points % POINTS_PER_EUR !== 0) {
    res.status(400).json({ error: `Les points doivent être un multiple de ${POINTS_PER_EUR}` });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (user.loyaltyPoints < points) {
    res.status(400).json({ error: "Points insuffisants" });
    return;
  }

  const eurEarned = Math.round((points / POINTS_PER_EUR) * 100) / 100;
  const newBalance = Math.round((Number(user.balance) + eurEarned) * 100) / 100;
  const newPoints = user.loyaltyPoints - points;

  await db
    .update(usersTable)
    .set({
      loyaltyPoints: newPoints,
      balance: newBalance.toFixed(2),
    })
    .where(eq(usersTable.id, req.userId!));

  await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "credit",
    amount: eurEarned.toFixed(2),
    description: `Conversion ${points} points fidélité → ${eurEarned.toFixed(2)}€`,
  });

  res.json(
    ConvertPointsResponse.parse({
      success: true,
      pointsConverted: points,
      eurEarned,
      newBalance,
      newPoints,
    })
  );
});

export default router;
