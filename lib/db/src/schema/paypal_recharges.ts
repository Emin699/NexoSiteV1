import { pgTable, serial, integer, numeric, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const paypalRechargesTable = pgTable(
  "paypal_recharges",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    orderId: text("order_id").notNull(),
    amountEur: numeric("amount_eur", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("created"),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orderIdUnique: uniqueIndex("paypal_recharges_order_id_unique").on(t.orderId),
  }),
);

export type PaypalRecharge = typeof paypalRechargesTable.$inferSelect;
