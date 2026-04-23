import { Router, type IRouter } from "express";
import { db, reviewsTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { z } from "zod";

const router: IRouter = Router();

const ReviewSchema = z.object({
  productId: z.number().int().positive(),
  orderId: z.number().int().positive().nullable().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).default(""),
});

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Note invalide (1-5) et commentaire requis." });
    return;
  }

  const { productId, orderId, rating, comment } = parsed.data;
  const userId = req.userId!;

  const existingReview = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(and(eq(reviewsTable.userId, userId), eq(reviewsTable.productId, productId)));

  if (existingReview.length > 0) {
    res.status(400).json({ error: "Vous avez déjà laissé un avis pour ce produit." });
    return;
  }

  const [review] = await db
    .insert(reviewsTable)
    .values({
      userId,
      productId,
      orderId: orderId ?? null,
      rating,
      comment,
    })
    .returning();

  await db
    .update(usersTable)
    .set({ freeSpins: sql`${usersTable.freeSpins} + 1` })
    .where(eq(usersTable.id, userId));

  res.status(201).json({
    id: review.id,
    message: "Avis enregistré ! Vous avez reçu un tour de roue bonus.",
    bonusSpin: true,
  });
});

router.get("/reviews/product/:productId", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid product ID" }); return; }

  const reviews = await db
    .select({
      id: reviewsTable.id,
      userId: reviewsTable.userId,
      firstName: usersTable.firstName,
      productId: reviewsTable.productId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      createdAt: reviewsTable.createdAt,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.productId, productId))
    .orderBy(sql`${reviewsTable.createdAt} DESC`)
    .limit(20);

  res.json(
    reviews.map((r) => ({
      ...r,
      firstName: r.firstName ?? "Utilisateur",
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

export default router;
