import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { GetJackpotResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/jackpot", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select({ jackpotTickets: usersTable.jackpotTickets })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const totalResult = await db
    .select({ total: sql<number>`coalesce(sum(jackpot_tickets), 0)` })
    .from(usersTable);

  const nextDraw = new Date();
  nextDraw.setDate(nextDraw.getDate() + ((7 - nextDraw.getDay() + 1) % 7 || 7));
  nextDraw.setHours(20, 0, 0, 0);

  res.json(
    GetJackpotResponse.parse({
      userTickets: user.jackpotTickets,
      totalTickets: Number(totalResult[0]?.total ?? 0),
      nextDrawDate: nextDraw.toISOString(),
      lastWinner: null,
    })
  );
});

export default router;
