import { Router, type IRouter } from "express";
import { db, cartItemsTable, productsTable, couponsTable, usersTable, ordersTable, transactionsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import {
  AddToCartBody,
  ValidateCouponBody,
  CheckoutBody,
  GetCartResponse,
  ValidateCouponResponse,
  CheckoutResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const POINTS_PER_EUR = 20;
const AUTO_DISCOUNT_THRESHOLD = 50;
const AUTO_DISCOUNT_RATE = 0.05;

type CartItemRow = {
  id: number;
  productId: number;
  quantity: number;
  name: string;
  emoji: string;
  price: string;
  deliveryType: string;
};

async function fetchCartItems(userId: number): Promise<CartItemRow[]> {
  return db
    .select({
      id: cartItemsTable.id,
      productId: cartItemsTable.productId,
      quantity: cartItemsTable.quantity,
      name: productsTable.name,
      emoji: productsTable.emoji,
      price: productsTable.price,
      deliveryType: productsTable.deliveryType,
    })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .where(eq(cartItemsTable.userId, userId));
}

type CouponData = {
  code: string;
  type: "percent" | "amount";
  value: number;
};

async function loadCouponFor(userId: number, code: string): Promise<{ coupon: CouponData | null; reason?: string }> {
  const [c] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));
  if (!c) return { coupon: null, reason: "Code promo invalide" };
  if (c.currentUses >= c.maxUses) return { coupon: null, reason: "Code promo épuisé" };
  if (c.expiresAt && c.expiresAt < new Date()) return { coupon: null, reason: "Code promo expiré" };
  if (c.restrictedToUserId && c.restrictedToUserId !== userId) {
    return { coupon: null, reason: "Ce code n'est pas valide pour votre compte" };
  }
  return { coupon: { code: c.code, type: c.type as "percent" | "amount", value: Number(c.value) } };
}

function computeDiscount(subtotal: number, coupon: CouponData | null) {
  const autoDiscount = subtotal >= AUTO_DISCOUNT_THRESHOLD ? subtotal * AUTO_DISCOUNT_RATE : 0;
  let couponDiscount = 0;
  if (coupon) {
    couponDiscount = coupon.type === "percent"
      ? subtotal * (coupon.value / 100)
      : Math.min(coupon.value, subtotal);
  }
  // Règle: on prend la meilleure remise des deux, jamais les deux cumulées
  const finalDiscount = Math.max(autoDiscount, couponDiscount);
  const couponApplied = couponDiscount > 0 && couponDiscount >= autoDiscount;
  return {
    autoDiscount: Math.round(autoDiscount * 100) / 100,
    couponDiscount: Math.round(couponDiscount * 100) / 100,
    finalDiscount: Math.round(finalDiscount * 100) / 100,
    couponApplied,
  };
}

async function buildCartSummary(userId: number, requestedCoupon?: string | null) {
  const items = await fetchCartItems(userId);
  const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

  let coupon: CouponData | null = null;
  let couponMessage: string | null = null;
  if (requestedCoupon && requestedCoupon.trim()) {
    const loaded = await loadCouponFor(userId, requestedCoupon.trim());
    coupon = loaded.coupon;
    if (!coupon) couponMessage = loaded.reason ?? "Code invalide";
  }

  const { finalDiscount, couponApplied } = computeDiscount(subtotal, coupon);
  const total = Math.max(0, subtotal - finalDiscount);

  return {
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.name,
      productEmoji: i.emoji,
      price: Number(i.price),
      quantity: i.quantity,
      deliveryType: i.deliveryType,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    discount: finalDiscount,
    total: Math.round(total * 100) / 100,
    couponCode: couponApplied && coupon ? coupon.code : null,
    couponMessage,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  const couponParam = typeof req.query.couponCode === "string" ? req.query.couponCode : null;
  const summary = await buildCartSummary(req.userId!, couponParam);
  res.json(GetCartResponse.parse(summary));
});

router.post("/cart", requireAuth, async (req, res): Promise<void> => {
  const parsed = AddToCartBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { productId, quantity = 1 } = parsed.data;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  const [existing] = await db
    .select()
    .from(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, req.userId!), eq(cartItemsTable.productId, productId)));

  if (existing) {
    await db
      .update(cartItemsTable)
      .set({ quantity: Math.min(99, existing.quantity + quantity) })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({
      userId: req.userId!,
      productId,
      quantity: Math.min(99, quantity),
    });
  }

  const summary = await buildCartSummary(req.userId!);
  res.json(GetCartResponse.parse(summary));
});

router.delete("/cart", requireAuth, async (req, res): Promise<void> => {
  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.userId!));
  const summary = await buildCartSummary(req.userId!);
  res.json(GetCartResponse.parse(summary));
});

router.delete("/cart/:productId", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
  const productId = parseInt(raw, 10);

  if (isNaN(productId)) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  await db
    .delete(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, req.userId!), eq(cartItemsTable.productId, productId)));

  const summary = await buildCartSummary(req.userId!);
  res.json(GetCartResponse.parse(summary));
});

router.post("/cart/validate-coupon", requireAuth, async (req, res): Promise<void> => {
  const parsed = ValidateCouponBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { code } = parsed.data;
  const summary = await buildCartSummary(req.userId!, code);

  if (!summary.couponCode) {
    res.json(
      ValidateCouponResponse.parse({
        valid: false,
        discount: 0,
        newTotal: summary.total,
        type: null,
        message: summary.couponMessage ?? "Code invalide ou non avantageux par rapport à la remise automatique",
      })
    );
    return;
  }

  res.json(
    ValidateCouponResponse.parse({
      valid: true,
      discount: summary.discount,
      newTotal: summary.total,
      type: "applied",
      message: `Code appliqué — total : ${summary.total.toFixed(2)}€`,
    })
  );
});

