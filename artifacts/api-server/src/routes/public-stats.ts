import { Router, type IRouter } from "express";
import { db, usersTable, ordersTable, reviewsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

/**
 * Public homepage stats — exposed unauthenticated.
 * Returns aggregate counts only (no PII), safe for the public hero.
 */
router.get("/public/stats", async (_req, res): Promise<void> => {
  const [[users], [orders], [reviews]] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ c: sql<number>`count(*)::int` }).from(ordersTable),
    db.select({
      c: sql<number>`count(*)::int`,
      avg: sql<number>`coalesce(avg(${reviewsTable.rating}), 0)::float`,
    }).from(reviewsTable),
  ]);

  res.json({
    totalUsers: Number(users?.c ?? 0),
    totalOrders: Number(orders?.c ?? 0),
    totalReviews: Number(reviews?.c ?? 0),
    averageRating: Math.round(Number(reviews?.avg ?? 0) * 100) / 100,
  });
});

export default router;
