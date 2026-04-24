import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, reviewsTable, usersTable, productsTable } from "@workspace/db";
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
  comment: z.string().max(500).default(""),
  imageUrl: z.string().nullable().optional(),
});

router.post("/reviews", requireAuth, async (req, res): Promise<void> => {
  const parsed = ReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Note invalide (1-5) et commentaire requis." });
    return;
  }

  const { productId, orderId, rating, comment, imageUrl } = parsed.data;
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
      imageUrl: imageUrl ?? null,
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

router.get("/reviews", async (_req, res): Promise<void> => {
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