router.post("/cart/checkout", requireAuth, async (req, res): Promise<void> => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { couponCode } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      const items = await tx
        .select({
          id: cartItemsTable.id,
          productId: cartItemsTable.productId,
          quantity: cartItemsTable.quantity,
          name: productsTable.name,
          emoji: productsTable.emoji,
          price: productsTable.price,
          deliveryType: productsTable.deliveryType,
          digitalContent: productsTable.digitalContent,
          digitalImageUrl: productsTable.digitalImageUrl,
          requiresCustomerInfo: productsTable.requiresCustomerInfo,
          customerInfoFields: productsTable.customerInfoFields,
        })
        .from(cartItemsTable)
        .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
        .where(eq(cartItemsTable.userId, req.userId!));

      if (items.length === 0) {
        throw Object.assign(new Error("Cart is empty"), { status: 400 });
      }

      const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);

      let coupon: CouponData | null = null;
      if (couponCode && couponCode.trim()) {
        const loaded = await loadCouponFor(req.userId!, couponCode.trim());
        coupon = loaded.coupon;
      }

      const { finalDiscount, couponApplied } = computeDiscount(subtotal, coupon);
      const totalCharged = Math.round(Math.max(0, subtotal - finalDiscount) * 100) / 100;

      const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
      const earnedPoints = Math.floor(totalCharged * POINTS_PER_EUR);

      // Conditional debit: atomic balance check + decrement (no read-then-write race).
      const debited = await tx
        .update(usersTable)
        .set({
          balance: sql`${usersTable.balance} - ${totalCharged.toFixed(2)}`,
          purchaseCount: sql`${usersTable.purchaseCount} + ${totalQuantity}`,
          jackpotTickets: sql`${usersTable.jackpotTickets} + ${totalQuantity}`,
          loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${earnedPoints}`,
        })
        .where(and(
          eq(usersTable.id, req.userId!),
          sql`${usersTable.balance} >= ${totalCharged.toFixed(2)}`,
        ))
        .returning();

      if (debited.length === 0) {
        const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        if (!u) throw Object.assign(new Error("User not found"), { status: 404 });
        throw Object.assign(new Error("Solde insuffisant. Veuillez recharger votre portefeuille."), { status: 400 });
      }
      const newBalance = Number(debited[0].balance);

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "debit",
        amount: totalCharged.toFixed(2),
        description: `Achat panier (${items.length} produit${items.length > 1 ? "s" : ""}, ${totalQuantity} unité${totalQuantity > 1 ? "s" : ""})${couponApplied && coupon ? ` — coupon ${coupon.code}` : ""}`,
      });

      if (couponApplied && coupon) {
        await tx
          .update(couponsTable)
          .set({ currentUses: sql`${couponsTable.currentUses} + 1` })
          .where(eq(couponsTable.code, coupon.code));
      }

      const orderRows: Array<{
        userId: number;
        productId: number;
        productName: string;
        productEmoji: string;
        price: string;
        status: string;
        credentials: string | null;
        deliveryImageUrl: string | null;
        deliveredAt: Date | null;
        customerInfoFields: string | null;
      }> = [];
      for (const item of items) {
        const isAuto = item.deliveryType === "auto";
        const autoContent = item.digitalContent && item.digitalContent.trim()
          ? item.digitalContent
          : "Votre produit a été livré automatiquement.";
        const fieldsJson = item.requiresCustomerInfo && item.customerInfoFields
          ? item.customerInfoFields
          : null;
        for (let i = 0; i < item.quantity; i++) {
          orderRows.push({
            userId: req.userId!,
            productId: item.productId,
            productName: item.name,
            productEmoji: item.emoji,
            price: item.price,
            status: isAuto ? "delivered" : "pending",
            credentials: isAuto ? autoContent : null,
            deliveryImageUrl: isAuto ? (item.digitalImageUrl ?? null) : null,
            deliveredAt: isAuto ? new Date() : null,
            customerInfoFields: fieldsJson,
          });
        }
      }

      const insertedOrders = await tx.insert(ordersTable).values(orderRows).returning();

      await tx.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.userId!));

      return { insertedOrders, totalCharged, newBalance };
    });

    const parseFields = (raw: string | null): string[] => {
      if (!raw) return [];
      try {
        const v = JSON.parse(raw);
        return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
      } catch {
        return [];
      }
    };
    const parseInfo = (raw: string | null): Record<string, string> | null => {
      if (!raw) return null;
      try {
        const v = JSON.parse(raw);
        if (v && typeof v === "object" && !Array.isArray(v)) {
          const out: Record<string, string> = {};
          for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
            if (typeof val === "string") out[k] = val;
          }
          return out;
        }
        return null;
      } catch {
        return null;
      }
    };

    const orders = result.insertedOrders.map((o) => ({
      id: o.id,
      productName: o.productName,
      productEmoji: o.productEmoji,
      price: Number(o.price),
      status: o.status,
      credentials: o.credentials,
      deliveryImageUrl: o.deliveryImageUrl,
      deliveredAt: o.deliveredAt?.toISOString() ?? null,
      customerInfoFields: parseFields(o.customerInfoFields),
      customerInfo: parseInfo(o.customerInfo),
      createdAt: o.createdAt.toISOString(),
    }));

    res.json(
      CheckoutResponse.parse({
        success: true,
        orders,
        totalCharged: result.totalCharged,
        newBalance: result.newBalance,
      })
    );
  } catch (err) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.status ? e.message : "Erreur lors du checkout" });
  }
});

export default router;
