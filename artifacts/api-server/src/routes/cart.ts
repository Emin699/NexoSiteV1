import { Router, type IRouter } from "express";
import {
  db,
  cartItemsTable,
  productsTable,
  productVariantsTable,
  stockItemsTable,
  couponsTable,
  couponUsagesTable,
  usersTable,
  ordersTable,
  transactionsTable,
  referralsTable,
} from "@workspace/db";
import { eq, and, sql, isNull, desc, asc } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { notify, safeNotify } from "../lib/notifier";
import { REFERRAL_REWARD_EUR, REFERRAL_CAP_EUR } from "../lib/referral-config";
import {
  AddToCartBody,
  ValidateCouponBody,
  CheckoutBody,
  GetCartResponse,
  ValidateCouponResponse,
  CheckoutResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Loyalty: 1 point earned per euro spent (redemption rate is 20 pts = 1€,
// handled in routes/loyalty.ts).
const POINTS_EARNED_PER_EUR = 1;
const AUTO_DISCOUNT_THRESHOLD = 50;
const AUTO_DISCOUNT_RATE = 0.05;

type CartItemRow = {
  id: number;
  productId: number;
  variantId: number | null;
  quantity: number;
  productName: string;
  productEmoji: string;
  productPrice: string;
  productDeliveryType: string;
  variantName: string | null;
  variantPrice: string | null;
};

async function fetchCartItems(userId: number): Promise<CartItemRow[]> {
  return db
    .select({
      id: cartItemsTable.id,
      productId: cartItemsTable.productId,
      variantId: cartItemsTable.variantId,
      quantity: cartItemsTable.quantity,
      productName: productsTable.name,
      productEmoji: productsTable.emoji,
      productPrice: productsTable.price,
      productDeliveryType: productsTable.deliveryType,
      variantName: productVariantsTable.name,
      variantPrice: productVariantsTable.price,
    })
    .from(cartItemsTable)
    .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
    .leftJoin(productVariantsTable, eq(cartItemsTable.variantId, productVariantsTable.id))
    .where(eq(cartItemsTable.userId, userId));
}

async function stockCountsForVariants(variantIds: number[]): Promise<Map<number, number>> {
  if (variantIds.length === 0) return new Map();
  const rows = await db
    .select({
      variantId: stockItemsTable.variantId,
      count: sql<number>`count(*)::int`,
    })
    .from(stockItemsTable)
    .where(and(eq(stockItemsTable.status, "available")))
    .groupBy(stockItemsTable.variantId);
  return new Map(
    rows.filter((r) => variantIds.includes(r.variantId)).map((r) => [r.variantId, Number(r.count) || 0]),
  );
}

type CouponData = {
  code: string;
  type: "percent" | "amount";
  value: number;
};

// DB executor type compatible with both `db` and a `tx` from db.transaction(...).
// Drizzle's transaction type differs from the root db type, so we extract it
// from the transaction callback signature.
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type DbExecutor = typeof db | DbTransaction;

/**
 * Validate and load a coupon for a given user/subtotal.
 *
 * In preview mode (default), this runs against the global `db` and is meant
 * for cart display / validate-coupon endpoints — race-free guarantees are NOT
 * required here.
 *
 * In checkout mode (`opts.lockForUpdate=true` + `opts.executor=tx`), the
 * coupon row is locked with `SELECT ... FOR UPDATE`, which serializes all
 * concurrent checkouts using the same code. Combined with the atomic
 * conditional increment performed by the caller, this prevents over-redemption
 * past `maxUses` and per-user limits.
 */
async function loadCouponFor(
  userId: number,
  code: string,
  subtotal: number,
  opts: { executor?: DbExecutor; lockForUpdate?: boolean } = {},
): Promise<{ coupon: CouponData | null; reason?: string }> {
  const exec = opts.executor ?? db;
  const upper = code.toUpperCase();

  let c: typeof couponsTable.$inferSelect | undefined;
  if (opts.lockForUpdate) {
    const locked = await exec.execute(
      sql`SELECT * FROM coupons WHERE code = ${upper} FOR UPDATE`,
    );
    const rows = (locked as unknown as { rows?: Array<typeof couponsTable.$inferSelect> }).rows
      ?? (locked as unknown as Array<typeof couponsTable.$inferSelect>);
    c = Array.isArray(rows) ? rows[0] : undefined;
  } else {
    [c] = await exec.select().from(couponsTable).where(eq(couponsTable.code, upper));
  }

  if (!c) return { coupon: null, reason: "Code promo invalide" };
  if (c.isActive !== 1) return { coupon: null, reason: "Code promo désactivé" };
  const now = new Date();
  const startsAt = c.startsAt ? new Date(c.startsAt) : null;
  const expiresAt = c.expiresAt ? new Date(c.expiresAt) : null;
  if (startsAt && startsAt > now) return { coupon: null, reason: "Code promo pas encore actif" };
  if (expiresAt && expiresAt < now) return { coupon: null, reason: "Code promo expiré" };
  if (c.currentUses >= c.maxUses) return { coupon: null, reason: "Code promo épuisé" };
  if (c.restrictedToUserId && c.restrictedToUserId !== userId) {
    return { coupon: null, reason: "Ce code n'est pas valide pour ton compte" };
  }
  const minOrder = Number(c.minOrderAmount);
  if (minOrder > 0 && subtotal < minOrder) {
    return { coupon: null, reason: `Commande minimale de ${minOrder.toFixed(2)}€ requise` };
  }
  if (c.maxUsesPerUser > 0) {
    const [{ used }] = await exec
      .select({ used: sql<number>`count(*)::int` })
      .from(couponUsagesTable)
      .where(and(eq(couponUsagesTable.couponCode, c.code), eq(couponUsagesTable.userId, userId)));
    if (Number(used) >= c.maxUsesPerUser) {
      return { coupon: null, reason: "Tu as déjà utilisé ce code le nombre de fois autorisé" };
    }
  }
  return { coupon: { code: c.code, type: c.type as "percent" | "amount", value: Number(c.value) } };
}

function unitPriceFor(row: CartItemRow): number {
  return row.variantPrice != null ? Number(row.variantPrice) : Number(row.productPrice);
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
  const subtotal = items.reduce((sum, i) => sum + unitPriceFor(i) * i.quantity, 0);

  const variantIds = items.map((i) => i.variantId).filter((v): v is number => v != null);
  const stockMap = await stockCountsForVariants(variantIds);

  let coupon: CouponData | null = null;
  let couponMessage: string | null = null;
  if (requestedCoupon && requestedCoupon.trim()) {
    const loaded = await loadCouponFor(userId, requestedCoupon.trim(), subtotal);
    coupon = loaded.coupon;
    if (!coupon) couponMessage = loaded.reason ?? "Code invalide";
  }

  const { finalDiscount, couponApplied } = computeDiscount(subtotal, coupon);
  const total = Math.max(0, subtotal - finalDiscount);

  return {
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      variantId: i.variantId,
      variantName: i.variantName,
      productName: i.productName,
      productEmoji: i.productEmoji,
      price: unitPriceFor(i),
      quantity: i.quantity,
      deliveryType: i.productDeliveryType,
      stockAvailable: i.variantId != null ? (stockMap.get(i.variantId) ?? 0) : null,
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

  const { productId, variantId, quantity = 1 } = parsed.data;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  if (variantId != null) {
    const [variant] = await db
      .select()
      .from(productVariantsTable)
      .where(and(eq(productVariantsTable.id, variantId), eq(productVariantsTable.productId, productId)));
    if (!variant) {
      res.status(404).json({ error: "Variant not found" });
      return;
    }
    if (!variant.isActive) {
      res.status(400).json({ error: "Cette variante n'est plus disponible" });
      return;
    }
  } else {
    // Pas de variantId : refuser si le produit a des variantes actives (sauf stock illimité)
    const activeVariants = await db
      .select({ id: productVariantsTable.id })
      .from(productVariantsTable)
      .where(and(
        eq(productVariantsTable.productId, productId),
        eq(productVariantsTable.isActive, true),
      ));
    if (activeVariants.length > 0 && !product.unlimitedStock) {
      res.status(400).json({ error: "Veuillez choisir une variante" });
      return;
    }
  }

  const variantCondition = variantId != null
    ? eq(cartItemsTable.variantId, variantId)
    : isNull(cartItemsTable.variantId);

  const [existing] = await db
    .select()
    .from(cartItemsTable)
    .where(and(
      eq(cartItemsTable.userId, req.userId!),
      eq(cartItemsTable.productId, productId),
      variantCondition,
    ));

  if (existing) {
    await db
      .update(cartItemsTable)
      .set({ quantity: Math.min(99, existing.quantity + quantity) })
      .where(eq(cartItemsTable.id, existing.id));
  } else {
    await db.insert(cartItemsTable).values({
      userId: req.userId!,
      productId,
      variantId: variantId ?? null,
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

  // Optional variant filter via query string ?variantId=X
  const variantQuery = typeof req.query.variantId === "string" ? parseInt(req.query.variantId, 10) : null;

  if (variantQuery != null && !isNaN(variantQuery)) {
    await db
      .delete(cartItemsTable)
      .where(and(
        eq(cartItemsTable.userId, req.userId!),
        eq(cartItemsTable.productId, productId),
        eq(cartItemsTable.variantId, variantQuery),
      ));
  } else {
    await db
      .delete(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, req.userId!), eq(cartItemsTable.productId, productId)));
  }

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
          variantId: cartItemsTable.variantId,
          quantity: cartItemsTable.quantity,
          productName: productsTable.name,
          productEmoji: productsTable.emoji,
          productPrice: productsTable.price,
          productDeliveryType: productsTable.deliveryType,
          productUnlimitedStock: productsTable.unlimitedStock,
          digitalContent: productsTable.digitalContent,
          digitalImageUrl: productsTable.digitalImageUrl,
          requiresCustomerInfo: productsTable.requiresCustomerInfo,
          customerInfoFields: productsTable.customerInfoFields,
          variantName: productVariantsTable.name,
          variantPrice: productVariantsTable.price,
        })
        .from(cartItemsTable)
        .innerJoin(productsTable, eq(cartItemsTable.productId, productsTable.id))
        .leftJoin(productVariantsTable, eq(cartItemsTable.variantId, productVariantsTable.id))
        .where(eq(cartItemsTable.userId, req.userId!));

      if (items.length === 0) {
        throw Object.assign(new Error("Cart is empty"), { status: 400 });
      }

      // Reserve stock_items per cart row that has variantId + deliveryType=auto.
      // Use FOR UPDATE SKIP LOCKED so concurrent checkouts don't double-consume.
      // Skip the pool entirely if the product is flagged unlimitedStock.
      const reservedStockByCartItem = new Map<number, { id: number; content: string }[]>();
      for (const item of items) {
        const isAuto = item.productDeliveryType === "auto";
        if (!isAuto || item.variantId == null || item.productUnlimitedStock) continue;

        const reserved = await tx.execute(sql`
          SELECT id, content FROM stock_items
          WHERE variant_id = ${item.variantId} AND status = 'available'
          ORDER BY id ASC
          LIMIT ${item.quantity}
          FOR UPDATE SKIP LOCKED
        `);
        const rows = (reserved as unknown as { rows: Array<{ id: number; content: string }> }).rows
          ?? (reserved as unknown as Array<{ id: number; content: string }>);

        if (!Array.isArray(rows) || rows.length < item.quantity) {
          throw Object.assign(
            new Error(`Stock insuffisant pour ${item.productName}${item.variantName ? ` (${item.variantName})` : ""}. Disponible : ${Array.isArray(rows) ? rows.length : 0}, demandé : ${item.quantity}.`),
            { status: 409 },
          );
        }
        reservedStockByCartItem.set(item.id, rows.map((r) => ({ id: Number(r.id), content: String(r.content) })));
      }

      const unitPrice = (it: typeof items[0]) => it.variantPrice != null ? Number(it.variantPrice) : Number(it.productPrice);
      const subtotal = items.reduce((sum, i) => sum + unitPrice(i) * i.quantity, 0);

      // Validate coupon INSIDE the transaction with FOR UPDATE on the coupon row,
      // so concurrent checkouts using the same code are serialized and cannot
      // bypass `maxUses` or `maxUsesPerUser`.
      let coupon: CouponData | null = null;
      if (couponCode && couponCode.trim()) {
        const loaded = await loadCouponFor(req.userId!, couponCode.trim(), subtotal, {
          executor: tx,
          lockForUpdate: true,
        });
        coupon = loaded.coupon;
      }

      const { finalDiscount, couponApplied } = computeDiscount(subtotal, coupon);
      const totalCharged = Math.round(Math.max(0, subtotal - finalDiscount) * 100) / 100;

      const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
      const earnedPoints = Math.floor(totalCharged * POINTS_EARNED_PER_EUR);

      // Snapshot of the buyer BEFORE the debit, so we can detect their first paid purchase.
      const [buyerBefore] = await tx
        .select({
          purchaseCount: usersTable.purchaseCount,
          referredBy: usersTable.referredBy,
        })
        .from(usersTable)
        .where(eq(usersTable.id, req.userId!));
      if (!buyerBefore) throw Object.assign(new Error("User not found"), { status: 404 });

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
        throw Object.assign(new Error("Solde insuffisant. Veuillez recharger votre portefeuille."), { status: 400 });
      }
      const newBalance = Number(debited[0].balance);

      // Referral reward (unchanged).
      if (
        buyerBefore.purchaseCount === 0 &&
        totalCharged > 0 &&
        buyerBefore.referredBy != null
      ) {
        const referrerId = buyerBefore.referredBy;
        const claimed = await tx
          .update(referralsTable)
          .set({ eligible: true, paid: true })
          .where(and(
            eq(referralsTable.referrerId, referrerId),
            eq(referralsTable.referredId, req.userId!),
            eq(referralsTable.paid, false),
          ))
          .returning({ id: referralsTable.id });

        if (claimed.length > 0) {
          const paidRows = await tx
            .select({ id: referralsTable.id })
            .from(referralsTable)
            .where(and(
              eq(referralsTable.referrerId, referrerId),
              eq(referralsTable.paid, true),
            ));
          const priorEarned = Math.max(0, (paidRows.length - 1)) * REFERRAL_REWARD_EUR;
          const remaining = Math.max(0, REFERRAL_CAP_EUR - priorEarned);
          const reward = Math.min(REFERRAL_REWARD_EUR, remaining);

          if (reward > 0) {
            await tx
              .update(usersTable)
              .set({ balance: sql`${usersTable.balance} + ${reward.toFixed(2)}` })
              .where(eq(usersTable.id, referrerId));

            const [buyer] = await tx
              .select({ firstName: usersTable.firstName, username: usersTable.username })
              .from(usersTable)
              .where(eq(usersTable.id, req.userId!));
            const buyerLabel = buyer?.username ? `@${buyer.username}` : (buyer?.firstName ?? "un filleul");

            await tx.insert(transactionsTable).values({
              userId: referrerId,
              type: "credit",
              amount: reward.toFixed(2),
              description: `Bonus parrainage — ${buyerLabel}`,
            });
          }
        }
      }

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "debit",
        amount: totalCharged.toFixed(2),
        description: `Achat panier (${items.length} produit${items.length > 1 ? "s" : ""}, ${totalQuantity} unité${totalQuantity > 1 ? "s" : ""})${couponApplied && coupon ? ` — coupon ${coupon.code}` : ""}`,
      });

      if (couponApplied && coupon) {
        // Atomic conditional increment: belt-and-suspenders against maxUses
        // overflow (the FOR UPDATE lock taken in loadCouponFor already
        // serializes concurrent checkouts of this coupon, but we double-check
        // here so an unexpected drift cannot oversubscribe).
        const incremented = await tx
          .update(couponsTable)
          .set({ currentUses: sql`${couponsTable.currentUses} + 1` })
          .where(and(
            eq(couponsTable.code, coupon.code),
            sql`${couponsTable.currentUses} < ${couponsTable.maxUses}`,
          ))
          .returning({ code: couponsTable.code });
        if (incremented.length === 0) {
          throw Object.assign(new Error("Code promo épuisé"), { status: 409 });
        }
        await tx.insert(couponUsagesTable).values({
          couponCode: coupon.code,
          userId: req.userId!,
          discountApplied: finalDiscount.toFixed(2),
        });
      }

      // Build orders. For variants with stock pool, each unit consumes exactly 1 stock_item.
      type OrderInsert = {
        userId: number;
        productId: number;
        variantId: number | null;
        variantName: string | null;
        stockItemId: number | null;
        productName: string;
        productEmoji: string;
        price: string;
        status: string;
        credentials: string | null;
        deliveryImageUrl: string | null;
        deliveredAt: Date | null;
        customerInfoFields: string | null;
      };

      const orderRows: OrderInsert[] = [];
      for (const item of items) {
        const isAuto = item.productDeliveryType === "auto";
        const fieldsJson = item.requiresCustomerInfo && item.customerInfoFields
          ? item.customerInfoFields
          : null;
        const reserved = reservedStockByCartItem.get(item.id) ?? [];
        const itemUnitPrice = unitPrice(item);

        for (let i = 0; i < item.quantity; i++) {
          let credentials: string | null = null;
          let stockItemId: number | null = null;

          if (isAuto) {
            if (item.variantId != null && reserved[i]) {
              credentials = reserved[i].content;
              stockItemId = reserved[i].id;
            } else if (item.digitalContent && item.digitalContent.trim()) {
              credentials = item.digitalContent;
            } else {
              credentials = "Votre produit a été livré automatiquement.";
            }
          }

          orderRows.push({
            userId: req.userId!,
            productId: item.productId,
            variantId: item.variantId,
            variantName: item.variantName,
            stockItemId,
            productName: item.productName,
            productEmoji: item.productEmoji,
            price: itemUnitPrice.toFixed(2),
            status: isAuto ? "delivered" : "pending",
            credentials,
            deliveryImageUrl: isAuto ? (item.digitalImageUrl ?? null) : null,
            deliveredAt: isAuto ? new Date() : null,
            customerInfoFields: fieldsJson,
          });
        }
      }

      const insertedOrders = await tx.insert(ordersTable).values(orderRows).returning();

      // Mark consumed stock_items as sold and link them to their orders.
      // Inserted orders are returned in insert order, which matches our orderRows order.
      for (let idx = 0; idx < insertedOrders.length; idx++) {
        const o = insertedOrders[idx];
        const planned = orderRows[idx];
        if (planned.stockItemId != null) {
          await tx
            .update(stockItemsTable)
            .set({
              status: "sold",
              soldOrderId: o.id,
              soldAt: new Date(),
            })
            .where(eq(stockItemsTable.id, planned.stockItemId));
        }
      }

      await tx.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.userId!));

      return { insertedOrders, totalCharged, newBalance, items, finalDiscount, couponApplied, coupon };
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

    // Telegram log: full checkout (fire-and-forget, never blocks the response).
    safeNotify(async () => {
      const [me] = await db
        .select({ id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName })
        .from(usersTable)
        .where(eq(usersTable.id, req.userId!));
      notify.orderPlaced({
        user: me ?? { id: req.userId!, username: null, firstName: null },
        items: result.items.map((i) => ({
          name: i.variantName ? `${i.productName} (${i.variantName})` : i.productName,
          qty: i.quantity,
          price: Number(i.productPrice),
        })),
        subtotal: result.totalCharged + (result.couponApplied ? result.finalDiscount : 0),
        discount: result.couponApplied ? result.finalDiscount : 0,
        total: result.totalCharged,
        couponCode: result.couponApplied && result.coupon ? result.coupon.code : null,
        deliveredCount: result.insertedOrders.filter((o) => o.status === "delivered").length,
        pendingCount: result.insertedOrders.filter((o) => o.status === "pending").length,
        newBalance: result.newBalance,
      });
    });

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
