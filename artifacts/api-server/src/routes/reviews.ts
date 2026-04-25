import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, reviewsTable, usersTable, productsTable, ordersTable } from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { z } from "zod";

const router: IRouter = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `review-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

router.post("/reviews/upload", requireAuth, upload.single("file"), (req, res): void => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  res.status(201).json({ url: `/api/uploads/${req.file.filename}` });
});

const ReviewSchema = z.object({
  productId: z.number().int().positive(),
  orderId: z.number().int().positive().nullable().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10, "Le commentaire doit contenir au moins 10 caractères.").max(500),
  imageUrl: z.string().nullable().optional(),
});

const AUTO_REVIEW_GRACE_MS = 24 * 60 * 60 * 1000;
const AUTO_REVIEW_MESSAGES = [
  "Tout s'est bien passé, je recommande !",
  "Service rapide et conforme à la description.",
  "Bonne expérience, livraison sans souci.",
  "Produit reçu sans problème, merci !",
  "Commande conforme, à recommander.",
];
let lastAutoSweepAt = 0;
const AUTO_SWEEP_INTERVAL_MS = 60_000;

async function maybeRunAutoReviewSweep(): Promise<void> {
  const now = Date.now();
  if (now - lastAutoSweepAt < AUTO_SWEEP_INTERVAL_MS) return;
  lastAutoSweepAt = now;
  try {
    const cutoff = new Date(now - AUTO_REVIEW_GRACE_MS);
    // Trouve les commandes livrées >= 24h sans review existante (par couple userId+productId)
    const candidates = await db.execute<{
      user_id: number;
      product_id: number;
      order_id: number;
    }>(sql`
      SELECT DISTINCT o.user_id, o.product_id, MIN(o.id) AS order_id
      FROM ${ordersTable} o
      LEFT JOIN ${reviewsTable} r
        ON r.user_id = o.user_id AND r.product_id = o.product_id
      WHERE o.status = 'delivered'
        AND o.delivered_at IS NOT NULL
        AND o.delivered_at <= ${cutoff.toISOString()}
        AND r.id IS NULL
      GROUP BY o.user_id, o.product_id
      LIMIT 50
    `);
    const rows = (candidates as unknown as { rows?: Array<{ user_id: number; product_id: number; order_id: number }> }).rows
      ?? (candidates as unknown as Array<{ user_id: number; product_id: number; order_id: number }>);
    if (!rows || rows.length === 0) return;
    for (const row of rows) {
      const msg = AUTO_REVIEW_MESSAGES[Math.floor(Math.random() * AUTO_REVIEW_MESSAGES.length)];
      try {
        await db
          .insert(reviewsTable)
          .values({
            userId: row.user_id,
            productId: row.product_id,
            orderId: row.order_id,
            rating: 5,
            comment: msg,
            imageUrl: null,
            isAuto: true,
          })
          .onConflictDoNothing({ target: [reviewsTable.userId, reviewsTable.productId] });
      } catch {
        // ignore (e.g. concurrent unique conflict on retries)
      }
    }
  } catch (e) {
    console.warn("[auto-review-sweep] failed:", e);
  }
}

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    const first = parsed.error.issues?.[0]?.message ?? "Note invalide ou commentaire trop court (minimum 10 caractères).";
    res.status(400).json({ error: first });
    return;
  }

  const { productId, orderId, rating, comment, imageUrl } = parsed.data;
  const userId = req.userId!;

  // Éligibilité : l'utilisateur doit avoir au moins une commande LIVRÉE pour ce produit.
  const eligible = await db
    .select({ id: ordersTable.id })
    .from(ordersTable)
    .where(
      and(
        eq(ordersTable.userId, userId),
        eq(ordersTable.productId, productId),
        eq(ordersTable.status, "delivered"),
      ),
    )
    .limit(1);

  if (eligible.length === 0) {
    res.status(403).json({
      error: "Vous ne pouvez laisser un avis que pour un produit que vous avez reçu.",
    });
    return;
  }

  // Insertion idempotente grâce à l'index unique (user_id, product_id) — pas de race possible.
  const inserted = await db
    .insert(reviewsTable)
    .values({
      userId,
      productId,
      orderId: orderId ?? null,
      rating,
      comment,
      imageUrl: imageUrl ?? null,
      isAuto: false,
    })
    .onConflictDoNothing({ target: [reviewsTable.userId, reviewsTable.productId] })
    .returning();

  if (inserted.length === 0) {
    res.status(400).json({ error: "Vous avez déjà laissé un avis pour ce produit." });
    return;
  }

  await db
    .update(usersTable)
    .set({ freeSpins: sql`${usersTable.freeSpins} + 1` })
    .where(eq(usersTable.id, userId));

  res.status(201).json({
    id: inserted[0].id,
    message: "Avis enregistré ! Vous avez reçu un tour de roue bonus.",
    bonusSpin: true,
  });
});

router.get("/reviews/me", requireAuth, async (req, res): Promise<void> => {
  // Run auto-review sweep en arrière-plan (rate-limited)
  void maybeRunAutoReviewSweep();
  const rows = await db
    .select({
      productId: reviewsTable.productId,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      isAuto: reviewsTable.isAuto,
      createdAt: reviewsTable.createdAt,
    })
    .from(reviewsTable)
    .where(eq(reviewsTable.userId, req.userId!))
    .orderBy(desc(reviewsTable.createdAt));

  res.json(rows.map((r) => ({
    productId: r.productId,
    rating: r.rating,
    comment: r.comment,
    isAuto: r.isAuto,
    createdAt: r.createdAt.toISOString(),
  })));
});

router.get("/reviews", async (_req, res): Promise<void> => {
  void maybeRunAutoReviewSweep();
  const items = await db
    .select({
      id: reviewsTable.id,
      userId: reviewsTable.userId,
      firstName: usersTable.firstName,
      productId: reviewsTable.productId,
      productName: productsTable.name,
      rating: reviewsTable.rating,
      comment: reviewsTable.comment,
      imageUrl: reviewsTable.imageUrl,
      createdAt: reviewsTable.createdAt,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(reviewsTable.productId, productsTable.id))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(200);

  const total = items.length;
  const average = total > 0 ? items.reduce((s, r) => s + r.rating, 0) / total : 0;

  res.json({
    total,
    average: Math.round(average * 100) / 100,
    items: items.map((r) => ({
      id: r.id,
      userId: r.userId,
      firstName: r.firstName ?? "Utilisateur",
      productId: r.productId,
      productName: r.productName ?? null,
      rating: r.rating,
      comment: r.comment,
      imageUrl: r.imageUrl ?? null,
      createdAt: r.createdAt.toISOString(),
    })),
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
      imageUrl: reviewsTable.imageUrl,
      createdAt: reviewsTable.createdAt,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.productId, productId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(20);

  res.json(
    reviews.map((r) => ({
      ...r,
      firstName: r.firstName ?? "Utilisateur",
      imageUrl: r.imageUrl ?? null,
      createdAt: r.createdAt.toISOString(),
    }))
  );
});

export default router;
