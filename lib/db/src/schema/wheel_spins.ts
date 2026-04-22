import { pgTable, serial, integer, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const wheelSpinsTable = pgTable("wheel_spins", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  rewardType: text("reward_type").notNull(),
  rewardValue: numeric("reward_value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWheelSpinSchema = createInsertSchema(wheelSpinsTable).omit({ id: true, createdAt: true });
export type InsertWheelSpin = z.infer<typeof insertWheelSpinSchema>;
export type WheelSpin = typeof wheelSpinsTable.$inferSelect;
