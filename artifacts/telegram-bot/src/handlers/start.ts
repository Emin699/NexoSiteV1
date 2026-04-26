import { Markup } from "telegraf";
import type { Context } from "telegraf";
import { config } from "../config.js";
import { db, botSubscribersTable } from "../db.js";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function handleStart(ctx: Context): Promise<void> {
  const from = ctx.from;
  if (!from) return;

  // Persist / refresh subscriber
  await db
    .insert(botSubscribersTable)
    .values({
      telegramId: from.id,
      username: from.username ?? null,
      firstName: from.first_name ?? null,
      lastName: from.last_name ?? null,
      languageCode: from.language_code ?? null,
      blocked: false,
    })
    .onConflictDoUpdate({
      target: botSubscribersTable.telegramId,
      set: {
        username: from.username ?? null,
        firstName: from.first_name ?? null,
        lastName: from.last_name ?? null,
        languageCode: from.language_code ?? null,
        blocked: false,
        lastSeenAt: new Date(),
      },
    });

  const firstName = escapeHtml(from.first_name || "toi");
  const usernameLine = from.username
    ? `👤 <b>Pseudo :</b> @${escapeHtml(from.username)}`
    : `👤 <b>Pseudo :</b> <i>(non défini)</i>`;

  const caption =
    `👋 Salut <b>${firstName}</b> !\n\n` +
    `🆔 <b>Ton ID :</b> <code>${from.id}</code>\n` +
    `${usernameLine}\n\n` +
    `${config.welcomeText}`;

  const keyboard = Markup.inlineKeyboard([
    [Markup.button.url(config.shopButtonText, config.shopUrl)],
    [
      Markup.button.url(config.channelButtonText, config.channelUrl),
      Markup.button.url(config.proofsButtonText, config.proofsUrl),
    ],
  ]);

  const photo = config.logo.startsWith("http")
    ? config.logo
    : { source: config.logo };

  try {
    await ctx.replyWithPhoto(photo, {
      caption,
      parse_mode: "HTML",
      ...keyboard,
    });
  } catch (err) {
    // Fallback: if photo fails (missing logo, network, etc.) send text only
    console.error("[start] failed to send photo, falling back to text:", err);
    await ctx.reply(caption, {
      parse_mode: "HTML",
      ...keyboard,
    });
  }
}
