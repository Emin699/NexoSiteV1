import { pgTable, serial, integer, numeric, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const stripeRechargesTable = pgTable(
  "stripe_recharges",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    intentId: text("intent_id").notNull(),
    amountEur: numeric("amount_eur", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("created"),
    paymentMethod: text("payment_method"),
    capturedAt: timestamp("captured_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    intentIdUnique: uniqueIndex("stripe_recharges_intent_id_unique").on(t.intentId),
  }),
);

export type StripeRecharge = typeof stripeRechargesTable.$inferSelect;
