import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middlewares/userAuth.js";

const router: IRouter = Router();

router.use("/admin/categories", requireAuth, requireAdmin);

const InputSchema = z.object({
  name: z.string().min(1).max(50),
  icon: z.string().min(1).max(50).optional().default("LayoutGrid"),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

router.get("/admin/categories", async (_req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(categoriesTable)
    .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.id));
  res.json(rows);
});

router.post("/admin/categories", async (req, res): Promise<void> => {
  const parsed = InputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.format() });
    return;
  }
  const { name, icon, sortOrder } = parsed.data;
  const slug = slugify(name);
  if (!slug) {
    res.status(400).json({ error: "Nom invalide" });
    return;
  }
  try {
    const [created] = await db
      .insert(categoriesTable)
      .values({ name: name.trim(), slug, icon, sortOrder })
      .returning();
    res.status(201).json(created);
  } catch {
    res.status(409).json({ error: "Catégorie déjà existante" });
  }
});

router.patch("/admin/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const parsed = InputSchema.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Invalid body" }); return; }
  const data = parsed.data;
  const updates: Record<string, unknown> = {};
  if (data.name) {
    updates.name = data.name.trim();
    updates.slug = slugify(data.name);
  }
  if (data.icon !== undefined) updates.icon = data.icon;
  if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
  if (Object.keys(updates).length === 0) { res.status(400).json({ error: "Empty update" }); return; }

  try {
    const updated = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(categoriesTable)
        .where(eq(categoriesTable.id, id));
      if (!existing) {
        throw Object.assign(new Error("Not found"), { status: 404 });
      }
      const [row] = await tx
        .update(categoriesTable)
        .set(updates)
        .where(eq(categoriesTable.id, id))
        .returning();
      if (data.name && data.name.trim() !== existing.name) {
        await tx
          .update(productsTable)
          .set({ category: data.name.trim() })
          .where(eq(productsTable.category, existing.name));
      }
      return row;
    });
    res.json(updated);
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string };
    if (err.status === 404) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.status(409).json({ error: "Conflit de nom" });
  }
});

router.delete("/admin/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [existing] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
  if (!existing) { res.status(404).json({ error: "Not found" }); return; }

  // Empêcher suppression si produits liés
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.category, existing.name));
  const n = Number(count) || 0;
  if (n > 0) {
    res.status(409).json({ error: `Cette catégorie est utilisée par ${n} produit(s).` });
    return;
  }
  await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
  res.status(204).send();
});

export default router;
