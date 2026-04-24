import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  db,
  productsTable,
  usersTable,
  transactionsTable,
  ordersTable,
  jackpotDrawsTable,
  cartItemsTable,
  reviewsTable,
  wheelSpinsTable,
  paypalRechargesTable,
  cryptoRechargesTable,
} from "@workspace/db";
import { eq, desc, sql, gt } from "drizzle-orm";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middlewares/userAuth.js";

const router: IRouter = Router();

router.use("/admin", requireAuth, requireAdmin);

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
  digitalContent: z.string().nullable().optional(),
  digitalImageUrl: z.string().nullable().optional(),
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
  const { name, category, description, price, deliveryType, inStock, imageUrl, digitalContent, digitalImageUrl } = parsed.data;
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
      digitalContent: digitalContent ?? null,
      digitalImageUrl: digitalImageUrl ?? null,
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

  const { name, category, description, price, deliveryType, inStock, imageUrl, digitalContent, digitalImageUrl } = parsed.data;
  const [product] = await db
    .update(productsTable)
    .set({
      name, category, description, price: price.toFixed(2), deliveryType, inStock,
      imageUrl: imageUrl ?? null,
      digitalContent: digitalContent ?? null,
      digitalImageUrl: digitalImageUrl ?? null,
    })
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

// ============ LOGS ============
router.get("/admin/logs", async (req, res): Promise<void> => {
  const limit = Math.min(parseInt((req.query.limit as string) || "200", 10), 500);

  const txs = await db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      description: transactionsTable.description,
      createdAt: transactionsTable.createdAt,
      userEmail: usersTable.email,
      userName: usersTable.firstName,
    })
    .from(transactionsTable)
    .leftJoin(usersTable, eq(usersTable.id, transactionsTable.userId))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit);

  const orders = await db
    .select({
      id: ordersTable.id,
      userId: ordersTable.userId,
      productName: ordersTable.productName,
      price: ordersTable.price,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
      userEmail: usersTable.email,
      userName: usersTable.firstName,
    })
    .from(ordersTable)
    .leftJoin(usersTable, eq(usersTable.id, ordersTable.userId))
    .orderBy(desc(ordersTable.createdAt))
    .limit(limit);

  res.json({
    transactions: txs.map((t) => ({
      id: t.id,
      userId: t.userId,
      userEmail: t.userEmail,
      userName: t.userName,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      createdAt: t.createdAt.toISOString(),
    })),
    orders: orders.map((o) => ({
      id: o.id,
      userId: o.userId,
      userEmail: o.userEmail,
      userName: o.userName,
      productName: o.productName,
      price: Number(o.price),
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    })),
  });
});

// ============ USERS LIST ============
router.get("/admin/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt));
  res.json(
    users.map((u) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      username: u.username,
      balance: Number(u.balance),
      loyaltyPoints: u.loyaltyPoints,
      freeSpins: u.freeSpins,
      jackpotTickets: u.jackpotTickets,
      purchaseCount: u.purchaseCount,
      totalRecharged: Number(u.totalRecharged),
      isAdmin: u.isAdmin === 1,
      isBanned: u.isBanned === 1,
      createdAt: u.createdAt.toISOString(),
    }))
  );
});

// ============ BAN / UNBAN USER ============
const BanSchema = z.object({ ban: z.boolean() });

router.post("/admin/users/:id/ban", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  if (id === req.userId) { res.status(400).json({ error: "Vous ne pouvez pas vous bannir vous-même" }); return; }

  const parsed = BanSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
  if (target.isAdmin === 1) { res.status(400).json({ error: "Impossible de bannir un administrateur" }); return; }

  const newValue = parsed.data.ban ? 1 : 0;
  await db.update(usersTable).set({ isBanned: newValue }).where(eq(usersTable.id, id));
  res.json({ id, isBanned: newValue === 1 });
});

// ============ DELETE REVIEW ============
router.delete("/admin/reviews/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid review ID" }); return; }

  const [review] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
  if (!review) { res.status(404).json({ error: "Avis introuvable" }); return; }

  // Try to delete the associated image file (best-effort, do not fail on errors)
  if (review.imageUrl) {
    const m = review.imageUrl.match(/^\/api\/uploads\/([\w.\-]+)$/);
    if (m) {
      const filePath = path.join(uploadsDir, m[1]);
      try { fs.unlinkSync(filePath); } catch { /* ignore */ }
    }
  }

  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.json({ id, deleted: true });
});

