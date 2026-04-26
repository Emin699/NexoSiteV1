import { pgTable, bigint, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const botSubscribersTable = pgTable("bot_subscribers", {
  telegramId: bigint("telegram_id", { mode: "number" }).primaryKey(),
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  languageCode: text("language_code"),
  blocked: boolean("blocked").notNull().default(false),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
});

export type BotSubscriber = typeof botSubscribersTable.$inferSelect;
