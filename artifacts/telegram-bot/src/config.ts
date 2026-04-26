import path from "node:path";
import { fileURLToPath } from "node:url";

function required(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Variable d'environnement manquante: ${name}`);
  }
  return v.trim();
}

function optional(name: string, fallback: string): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

const here = path.dirname(fileURLToPath(import.meta.url));

export const config = {
  botToken: required("TELEGRAM_BOT_TOKEN"),

  // CSV of admin telegram IDs allowed to use /sayall
  adminIds: required("TELEGRAM_ADMIN_ID")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  shopUrl: required("TELEGRAM_SHOP_URL"),
  channelUrl: required("TELEGRAM_CHANNEL_URL"),
  proofsUrl: required("TELEGRAM_PROOFS_URL"),

  shopButtonText: optional("TELEGRAM_SHOP_BUTTON_TEXT", "🛒 Accéder à la boutique"),
  channelButtonText: optional("TELEGRAM_CHANNEL_BUTTON_TEXT", "📢 Canal"),
  proofsButtonText: optional("TELEGRAM_PROOFS_BUTTON_TEXT", "✅ Preuves"),

  welcomeText: optional(
    "TELEGRAM_WELCOME_TEXT",
    "🛍️ <b>NexoShop</b> — Votre boutique de produits numériques.\n\n" +
      "Profitez de nos meilleures offres et accédez à la boutique via le bouton ci-dessous.",
  ),

  // Either an http(s) URL or an absolute path to a local image. Defaults to bundled logo.
  logo: optional("TELEGRAM_LOGO_URL", path.resolve(here, "logo.png")),
};

export function isAdmin(telegramId: number | undefined): boolean {
  if (telegramId === undefined) return false;
  return config.adminIds.includes(String(telegramId));
}
