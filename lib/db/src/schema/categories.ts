import { pgTable, serial, text, integer } from "drizzle-orm/pg-core";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull().default("LayoutGrid"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export type Category = typeof categoriesTable.$inferSelect;
export type InsertCategory = typeof categoriesTable.$inferInsert;
