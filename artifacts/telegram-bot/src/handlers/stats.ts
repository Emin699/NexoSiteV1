import type { Context } from "telegraf";
import { sql, eq, and, gte } from "drizzle-orm";
import { isAdmin } from "../config.js";
import {
  db,
  usersTable,
  ordersTable,
  productsTable,
  transactionsTable,
  ticketsTable,
  botSubscribersTable,
} from "../db.js";

function fmtEur(n: number): string {
  return `${n.toFixed(2)}€`;
}

export async function handleStats(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  if (!isAdmin(from.id)) {
    await ctx.reply("⛔️ Commande réservée aux administrateurs.");
    return;
  }

  await ctx.reply("📊 Calcul des statistiques…");

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [
    [users],
    [usersBanned],
    [users24h],
    [subs],
    [products],
    [productsInStock],
    [ordersTotal],
    [ordersDelivered],
    [ordersPending],
    [orders24h],
    [revenue],
    [revenue24h],
    [recharged],
    [ticketsOpen],
  ] = await Promise.all([
    db.select({ c: sql<number>`count(*)::int` }).from(usersTable),
    db.select({ c: sql<number>`count(*)::int` }).from(usersTable).where(eq(usersTable.isBanned, 1)),
    db.select({ c: sql<number>`count(*)::int` }).from(usersTable).where(gte(usersTable.createdAt, since24h)),
    db.select({ c: sql<number>`count(*)::int` }).from(botSubscribersTable),
    db.select({ c: sql<number>`count(*)::int` }).from(productsTable),
    db.select({ c: sql<number>`count(*)::int` }).from(productsTable).where(eq(productsTable.inStock, true)),
    db.select({ c: sql<number>`count(*)::int` }).from(ordersTable),
    db.select({ c: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "delivered")),
    db.select({ c: sql<number>`count(*)::int` }).from(ordersTable).where(eq(ordersTable.status, "pending")),
    db.select({ c: sql<number>`count(*)::int` }).from(ordersTable).where(gte(ordersTable.createdAt, since24h)),
    db.select({ s: sql<string>`coalesce(sum(${ordersTable.price}), 0)::text` }).from(ordersTable),
    db
      .select({ s: sql<string>`coalesce(sum(${ordersTable.price}), 0)::text` })
      .from(ordersTable)
      .where(gte(ordersTable.createdAt, since24h)),
    db
      .select({ s: sql<string>`coalesce(sum(${transactionsTable.amount}), 0)::text` })
      .from(transactionsTable)
      .where(eq(transactionsTable.type, "credit")),
    db
      .select({ c: sql<number>`count(*)::int` })
      .from(ticketsTable)
      .where(and(eq(ticketsTable.status, "open"))),
  ]);

  const lines = [
    "📊 <b>Statistiques NexoShop</b>",
    "",
    "👥 <b>Utilisateurs</b>",
    `   • Total : <b>${users.c}</b>`,
    `   • Bannis : <b>${usersBanned.c}</b>`,
    `   • Inscrits (24h) : <b>${users24h.c}</b>`,
    `   • Abonnés Telegram : <b>${subs.c}</b>`,
    "",
    "🛍️ <b>Produits</b>",
    `   • Total : <b>${products.c}</b>`,
    `   • En stock : <b>${productsInStock.c}</b>`,
    "",
    "📦 <b>Commandes</b>",
    `   • Total : <b>${ordersTotal.c}</b>`,
    `   • Livrées : <b>${ordersDelivered.c}</b>`,
    `   • En attente : <b>${ordersPending.c}</b>`,
    `   • 24h : <b>${orders24h.c}</b>`,
    "",
    "💰 <b>Chiffre d'affaires</b>",
    `   • Total : <b>${fmtEur(Number(revenue.s))}</b>`,
    `   • 24h : <b>${fmtEur(Number(revenue24h.s))}</b>`,
    `   • Recharges totales : <b>${fmtEur(Number(recharged.s))}</b>`,
    "",
    "🎫 <b>Tickets</b>",
    `   • Ouverts : <b>${ticketsOpen.c}</b>`,
  ];

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}
