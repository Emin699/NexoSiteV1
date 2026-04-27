import { pgTable, text, numeric, integer, timestamp, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const couponsTable = pgTable("coupons", {
  code: text("code").primaryKey(),
  description: text("description"),
  type: text("type").notNull(),
  value: numeric("value", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses").notNull().default(1),
  currentUses: integer("current_uses").notNull().default(0),
  maxUsesPerUser: integer("max_uses_per_user").notNull().default(1),
  minOrderAmount: numeric("min_order_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  restrictedToUserId: integer("restricted_to_user_id"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const couponUsagesTable = pgTable(
  "coupon_usages",
  {
    id: serial("id").primaryKey(),
    couponCode: text("coupon_code").notNull(),
    userId: integer("user_id").notNull(),
    discountApplied: numeric("discount_applied", { precision: 10, scale: 2 }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    couponIdx: index("coupon_usages_coupon_idx").on(t.couponCode),
    userIdx: index("coupon_usages_user_idx").on(t.userId),
  }),
);

export const insertCouponSchema = createInsertSchema(couponsTable).omit({ createdAt: true });
export type InsertCoupon = z.infer<typeof insertCouponSchema>;
export type Coupon = typeof couponsTable.$inferSelect;
export type CouponUsage = typeof couponUsagesTable.$inferSelect;
