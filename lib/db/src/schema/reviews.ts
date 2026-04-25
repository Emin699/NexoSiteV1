import { pgTable, serial, integer, text, boolean, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable(
  "reviews",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    productId: integer("product_id").notNull(),
    orderId: integer("order_id"),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    imageUrl: text("image_url"),
    isAuto: boolean("is_auto").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniqUserProduct: uniqueIndex("reviews_user_product_unique").on(t.userId, t.productId),
  })
);

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
