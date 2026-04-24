import { Router, type IRouter } from "express";
import {
  db,
  productsTable,
  productVariantsTable,
  stockItemsTable,
} from "@workspace/db";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middlewares/userAuth.js";

const router: IRouter = Router();

router.use("/admin/products/:id/variants", requireAuth, requireAdmin);

const VariantInputSchema = z.object({
  name: z.string().min(1).max(120),
  durationDays: z.number().int().positive().nullable().optional(),
  price: z.coerce.number().positive(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.coerce.boolean().default(true),
});

const BulkStockSchema = z.object({
  codes: z.array(z.string().min(1).max(10000)).min(1).max(5000),
});

async function variantWithStockCount(variantId: number) {
  const [v] = await db
    .select()
    .from(productVariantsTable)
    .where(eq(productVariantsTable.id, variantId));
  if (!v) return null;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockItemsTable)
    .where(and(eq(stockItemsTable.variantId, v.id), eq(stockItemsTable.status, "available")));
  return {
    id: v.id,
    productId: v.productId,
    name: v.name,
    durationDays: v.durationDays,
    price: Number(v.price),
    sortOrder: v.sortOrder,
    isActive: v.isActive,
    stockCount: Number(count) || 0,
  };
}

async function ensureProduct(productId: number): Promise<boolean> {
  const [p] = await db.select({ id: productsTable.id }).from(productsTable).where(eq(productsTable.id, productId));
  return Boolean(p);
}

async function ensureVariantInProduct(productId: number, variantId: number): Promise<boolean> {
  const [v] = await db
    .select({ id: productVariantsTable.id })
    .from(productVariantsTable)
    .where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId)));
  return Boolean(v);
}

router.get("/admin/products/:id/variants", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid product ID" }); return; }
  if (!(await ensureProduct(productId))) { res.status(404).json({ error: "Product not found" }); return; }

  const variants = await db
    .select()
    .from(productVariantsTable)
    .where(eq(productVariantsTable.productId, productId))
    .orderBy(asc(productVariantsTable.sortOrder), asc(productVariantsTable.id));

  // Stock counts in one query
  const counts = await db
    .select({
      variantId: stockItemsTable.variantId,
      count: sql<number>`count(*)::int`,
    })
    .from(stockItemsTable)
    .where(eq(stockItemsTable.status, "available"))
    .groupBy(stockItemsTable.variantId);
  const byVariant = new Map(counts.map((c) => [c.variantId, Number(c.count) || 0]));

  res.json(
    variants.map((v) => ({
      id: v.id,
      productId: v.productId,
      name: v.name,
      durationDays: v.durationDays,
      price: Number(v.price),
      sortOrder: v.sortOrder,
      isActive: v.isActive,
      stockCount: byVariant.get(v.id) ?? 0,
    })),
  );
});

router.post("/admin/products/:id/variants", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id, 10);
  if (isNaN(productId)) { res.status(400).json({ error: "Invalid product ID" }); return; }
  if (!(await ensureProduct(productId))) { res.status(404).json({ error: "Product not found" }); return; }

  const parsed = VariantInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, durationDays, price, sortOrder, isActive } = parsed.data;

  const [variant] = await db
    .insert(productVariantsTable)
    .values({
      productId,
      name,
      durationDays: durationDays ?? null,
      price: price.toFixed(2),
      sortOrder,
      isActive,
    })
    .returning();

  res.status(201).json({
    id: variant.id,
    productId: variant.productId,
    name: variant.name,
    durationDays: variant.durationDays,
    price: Number(variant.price),
    sortOrder: variant.sortOrder,
    isActive: variant.isActive,
    stockCount: 0,
  });
});

router.patch("/admin/products/:id/variants/:variantId", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id, 10);
  const variantId = parseInt(req.params.variantId, 10);
  if (isNaN(productId) || isNaN(variantId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = VariantInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { name, durationDays, price, sortOrder, isActive } = parsed.data;

  const [updated] = await db
    .update(productVariantsTable)
    .set({
      name,
      durationDays: durationDays ?? null,
      price: price.toFixed(2),
      sortOrder,
      isActive,
    })
    .where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Variant not found" }); return; }
  const enriched = await variantWithStockCount(updated.id);
  res.json(enriched);
});

