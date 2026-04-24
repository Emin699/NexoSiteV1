import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  telegramId: text("telegram_id").unique(),
  username: text("username"),
  firstName: text("first_name").notNull().default("User"),
  balance: numeric("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  purchaseCount: integer("purchase_count").notNull().default(0),
  totalRecharged: numeric("total_recharged", { precision: 10, scale: 2 }).notNull().default("0.00"),
  freeSpins: integer("free_spins").notNull().default(1),
  lastSpinAt: timestamp("last_spin_at", { withTimezone: true }),
  jackpotTickets: integer("jackpot_tickets").notNull().default(0),
  referredBy: integer("referred_by"),
  emailVerified: integer("email_verified").notNull().default(0),
  verificationCode: text("verification_code"),
  verificationCodeExpiresAt: timestamp("verification_code_expires_at", { withTimezone: true }),
  isAdmin: integer("is_admin").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