// ============ DELETE USER ============
router.delete("/admin/users/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }
  if (id === req.userId) { res.status(400).json({ error: "Vous ne pouvez pas vous supprimer vous-même" }); return; }

  const [target] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!target) { res.status(404).json({ error: "Utilisateur introuvable" }); return; }
  if (target.isAdmin === 1) { res.status(400).json({ error: "Impossible de supprimer un administrateur" }); return; }

  await db.transaction(async (tx) => {
    await tx.delete(cartItemsTable).where(eq(cartItemsTable.userId, id));
    await tx.delete(reviewsTable).where(eq(reviewsTable.userId, id));
    await tx.delete(wheelSpinsTable).where(eq(wheelSpinsTable.userId, id));
    await tx.delete(transactionsTable).where(eq(transactionsTable.userId, id));
    await tx.delete(paypalRechargesTable).where(eq(paypalRechargesTable.userId, id));
    await tx.delete(cryptoRechargesTable).where(eq(cryptoRechargesTable.userId, id));
    await tx.delete(ordersTable).where(eq(ordersTable.userId, id));
    await tx.delete(usersTable).where(eq(usersTable.id, id));
  });

  res.json({ id, deleted: true });
});

// ============ ADJUST USER ============
const AdjustSchema = z.object({
  field: z.enum(["balance", "loyaltyPoints", "freeSpins", "jackpotTickets"]),
  delta: z.coerce.number(),
  reason: z.string().optional(),
});

router.post("/admin/users/:id/adjust", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid user ID" }); return; }

  const parsed = AdjustSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { field, delta, reason } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }

  if (field === "balance") {
    const current = Number(user.balance);
    const next = Math.max(0, Math.round((current + delta) * 100) / 100);
    await db.update(usersTable).set({ balance: next.toFixed(2) }).where(eq(usersTable.id, id));
    await db.insert(transactionsTable).values({
      userId: id,
      type: delta >= 0 ? "admin_credit" : "admin_debit",
      amount: Math.abs(delta).toFixed(2),
      description: reason || (delta >= 0 ? "Crédit administrateur" : "Débit administrateur"),
    });
  } else {
    const current = (user as Record<string, unknown>)[field] as number;
    const next = Math.max(0, current + Math.round(delta));
    await db.update(usersTable).set({ [field]: next }).where(eq(usersTable.id, id));
    const labels: Record<string, string> = {
      loyaltyPoints: "points de fidélité",
      freeSpins: "tour(s) de roue",
      jackpotTickets: "ticket(s) jackpot",
    };
    await db.insert(transactionsTable).values({
      userId: id,
      type: `admin_${field}`,
      amount: "0.00",
      description: reason || `Admin: ${delta >= 0 ? "+" : ""}${Math.round(delta)} ${labels[field]}`,
    });
  }

  const [updated] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  res.json({
    id: updated.id,
    balance: Number(updated.balance),
    loyaltyPoints: updated.loyaltyPoints,
    freeSpins: updated.freeSpins,
    jackpotTickets: updated.jackpotTickets,
  });
});

// ============ JACKPOT DRAW ============
// ============ PENDING ORDERS (manual delivery) ============
router.get("/admin/orders/pending", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: ordersTable.id,
      userId: ordersTable.userId,
      productId: ordersTable.productId,
      productName: ordersTable.productName,
      productEmoji: ordersTable.productEmoji,
      price: ordersTable.price,
      createdAt: ordersTable.createdAt,
      userPseudo: usersTable.firstName,
      userEmail: usersTable.email,
      digitalContent: productsTable.digitalContent,
      digitalImageUrl: productsTable.digitalImageUrl,
    })
    .from(ordersTable)
    .innerJoin(usersTable, eq(ordersTable.userId, usersTable.id))
    .leftJoin(productsTable, eq(ordersTable.productId, productsTable.id))
    .where(eq(ordersTable.status, "pending"))
    .orderBy(desc(ordersTable.createdAt))
    .limit(200);

  res.json({
    items: rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      userPseudo: r.userPseudo,
      userEmail: r.userEmail,
      productId: r.productId,
      productName: r.productName,
      productEmoji: r.productEmoji,
      price: Number(r.price),
      createdAt: r.createdAt.toISOString(),
      digitalContent: r.digitalContent,
      digitalImageUrl: r.digitalImageUrl,
    })),
  });
});

const DeliverSchema = z.object({
  credentials: z.string().min(1),
  deliveryImageUrl: z.string().nullish(),
});

