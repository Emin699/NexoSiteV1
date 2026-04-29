import { sqliteTable, integer, text, real } from "drizzle-orm/sqlite-core";
import { usersTable } from "./users";
import { sql } from "drizzle-orm";

export const sumupRechargesTable = sqliteTable("sumup_recharges", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => usersTable.id),
  checkoutId: text("checkout_id").notNull(),
  checkoutReference: text("checkout_reference").notNull(),
  amountEur: real("amount_eur").notNull(),
  status: text("status").notNull().default("PENDING"), // PENDING, PAID, FAILED
  createdAt: text("created_at")
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});

export type SumupRecharge = typeof sumupRechargesTable.$inferSelect;
export type InsertSumupRecharge = typeof sumupRechargesTable.$inferInsert;
