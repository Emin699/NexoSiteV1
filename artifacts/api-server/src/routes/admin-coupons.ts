import { Router, type IRouter } from "express";
import { db, couponsTable, couponUsagesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/userAuth";
import { notify, safeNotify } from "../lib/notifier";
import { z } from "zod/v4";

async function getAdmin(userId: number | undefined): Promise<{ id: number; username: string | null; firstName: string | null }> {
  if (!userId) return { id: 0, username: null, firstName: "admin" };
  const [u] = await db
    .select({ id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName })
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  return u ?? { id: userId, username: null, firstName: "admin" };
}

const router: IRouter = Router();
router.use("/admin/coupons", requireAuth, requireAdmin);

const couponBodySchema = z.object({
  code: z.string().trim().toUpperCase().min(2).max(50),
  description: z.string().max(200).optional().nullable(),
  type: z.enum(["percent", "amount"]),
  value: z.number().positive(),
  maxUses: z.number().int().min(1).default(1),
  maxUsesPerUser: z.number().int().min(0).default(1),
  minOrderAmount: z.number().min(0).default(0),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  restrictedToUserId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().default(true),
}).refine(
  (d) => d.type !== "percent" || d.value <= 100,
  { message: "Le pourcentage ne peut pas dépasser 100", path: ["value"] },
).refine(
  (d) => !d.startsAt || !d.expiresAt || new Date(d.startsAt) <= new Date(d.expiresAt),
  { message: "La date de début doit précéder la date d'expiration", path: ["expiresAt"] },
);

const couponUpdateSchema = z.object({
  description: z.string().max(200).optional().nullable(),
  type: z.enum(["percent", "amount"]).optional(),
  value: z.number().positive().optional(),
  maxUses: z.number().int().min(1).optional(),
  maxUsesPerUser: z.number().int().min(0).optional(),
  minOrderAmount: z.number().min(0).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  restrictedToUserId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
}).refine(
  (d) => d.value === undefined || d.type === undefined || d.type !== "percent" || d.value <= 100,
  { message: "Le pourcentage ne peut pas dépasser 100", path: ["value"] },
).refine(
  (d) => !d.startsAt || !d.expiresAt || new Date(d.startsAt) <= new Date(d.expiresAt),
  { message: "La date de début doit précéder la date d'expiration", path: ["expiresAt"] },
);

router.get("/admin/coupons", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      code: couponsTable.code,
      description: couponsTable.description,
      type: couponsTable.type,
      value: couponsTable.value,
      maxUses: couponsTable.maxUses,
      currentUses: couponsTable.currentUses,
      maxUsesPerUser: couponsTable.maxUsesPerUser,
      minOrderAmount: couponsTable.minOrderAmount,
      startsAt: couponsTable.startsAt,
      expiresAt: couponsTable.expiresAt,
      restrictedToUserId: couponsTable.restrictedToUserId,
      isActive: couponsTable.isActive,
      createdAt: couponsTable.createdAt,
    })
    .from(couponsTable)
    .orderBy(desc(couponsTable.createdAt));

  res.json(
    rows.map((r) => ({
      code: r.code,
      description: r.description,
      type: r.type,
      value: Number(r.value),
      maxUses: r.maxUses,
      currentUses: r.currentUses,
      maxUsesPerUser: r.maxUsesPerUser,
      minOrderAmount: Number(r.minOrderAmount),
      startsAt: r.startsAt ? r.startsAt.toISOString() : null,
      expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
      restrictedToUserId: r.restrictedToUserId,
      isActive: r.isActive === 1,
      createdAt: r.createdAt.toISOString(),
    })),
  );
});

router.get("/admin/coupons/:code/usages", async (req, res): Promise<void> => {
  const code = String(req.params.code).toUpperCase();
  const rows = await db
    .select()
    .from(couponUsagesTable)
    .where(eq(couponUsagesTable.couponCode, code))
    .orderBy(desc(couponUsagesTable.usedAt))
    .limit(100);
  res.json(
    rows.map((r) => ({
      id: r.id,
      couponCode: r.couponCode,
      userId: r.userId,
      discountApplied: Number(r.discountApplied),
      usedAt: r.usedAt.toISOString(),
    })),
  );
});

router.post("/admin/coupons", async (req, res): Promise<void> => {
  const parsed = couponBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = parsed.data;
  const [existing] = await db.select().from(couponsTable).where(eq(couponsTable.code, data.code));
  if (existing) {
    res.status(409).json({ error: "Un coupon avec ce code existe déjà" });
    return;
  }
  await db.insert(couponsTable).values({
    code: data.code,
    description: data.description ?? null,
    type: data.type,
    value: data.value.toFixed(2),
    maxUses: data.maxUses,
    maxUsesPerUser: data.maxUsesPerUser,
    minOrderAmount: data.minOrderAmount.toFixed(2),
    startsAt: data.startsAt ? new Date(data.startsAt) : null,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    restrictedToUserId: data.restrictedToUserId ?? null,
    isActive: data.isActive ? 1 : 0,
  });
  safeNotify(async () => {
    notify.couponCreated({
      code: data.code,
      type: data.type,
      value: data.value,
      by: await getAdmin(req.userId),
    });
  });
  res.json({ success: true, code: data.code });
});

router.put("/admin/coupons/:code", async (req, res): Promise<void> => {
  const code = String(req.params.code).toUpperCase();
  const parsed = couponUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const update: Record<string, unknown> = {};
  if (d.description !== undefined) update["description"] = d.description;
  if (d.type !== undefined) update["type"] = d.type;
  if (d.value !== undefined) update["value"] = d.value.toFixed(2);
  if (d.maxUses !== undefined) update["maxUses"] = d.maxUses;
  if (d.maxUsesPerUser !== undefined) update["maxUsesPerUser"] = d.maxUsesPerUser;
  if (d.minOrderAmount !== undefined) update["minOrderAmount"] = d.minOrderAmount.toFixed(2);
  if (d.startsAt !== undefined) update["startsAt"] = d.startsAt ? new Date(d.startsAt) : null;
  if (d.expiresAt !== undefined) update["expiresAt"] = d.expiresAt ? new Date(d.expiresAt) : null;
  if (d.restrictedToUserId !== undefined) update["restrictedToUserId"] = d.restrictedToUserId;
  if (d.isActive !== undefined) update["isActive"] = d.isActive ? 1 : 0;

  const result = await db.update(couponsTable).set(update).where(eq(couponsTable.code, code)).returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Coupon introuvable" });
    return;
  }
  safeNotify(async () => { notify.couponUpdated({ code, by: await getAdmin(req.userId) }); });
  res.json({ success: true });
});

router.post("/admin/coupons/:code/reset-uses", async (req, res): Promise<void> => {
  const code = String(req.params.code).toUpperCase();
  const result = await db
    .update(couponsTable)
    .set({ currentUses: 0 })
    .where(eq(couponsTable.code, code))
    .returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Coupon introuvable" });
    return;
  }
  await db.delete(couponUsagesTable).where(eq(couponUsagesTable.couponCode, code));
  res.json({ success: true });
});

router.delete("/admin/coupons/:code", async (req, res): Promise<void> => {
  const code = String(req.params.code).toUpperCase();
  await db.delete(couponUsagesTable).where(eq(couponUsagesTable.couponCode, code));
  const result = await db.delete(couponsTable).where(eq(couponsTable.code, code)).returning();
  if (result.length === 0) {
    res.status(404).json({ error: "Coupon introuvable" });
    return;
  }
  safeNotify(async () => { notify.couponDeleted({ code, by: await getAdmin(req.userId) }); });
  res.json({ success: true });
});

export default router;