router.post("/admin/orders/:id/deliver", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid order ID" }); return; }

  const parsed = DeliverSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, id));
  if (!order) { res.status(404).json({ error: "Commande introuvable" }); return; }
  if (order.status !== "pending") { res.status(400).json({ error: "Cette commande n'est pas en attente" }); return; }

  const [updated] = await db
    .update(ordersTable)
    .set({
      status: "delivered",
      credentials: parsed.data.credentials,
      deliveryImageUrl: parsed.data.deliveryImageUrl ?? null,
      deliveredAt: new Date(),
    })
    .where(eq(ordersTable.id, id))
    .returning();

  res.json({
    id: updated.id,
    productName: updated.productName,
    productEmoji: updated.productEmoji,
    price: Number(updated.price),
    status: updated.status,
    credentials: updated.credentials,
    deliveryImageUrl: updated.deliveryImageUrl,
    deliveredAt: updated.deliveredAt?.toISOString() ?? null,
    createdAt: updated.createdAt.toISOString(),
  });
});

const JackpotDrawSchema = z.object({
  prizeAmount: z.coerce.number().positive(),
  resetTickets: z.boolean().optional().default(true),
});

router.post("/admin/jackpot/draw", async (req, res): Promise<void> => {
  const parsed = JackpotDrawSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { prizeAmount, resetTickets } = parsed.data;

  try {
    const result = await db.transaction(async (tx) => {
      // Get all candidates (users with at least 1 ticket)
      const candidates = await tx
        .select({
          id: usersTable.id,
          firstName: usersTable.firstName,
          username: usersTable.username,
          email: usersTable.email,
          tickets: usersTable.jackpotTickets,
          balance: usersTable.balance,
        })
        .from(usersTable)
        .where(gt(usersTable.jackpotTickets, 0));

      const totalTickets = candidates.reduce((s, c) => s + c.tickets, 0);
      if (totalTickets === 0) {
        throw Object.assign(new Error("Aucun ticket en jeu — impossible de tirer un gagnant"), { status: 400 });
      }

      // Weighted random pick
      let pick = Math.floor(Math.random() * totalTickets);
      let winner = candidates[0];
      for (const c of candidates) {
        if (pick < c.tickets) { winner = c; break; }
        pick -= c.tickets;
      }

      // Credit winner's balance
      const winnerNewBalance = Math.round((Number(winner.balance) + prizeAmount) * 100) / 100;
      await tx
        .update(usersTable)
        .set({ balance: winnerNewBalance.toFixed(2) })
        .where(eq(usersTable.id, winner.id));

      await tx.insert(transactionsTable).values({
        userId: winner.id,
        type: "credit",
        amount: prizeAmount.toFixed(2),
        description: `Jackpot hebdomadaire — gagnant !`,
      });

      const winnerName = winner.username
        ? `@${winner.username}`
        : winner.firstName ?? "Utilisateur";

      // Record draw
      const [draw] = await tx
        .insert(jackpotDrawsTable)
        .values({
          winnerId: winner.id,
          winnerName,
          prizeAmount: prizeAmount.toFixed(2),
          totalTicketsAtDraw: totalTickets,
        })
        .returning();

      // Reset all tickets if requested
      if (resetTickets) {
        await tx.update(usersTable).set({ jackpotTickets: 0 });
      }

      return { draw, winner: { id: winner.id, name: winnerName, email: winner.email }, totalTickets };
    });

    res.json({
      success: true,
      drawId: result.draw.id,
      winnerId: result.winner.id,
      winnerName: result.winner.name,
      winnerEmail: result.winner.email,
      prizeAmount: Number(result.draw.prizeAmount),
      totalTicketsAtDraw: result.totalTickets,
      drawDate: result.draw.drawDate.toISOString(),
    });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    res.status(e.status ?? 500).json({ error: e.status ? e.message : "Erreur lors du tirage" });
  }
});

router.get("/admin/jackpot/draws", async (_req, res): Promise<void> => {
  const draws = await db
    .select()
    .from(jackpotDrawsTable)
    .orderBy(desc(jackpotDrawsTable.drawDate))
    .limit(20);
  res.json(
    draws.map((d) => ({
      id: d.id,
      drawDate: d.drawDate.toISOString(),
      winnerId: d.winnerId,
      winnerName: d.winnerName,
      prizeAmount: Number(d.prizeAmount),
      totalTicketsAtDraw: d.totalTicketsAtDraw,
    }))
  );
});

// Suppress unused warning
void sql;

export default router;
