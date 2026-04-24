import { Router, type IRouter } from "express";
import { db, ordersTable, productsTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import {
  BuyProductBody,
  GetOrdersResponse,
  BuyProductResponse,
  GetPendingOrdersCountResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const POINTS_PER_EUR = 20;

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.userId!))
    .orderBy(desc(ordersTable.createdAt))
    .limit(200);

  res.json(
    GetOrdersResponse.parse(
      orders.map((o) => ({
        id: o.id,
        productName: o.productName,
        productEmoji: o.productEmoji,
        price: Number(o.price),
        status: o.status,
        credentials: o.credentials,
        deliveryImageUrl: o.deliveryImageUrl,
        deliveredAt: o.deliveredAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
      }))
    )
  );
});

router.get("/orders/pending-count", requireAuth, async (_req, res): Promise<void> => {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"));
  res.json(GetPendingOrdersCountResponse.parse({ count: row?.count ?? 0 }));
});

router.post("/orders/buy", requireAuth, async (req, res): Promise<void> => {
  const parsed = BuyProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { productId } = parsed.data;
  const quantity = Math.max(1, Math.min(99, parsed.data.quantity ?? 1));

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

  if (!product.inStock) {
    res.status(400).json({ error: "Produit en rupture de stock" });
    return;
  }

  const unitPrice = Number(product.price);
  const total = Math.round(unitPrice * quantity * 100) / 100;

  // Single atomic operation: balance check + debit + N orders + transaction + stats
  try {
    const firstOrder = await db.transaction(async (tx) => {
      const earnedPoints = Math.floor(total * POINTS_PER_EUR);

      // Conditional debit: only succeeds if balance >= total. No read-then-write race.
      const debited = await tx
        .update(usersTable)
        .set({
          balance: sql`${usersTable.balance} - ${total.toFixed(2)}`,
          purchaseCount: sql`${usersTable.purchaseCount} + ${quantity}`,
          jackpotTickets: sql`${usersTable.jackpotTickets} + ${quantity}`,
          loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${earnedPoints}`,
        })
        .where(and(
          eq(usersTable.id, req.userId!),
          sql`${usersTable.balance} >= ${total.toFixed(2)}`,
        ))
        .returning();

      if (debited.length === 0) {
        // Either user missing or insufficient balance — distinguish for UX.
        const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, req.userId!));
        if (!u) throw Object.assign(new Error("Utilisateur introuvable"), { status: 404 });
        throw Object.assign(new Error("Solde insuffisant. Veuillez recharger votre portefeuille."), { status: 400 });
      }

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "debit",
        amount: total.toFixed(2),
        description: quantity > 1
          ? `Achat : ${product.name} ×${quantity}`
          : `Achat : ${product.name}`,
      });

      const isAuto = product.deliveryType === "auto";
      const autoContent =
        product.digitalContent && product.digitalContent.trim()
          ? product.digitalContent
          : "Votre produit a été livré automatiquement.";
      const orderRows = Array.from({ length: quantity }).map(() => ({
        userId: req.userId!,
        productId,
        productName: product.name,
        productEmoji: product.emoji,
        price: product.price,
        status: isAuto ? "delivered" : "pending",
        credentials: isAuto ? autoContent : null,
        deliveryImageUrl: isAuto ? (product.digitalImageUrl ?? null) : null,
        deliveredAt: isAuto ? new Date() : null,
      }));

      const inserted = await tx.insert(ordersTable).values(orderRows).returning();
      return inserted[0];
    });

    res.json(
      BuyProductResponse.parse({
        id: firstOrder.id,
        productName: firstOrder.productName,
        productEmoji: firstOrder.productEmoji,
        price: Number(firstOrder.price),
        status: firstOrder.status,
        credentials: firstOrder.credentials,
        deliveryImageUrl: firstOrder.deliveryImageUrl,
        deliveredAt: firstOrder.deliveredAt?.toISOString() ?? null,
        createdAt: firstOrder.createdAt.toISOString(),
      })
    );
  } catch (err) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.status ? e.message : "Erreur lors de l'achat" });
  }
});

export default router;
