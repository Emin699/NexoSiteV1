import { Router, type IRouter } from "express";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq, sql, and, gte } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { notify, safeNotify } from "../lib/notifier";
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

  const eurEarned = Math.round((points / POINTS_PER_EUR) * 100) / 100;

  try {
    const result = await db.transaction(async (tx) => {
      // Conditional update: only succeeds if user has enough points (no race).
      const updated = await tx
        .update(usersTable)
        .set({
          loyaltyPoints: sql`${usersTable.loyaltyPoints} - ${points}`,
          balance: sql`${usersTable.balance} + ${eurEarned.toFixed(2)}`,
        })
        .where(and(
          eq(usersTable.id, req.userId!),
          gte(usersTable.loyaltyPoints, points),
        ))
        .returning();

      if (updated.length === 0) {
        const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        if (!u) throw Object.assign(new Error("User not found"), { status: 404 });
        throw Object.assign(new Error("Points insuffisants"), { status: 400 });
      }

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "credit",
        amount: eurEarned.toFixed(2),
        description: `Conversion ${points} points fidélité → ${eurEarned.toFixed(2)}€`,
      });

      return {
        newBalance: Number(updated[0].balance),
        newPoints: updated[0].loyaltyPoints,
        username: updated[0].username,
        firstName: updated[0].firstName,
      };
    });

    safeNotify(() => {
      notify.loyaltyConverted({
        user: { id: req.userId!, username: result.username, firstName: result.firstName },
        points,
        eur: eurEarned,
      });
    });

    res.json(
      ConvertPointsResponse.parse({
        success: true,
        pointsConverted: points,
        eurEarned,
        newBalance: result.newBalance,
        newPoints: result.newPoints,
      })
    );
  } catch (err) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.status ? e.message : "Erreur lors de la conversion" });
  }
});

export default router;
