import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const jackpotDrawsTable = pgTable("jackpot_draws", {
  id: serial("id").primaryKey(),
  drawDate: timestamp("draw_date", { withTimezone: true }).notNull().defaultNow(),
  winnerId: integer("winner_id"),
  winnerName: text("winner_name"),
  prizeAmount: numeric("prize_amount", { precision: 10, scale: 2 }).notNull(),
  totalTicketsAtDraw: integer("total_tickets_at_draw").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertJackpotDrawSchema = createInsertSchema(jackpotDrawsTable).omit({ id: true, createdAt: true });
export type InsertJackpotDraw = z.infer<typeof insertJackpotDrawSchema>;
export type JackpotDraw = typeof jackpotDrawsTable.$inferSelect;
