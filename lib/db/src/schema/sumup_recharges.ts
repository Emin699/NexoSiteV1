import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const sumupRechargesTable = pgTable("sumup_recharges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  checkoutId: text("checkout_id").notNull(),
  checkoutReference: text("checkout_reference").notNull(),
  amountEur: numeric("amount_eur", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, PAID, FAILED
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type SumupRecharge = typeof sumupRechargesTable.$inferSelect;
export type InsertSumupRecharge = typeof sumupRechargesTable.$inferInsert;
