import { pgTable, serial, integer, numeric, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  variantId: integer("variant_id"),
  variantName: text("variant_name"),
  stockItemId: integer("stock_item_id"),
  productName: text("product_name").notNull(),
  productEmoji: text("product_emoji").notNull().default("🛍️"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  credentials: text("credentials"),
  deliveryImageUrl: text("delivery_image_url"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  customerInfoFields: text("customer_info_fields"),
  customerInfo: text("customer_info"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