router.delete("/admin/products/:id/variants/:variantId", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id, 10);
  const variantId = parseInt(req.params.variantId, 10);
  if (isNaN(productId) || isNaN(variantId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  // Verify ownership FIRST to avoid cross-product destructive operations
  if (!(await ensureVariantInProduct(productId, variantId))) {
    res.status(404).json({ error: "Variant not found" });
    return;
  }

  // Cascade in transaction
  await db.transaction(async (tx) => {
    await tx.delete(stockItemsTable).where(eq(stockItemsTable.variantId, variantId));
    await tx
      .delete(productVariantsTable)
      .where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId)));
  });

  res.status(204).send();
});

router.get("/admin/products/:id/variants/:variantId/stock", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id, 10);
  const variantId = parseInt(req.params.variantId, 10);
  if (isNaN(productId) || isNaN(variantId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  if (!(await ensureVariantInProduct(productId, variantId))) {
    res.status(404).json({ error: "Variant not found" });
    return;
  }

  const items = await db
    .select()
    .from(stockItemsTable)
    .where(eq(stockItemsTable.variantId, variantId))
    .orderBy(desc(stockItemsTable.id));

  res.json(
    items.map((i) => ({
      id: i.id,
      variantId: i.variantId,
      content: i.content,
      status: i.status,
      soldOrderId: i.soldOrderId,
      soldAt: i.soldAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
    })),
  );
});

router.post("/admin/products/:id/variants/:variantId/stock", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id, 10);
  const variantId = parseInt(req.params.variantId, 10);
  if (isNaN(productId) || isNaN(variantId)) { res.status(400).json({ error: "Invalid IDs" }); return; }

  const parsed = BulkStockSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  if (!(await ensureVariantInProduct(productId, variantId))) {
    res.status(404).json({ error: "Variant not found" });
    return;
  }

  // Dedupe within payload + filter empty
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of parsed.data.codes) {
    const c = raw.trim();
    if (c.length === 0 || seen.has(c)) continue;
    seen.add(c);
    cleaned.push(c);
  }

  if (cleaned.length === 0) {
    res.status(400).json({ error: "Aucun code valide à ajouter" });
    return;
  }

  // Insert with ON CONFLICT DO NOTHING on (variant_id, content) — skip duplicates already in DB
  const inserted = await db
    .insert(stockItemsTable)
    .values(
      cleaned.map((content) => ({
        variantId,
        content,
        status: "available" as const,
      })),
    )
    .onConflictDoNothing({ target: [stockItemsTable.variantId, stockItemsTable.content] })
    .returning({ id: stockItemsTable.id });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stockItemsTable)
    .where(and(eq(stockItemsTable.variantId, variantId), eq(stockItemsTable.status, "available")));

  const added = inserted.length;
  const skipped = cleaned.length - added;
  res.json({ added, skipped, available: Number(count) || 0 });
});

router.delete("/admin/products/:id/variants/:variantId/stock/:stockId", async (req, res): Promise<void> => {
  const productId = parseInt(req.params.id, 10);
  const variantId = parseInt(req.params.variantId, 10);
  const stockId = parseInt(req.params.stockId, 10);
  if (isNaN(productId) || isNaN(variantId) || isNaN(stockId)) {
    res.status(400).json({ error: "Invalid IDs" });
    return;
  }

  if (!(await ensureVariantInProduct(productId, variantId))) {
    res.status(404).json({ error: "Variant not found" });
    return;
  }

  const [item] = await db
    .select()
    .from(stockItemsTable)
    .where(and(eq(stockItemsTable.id, stockId), eq(stockItemsTable.variantId, variantId)));

  if (!item) { res.status(404).json({ error: "Stock item not found" }); return; }
  if (item.status !== "available") {
    res.status(409).json({ error: "Impossible de supprimer un stock déjà vendu" });
    return;
  }

  await db.delete(stockItemsTable).where(eq(stockItemsTable.id, stockId));
  res.status(204).send();
});

export default router;
