import { pgTable, serial, integer, numeric, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cryptoRechargesTable = pgTable(
  "crypto_recharges",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    provider: text("provider").notNull().default("ltc"),
    amountEur: numeric("amount_eur", { precision: 10, scale: 2 }).notNull(),
    amountLtc: numeric("amount_ltc", { precision: 18, scale: 8 }).notNull(),
    address: text("address").notNull(),
    status: text("status").notNull().default("pending"),
    txHash: text("tx_hash"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    // Prevent the same on-chain tx from being claimed twice across the platform.
    // Postgres allows multiple NULLs so pending rows (txHash=null) are unaffected.
    txHashUnique: uniqueIndex("crypto_recharges_tx_hash_unique").on(t.txHash),
  }),
);

export const insertCryptoRechargeSchema = createInsertSchema(cryptoRechargesTable).omit({ id: true, createdAt: true });
export type InsertCryptoRecharge = z.infer<typeof insertCryptoRechargeSchema>;
export type CryptoRecharge = typeof cryptoRechargesTable.$inferSelect;
