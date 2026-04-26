import type { Context } from "telegraf";
import { eq } from "drizzle-orm";
import { db, botSubscribersTable } from "../db.js";
import { isAdmin } from "../config.js";

// Map<adminTelegramId, true> — admin is awaiting next message to broadcast
const awaitingBroadcast = new Set<number>();

export function isAwaitingBroadcast(adminId: number): boolean {
  return awaitingBroadcast.has(adminId);
}

export async function handleSayAll(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  if (!isAdmin(from.id)) {
    await ctx.reply("⛔ Cette commande est réservée à l'administrateur.");
    return;
  }

  awaitingBroadcast.add(from.id);
  await ctx.reply(
    "📢 <b>Mode diffusion activé.</b>\n\n" +
      "Envoie maintenant le contenu à diffuser à tous les abonnés du bot.\n\n" +
      "✅ Formats supportés : texte (gras, italique, souligné, code…), emojis animés Telegram, photos, vidéos, GIFs, stickers, audio, documents…\n\n" +
      "❌ Tape /cancel pour annuler.",
    { parse_mode: "HTML" },
  );
}

export async function handleCancel(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;
  if (awaitingBroadcast.delete(from.id)) {
    await ctx.reply("❎ Diffusion annulée.");
  }
}

/**
 * Broadcasts the message that the admin just sent (any type) to every active subscriber.
 * Uses copyMessage which preserves formatting, animated emojis, media, captions, etc.,
 * and does NOT show "forwarded from" header.
 */
export async function broadcastMessage(ctx: Context): Promise<void> {
  const from = ctx.from;
  const chat = ctx.chat;
  const message = ctx.message;
  if (!from || !chat || !message) return;

  awaitingBroadcast.delete(from.id);

  const fromChatId = chat.id;
  const messageId = message.message_id;

  const subscribers = await db
    .select()
    .from(botSubscribersTable)
    .where(eq(botSubscribersTable.blocked, false));

  await ctx.reply(
    `📤 Diffusion en cours vers ${subscribers.length} abonné(s)…`,
  );

  let success = 0;
  let failed = 0;
  let blockedCount = 0;

  for (const sub of subscribers) {
    try {
      await ctx.telegram.copyMessage(sub.telegramId, fromChatId, messageId);
      success++;
    } catch (err: unknown) {
      failed++;
      const e = err as { response?: { error_code?: number; description?: string } };
      const code = e?.response?.error_code;
      // 403 = bot blocked by user, 400 = chat not found / deactivated
      if (code === 403 || code === 400) {
        blockedCount++;
        try {
          await db
            .update(botSubscribersTable)
            .set({ blocked: true })
            .where(eq(botSubscribersTable.telegramId, sub.telegramId));
        } catch {
          // ignore
        }
      } else {
        console.error(`[sayall] failed to send to ${sub.telegramId}:`, e?.response ?? err);
      }
    }
    // Telegram global limit ~30 msg/s — sleep 50ms (~20/s) to stay safe
    await new Promise((r) => setTimeout(r, 50));
  }

  await ctx.reply(
    `✅ Diffusion terminée.\n\n` +
      `• Reçus : <b>${success}</b>\n` +
      `• Échecs : <b>${failed}</b>\n` +
      `• Bloqués (retirés) : <b>${blockedCount}</b>`,
    { parse_mode: "HTML" },
  );
}
