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

async function buildCartSummary(userId: number) {
  const items = await db
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

  const subtotal = items.reduce((sum, i) => sum + Number(i.price) * i.quantity, 0);
  const discount = subtotal >= 50 ? subtotal * 0.05 : 0;
  const total = subtotal - discount;

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
    discount: Math.round(discount * 100) / 100,
    total: Math.round(total * 100) / 100,
    couponCode: null,
    itemCount: items.reduce((sum, i) => sum + i.quantity, 0),
  };
}

router.get("/cart", requireAuth, async (req, res): Promise<void> => {
  const summary = await buildCartSummary(req.userId!);
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
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({
      userId: req.userId!,
      productId,
      quantity,
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

  const { code, cartTotal } = parsed.data;

  const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, code.toUpperCase()));

  if (!coupon) {
    res.json(ValidateCouponResponse.parse({ valid: false, discount: 0, type: null, message: "Code promo invalide" }));
    return;
  }

  if (coupon.currentUses >= coupon.maxUses) {
    res.json(ValidateCouponResponse.parse({ valid: false, discount: 0, type: null, message: "Code promo épuisé" }));
    return;
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    res.json(ValidateCouponResponse.parse({ valid: false, discount: 0, type: null, message: "Code promo expiré" }));
    return;
  }

  if (coupon.restrictedToUserId && coupon.restrictedToUserId !== req.userId) {
    res.json(ValidateCouponResponse.parse({ valid: false, discount: 0, type: null, message: "Ce code n'est pas valide pour votre compte" }));
    return;
  }

  let discount = 0;
  if (coupon.type === "percent") {
    discount = cartTotal * (Number(coupon.value) / 100);
  } else {
    discount = Math.min(Number(coupon.value), cartTotal);
  }

  res.json(
    ValidateCouponResponse.parse({
      valid: true,
      discount: Math.round(discount * 100) / 100,
      type: coupon.type,
      message: `Code appliqué : -${coupon.type === "percent" ? coupon.value + "%" : coupon.value + "€"}`,
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

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const summary = await buildCartSummary(req.userId!);
  if (summary.items.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }

  let totalCharged = summary.total;

  if (couponCode) {
    const [coupon] = await db.select().from(couponsTable).where(eq(couponsTable.code, couponCode.toUpperCase()));
    if (coupon && coupon.currentUses < coupon.maxUses) {
      let discount = 0;
      if (coupon.type === "percent") {
        discount = totalCharged * (Number(coupon.value) / 100);
      } else {
        discount = Math.min(Number(coupon.value), totalCharged);
      }
      totalCharged = Math.max(0, totalCharged - discount);
      await db
        .update(couponsTable)
        .set({ currentUses: coupon.currentUses + 1 })
        .where(eq(couponsTable.code, couponCode.toUpperCase()));
    }
  }

  totalCharged = Math.round(totalCharged * 100) / 100;

  if (Number(user.balance) < totalCharged) {
    res.status(400).json({ error: "Solde insuffisant. Veuillez recharger votre portefeuille." });
    return;
  }

  const newBalance = Math.round((Number(user.balance) - totalCharged) * 100) / 100;

  await db
    .update(usersTable)
    .set({
      balance: newBalance.toFixed(2),
      purchaseCount: sql`${usersTable.purchaseCount} + ${summary.items.length}`,
      jackpotTickets: sql`${usersTable.jackpotTickets} + ${summary.items.length}`,
    })
    .where(eq(usersTable.id, req.userId!));

  await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "debit",
    amount: totalCharged.toFixed(2),
    description: `Achat panier (${summary.items.length} article${summary.items.length > 1 ? "s" : ""})`,
  });

  const newOrders = await Promise.all(
    summary.items.map((item) =>
      db
        .insert(ordersTable)
        .values({
          userId: req.userId!,
          productId: item.productId,
          productName: item.productName,
          price: item.price.toFixed(2),
          status: item.deliveryType === "auto" ? "delivered" : "pending",
          credentials: item.deliveryType === "auto" ? "Livraison automatique en cours de traitement" : null,
          deliveredAt: item.deliveryType === "auto" ? new Date() : null,
        })
        .returning()
    )
  );

  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.userId!));

  const orders = newOrders.flat().map((o) => ({
    id: o.id,
    productName: o.productName,
    price: Number(o.price),
    status: o.status,
    credentials: o.credentials,
    deliveredAt: o.deliveredAt?.toISOString() ?? null,
    createdAt: o.createdAt.toISOString(),
  }));

  res.json(
    CheckoutResponse.parse({
      success: true,
      orders,
      totalCharged,
      newBalance,
    })
  );
});

export default router;
