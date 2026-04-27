import { Telegraf } from "telegraf";
import { message } from "telegraf/filters";
import { config, isAdmin } from "./config.js";
import { handleStart } from "./handlers/start.js";
import {
  handleSayAll,
  handleCancel,
  isAwaitingBroadcast,
  broadcastMessage,
} from "./handlers/sayall.js";
import { handleStats } from "./handlers/stats.js";

const bot = new Telegraf(config.botToken);

// /start — register subscriber and send welcome card
bot.start(handleStart);

// /sayall — admin only, enter broadcast mode
bot.command("sayall", handleSayAll);

// /cancel — admin only, exit broadcast mode
bot.command("cancel", handleCancel);

// /stats — admin only, show site statistics
bot.command("stats", handleStats);

// Catch any non-command message: if admin is in broadcast mode, copy it to all subscribers.
bot.on(message(), async (ctx, next) => {
  const from = ctx.from;
  if (from && isAdmin(from.id) && isAwaitingBroadcast(from.id)) {
    await broadcastMessage(ctx);
    return;
  }
  return next();
});

bot.catch((err, ctx) => {
  console.error(`[bot] error for update ${ctx.update.update_id}:`, err);
});

async function main() {
  const me = await bot.telegram.getMe();
  console.log(`[bot] logged in as @${me.username} (id=${me.id})`);
  console.log(`[bot] admins: ${config.adminIds.join(", ")}`);

  await bot.launch();
  console.log("[bot] launched and polling");
}

process.once("SIGINT", () => {
  console.log("[bot] SIGINT — stopping");
  bot.stop("SIGINT");
});
process.once("SIGTERM", () => {
  console.log("[bot] SIGTERM — stopping");
  bot.stop("SIGTERM");
});

main().catch((err) => {
  console.error("[bot] fatal error during startup:", err);
  process.exit(1);
});
