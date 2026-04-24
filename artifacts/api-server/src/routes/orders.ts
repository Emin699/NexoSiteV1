import { Router, type IRouter } from "express";
import { db, ordersTable, productsTable, usersTable, transactionsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import {
  BuyProductBody,
  GetOrdersResponse,
  BuyProductResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const POINTS_PER_EUR = 20;

router.get("/orders", requireAuth, async (req, res): Promise<void> => {
  const orders = await db
    .select()
    .from(ordersTable)
    .where(eq(ordersTable.userId, req.userId!))
    .orderBy(desc(ordersTable.createdAt))
    .limit(50);

  res.json(
    GetOrdersResponse.parse(
      orders.map((o) => ({
        id: o.id,
        productName: o.productName,
        price: Number(o.price),
        status: o.status,
        credentials: o.credentials,
        deliveredAt: o.deliveredAt?.toISOString() ?? null,
        createdAt: o.createdAt.toISOString(),
      }))
    )
  );
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
      const [user] = await tx
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, req.userId!));

      if (!user) {
        throw Object.assign(new Error("Utilisateur introuvable"), { status: 404 });
      }
      if (Number(user.balance) < total) {
        throw Object.assign(new Error("Solde insuffisant. Veuillez recharger votre portefeuille."), { status: 400 });
      }

      const newBalance = Math.round((Number(user.balance) - total) * 100) / 100;
      const earnedPoints = Math.floor(total * POINTS_PER_EUR);

      await tx
        .update(usersTable)
        .set({
          balance: newBalance.toFixed(2),
          purchaseCount: sql`${usersTable.purchaseCount} + ${quantity}`,
          jackpotTickets: sql`${usersTable.jackpotTickets} + ${quantity}`,
          loyaltyPoints: sql`${usersTable.loyaltyPoints} + ${earnedPoints}`,
        })
        .where(eq(usersTable.id, req.userId!));

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "debit",
        amount: total.toFixed(2),
        description: quantity > 1
          ? `Achat : ${product.name} ×${quantity}`
          : `Achat : ${product.name}`,
      });

      const orderRows = Array.from({ length: quantity }).map(() => ({
        userId: req.userId!,
        productId,
        productName: product.name,
        price: product.price,
        status: product.deliveryType === "auto" ? "delivered" : "pending",
        credentials:
          product.deliveryType === "auto"
            ? product.digitalContent ?? "Livraison automatique en cours de traitement"
            : null,
        deliveredAt: product.deliveryType === "auto" ? new Date() : null,
      }));

      const inserted = await tx.insert(ordersTable).values(orderRows).returning();
      return inserted[0];
    });

    res.json(
      BuyProductResponse.parse({
        id: firstOrder.id,
        productName: firstOrder.productName,
        price: Number(firstOrder.price),
        status: firstOrder.status,
        credentials: firstOrder.credentials,
        deliveredAt: firstOrder.deliveredAt?.toISOString() ?? null,
        createdAt: firstOrder.createdAt.toISOString(),
        quantity,
        totalCharged: total,
      })
    );
  } catch (err) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.message ?? "Erreur lors de l'achat" });
  }
});

export default router;
