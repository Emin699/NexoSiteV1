import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
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

const AdminProductSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().default(""),
  price: z.coerce.number().positive(),
  deliveryType: z.enum(["auto", "manual"]).default("manual"),
  inStock: z.coerce.boolean().default(true),
  imageUrl: z.string().nullable().optional(),
});

function mapProduct(p: typeof productsTable.$inferSelect) {
  return { ...p, price: Number(p.price) };
}

router.get("/admin/products", async (_req, res): Promise<void> => {
  const products = await db.select().from(productsTable).orderBy(productsTable.id);
  res.json(products.map(mapProduct));
});

router.post("/admin/products", async (req, res): Promise<void> => {
  const parsed = AdminProductSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, category, description, price, deliveryType, inStock, imageUrl } = parsed.data;
  const [product] = await db
    .insert(productsTable)
    .values({
      name,
      category,
      description,
      price: price.toFixed(2),
      deliveryType,
      inStock,
      imageUrl: imageUrl ?? null,
      emoji: "🛍️",
    })
    .returning();
  res.status(201).json(mapProduct(product));
});

router.put("/admin/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }

  const parsed = AdminProductSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { name, category, description, price, deliveryType, inStock, imageUrl } = parsed.data;
  const [product] = await db
    .update(productsTable)
    .set({ name, category, description, price: price.toFixed(2), deliveryType, inStock, imageUrl: imageUrl ?? null })
    .where(eq(productsTable.id, id))
    .returning();

  if (!product) { res.status(404).json({ error: "Product not found" }); return; }
  res.json(mapProduct(product));
});

router.delete("/admin/products/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid ID" }); return; }
  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.status(204).send();
});

router.post("/admin/upload", upload.single("file"), (req, res): void => {
  if (!req.file) { res.status(400).json({ error: "No file uploaded" }); return; }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url });
});

export default router;
