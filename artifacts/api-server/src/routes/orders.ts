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

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));

  if (!product) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable" });
    return;
  }

  const price = Number(product.price);
  if (Number(user.balance) < price) {
    res.status(400).json({ error: "Solde insuffisant. Veuillez recharger votre portefeuille." });
    return;
  }

  const newBalance = Math.round((Number(user.balance) - price) * 100) / 100;

  await db
    .update(usersTable)
    .set({
      balance: newBalance.toFixed(2),
      purchaseCount: sql`${usersTable.purchaseCount} + 1`,
      jackpotTickets: sql`${usersTable.jackpotTickets} + 1`,
    })
    .where(eq(usersTable.id, req.userId!));

  await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: "debit",
    amount: price.toFixed(2),
    description: `Achat : ${product.name}`,
  });

  const [order] = await db
    .insert(ordersTable)
    .values({
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
    })
    .returning();

  res.json(
    BuyProductResponse.parse({
      id: order.id,
      productName: order.productName,
      price: Number(order.price),
      status: order.status,
      credentials: order.credentials,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
    })
  );
});

export default router;
