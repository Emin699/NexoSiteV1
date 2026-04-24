import { pgTable, serial, integer, text, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stockItemsTable = pgTable(
  "stock_items",
  {
    id: serial("id").primaryKey(),
    variantId: integer("variant_id").notNull(),
    content: text("content").notNull(),
    status: text("status").notNull().default("available"),
    soldOrderId: integer("sold_order_id"),
    soldAt: timestamp("sold_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    variantStatusIdx: index("stock_items_variant_status_idx").on(table.variantId, table.status),
    variantContentUniq: uniqueIndex("stock_items_variant_content_uniq").on(table.variantId, table.content),
  }),
);

export const insertStockItemSchema = createInsertSchema(stockItemsTable).omit({
  id: true,
  createdAt: true,
  soldOrderId: true,
  soldAt: true,
});
export type InsertStockItem = z.infer<typeof insertStockItemSchema>;
export type StockItem = typeof stockItemsTable.$inferSelect;
