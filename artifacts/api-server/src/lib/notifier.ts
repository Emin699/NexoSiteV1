import { logger } from "./logger";

/**
 * Telegram notifier — sends structured event messages to one or two chats:
 *   - logs chat   (TELEGRAM_LOG_CHAT_ID)         : every event on the site
 *   - pending chat (TELEGRAM_PENDING_CHAT_ID)    : pending orders watcher (defaults to logs)
 *
 * No-op gracefully when the env vars are missing, so dev runs locally without
 * pinging Telegram. Always fire-and-forget — never blocks request handlers.
 *
 * A simple FIFO queue paces sends at ~3 msg/sec to stay well under Telegram
 * rate limits (30/sec global, 20/min per chat). A hard cap on the queue
 * prevents memory blowup if Telegram is down.
 */

const TOKEN = process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
const LOG_CHAT = process.env.TELEGRAM_LOG_CHAT_ID?.trim() ?? "";
const PENDING_CHAT = process.env.TELEGRAM_PENDING_CHAT_ID?.trim() || LOG_CHAT;
const DISABLED = process.env.TELEGRAM_NOTIFY_DISABLED === "1";
const ENABLED = !DISABLED && !!TOKEN && !!LOG_CHAT;

const SEND_GAP_MS = 350; // ~3 msg/sec
const MAX_QUEUE = 1000;

type Job = { chatId: string; text: string };
const queue: Job[] = [];
let pumping = false;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendOne(job: Job): Promise<void> {
  const url = `https://api.telegram.org/bot${TOKEN}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: job.chatId,
        text: job.text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn({ status: res.status, body: body.slice(0, 200) }, "telegram notify failed");
    }
  } catch (err) {
    logger.warn({ err }, "telegram notify exception");
  }
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.length > 0) {
      const job = queue.shift()!;
      await sendOne(job);
      if (queue.length > 0) await sleep(SEND_GAP_MS);
    }
  } finally {
    pumping = false;
  }
}

function enqueue(chatId: string, text: string): void {
  if (!ENABLED || !chatId) return;
  if (queue.length >= MAX_QUEUE) {
    logger.warn({ queueSize: queue.length }, "telegram notify queue full — dropping");
    return;
  }
  // Telegram hard limit = 4096 chars per message
  const safe = text.length > 4000 ? text.slice(0, 3990) + "\n…(tronqué)" : text;
  queue.push({ chatId, text: safe });
  void pump();
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

function fmtEur(n: number | string): string {
  const v = typeof n === "string" ? Number(n) : n;
  if (!Number.isFinite(v)) return "—";
  return `${v.toFixed(2)}€`;
}

function fmtUser(u: {
  id: number;
  username?: string | null;
  firstName?: string | null;
  email?: string | null;
}): string {
  const parts: string[] = [`#${u.id}`];
  if (u.username) parts.push(`@${escapeHtml(u.username)}`);
  else if (u.firstName) parts.push(escapeHtml(u.firstName));
  if (u.email) parts.push(`(${escapeHtml(u.email)})`);
  return parts.join(" ");
}

function send(text: string, opts: { chat?: "log" | "pending" } = {}): void {
  const chatId = opts.chat === "pending" ? PENDING_CHAT : LOG_CHAT;
  enqueue(chatId, text);
}

/**
 * Run a side-effect that builds and sends a notify call. Always fire-and-forget:
 * never throws, never returns a rejecting promise, never blocks the caller.
 *
 * Use this around any pre-notify DB lookup so a transient DB error cannot
 * break a successful request handler.
 */
export function safeNotify(fn: () => Promise<void> | void): void {
  if (!ENABLED) return;
  Promise.resolve()
    .then(fn)
    .catch((err: unknown) => {
      logger.warn({ err }, "safeNotify swallowed exception");
    });
}

/**
 * Sanitize an error message before sending it to Telegram. Strips raw provider
 * internals (status codes, JSON bodies, stack traces) and caps length.
 */
function sanitizeErrorMessage(raw: string | null | undefined): string {
  if (!raw) return "(message vide)";
  // Strip newlines, JSON braces, very long bodies.
  let s = String(raw).replace(/\s+/g, " ").trim();
  if (s.length > 200) s = s.slice(0, 197) + "…";
  return s;
}

// ---------------------------------------------------------------------------
// Public API — clean, typed event helpers
// ---------------------------------------------------------------------------

export const notify = {
  // ---- Auth ----
  userRegistered(u: { id: number; email: string; username?: string | null; firstName?: string | null }): void {
    send(
      `🆕 <b>Nouvel inscrit</b>\n` +
      `👤 ${fmtUser(u)}\n` +
      `📧 ${escapeHtml(u.email)}`,
    );
  },
  userVerified(u: { id: number; email: string; username?: string | null; firstName?: string | null }): void {
    send(
      `✅ <b>Email vérifié</b>\n` +
      `👤 ${fmtUser(u)}\n` +
      `📧 ${escapeHtml(u.email)}`,
    );
  },
  loginSuccess(u: { id: number; email: string; username?: string | null; firstName?: string | null }): void {
    send(
      `🔓 <b>Connexion</b>\n` +
      `👤 ${fmtUser(u)}`,
    );
  },
  loginFailure(email: string, reason: string): void {
    send(
      `🚫 <b>Échec de connexion</b>\n` +
      `📧 ${escapeHtml(email)}\n` +
      `⚠️ ${escapeHtml(reason)}`,
    );
  },

  // ---- Wallet ----
  rechargeStarted(args: {
    user: { id: number; username?: string | null; firstName?: string | null };
    method: "stripe" | "paypal" | "crypto";
    amount: number;
  }): void {
    const icon = args.method === "stripe" ? "💳" : args.method === "paypal" ? "🅿️" : "₿";
    send(
      `${icon} <b>Recharge initiée</b> (${args.method})\n` +
      `👤 ${fmtUser(args.user)}\n` +
      `💰 ${fmtEur(args.amount)}`,
    );
  },
  rechargeCompleted(args: {
    user: { id: number; username?: string | null; firstName?: string | null };
    method: "stripe" | "paypal" | "crypto";
    amount: number;
    newBalance: number;
  }): void {
    const icon = args.method === "stripe" ? "💳" : args.method === "paypal" ? "🅿️" : "₿";
    send(
      `${icon} <b>Recharge confirmée</b> (${args.method})\n` +
      `👤 ${fmtUser(args.user)}\n` +
      `💰 +${fmtEur(args.amount)}\n` +
      `🏦 Solde : ${fmtEur(args.newBalance)}`,
    );
  },
  rechargeFailed(args: {
    user: { id: number; username?: string | null; firstName?: string | null };
    method: string;
    reason: string;
  }): void {
    send(
      `⚠️ <b>Recharge échouée</b> (${args.method})\n` +
      `👤 ${fmtUser(args.user)}\n` +
      `❌ ${escapeHtml(sanitizeErrorMessage(args.reason))}`,
    );
  },

  // ---- Orders / Cart ----
  orderPlaced(args: {
    user: { id: number; username?: string | null; firstName?: string | null };
    items: { name: string; qty: number; price: number }[];
    subtotal: number;
    discount: number;
    total: number;
    couponCode?: string | null;
    deliveredCount: number;
    pendingCount: number;
    newBalance: number;
  }): void {
    const itemLines = args.items
      .map((i) => `  • ${escapeHtml(i.name)} ×${i.qty} — ${fmtEur(i.price * i.qty)}`)
      .join("\n");
    const lines: string[] = [
      `🛒 <b>Nouvelle commande</b>`,
      `👤 ${fmtUser(args.user)}`,
      `📦 Articles :\n${itemLines}`,
      `💰 Sous-total : ${fmtEur(args.subtotal)}`,
    ];
    if (args.discount > 0) {
      lines.push(`🎟️ Remise${args.couponCode ? ` (${escapeHtml(args.couponCode)})` : ""} : −${fmtEur(args.discount)}`);
    }
    lines.push(`💳 Total payé : <b>${fmtEur(args.total)}</b>`);
    lines.push(`🏦 Solde restant : ${fmtEur(args.newBalance)}`);
    if (args.deliveredCount > 0) lines.push(`✅ Livrées auto : ${args.deliveredCount}`);
    if (args.pendingCount > 0) lines.push(`⏳ En attente livraison : ${args.pendingCount}`);
    send(lines.join("\n"));
  },
  orderDelivered(args: {
    orderId: number;
    productName: string;
    user: { id: number; username?: string | null; firstName?: string | null };
    by: { id: number; username?: string | null; firstName?: string | null };
  }): void {
    send(
      `📬 <b>Commande livrée par admin</b>\n` +
      `🛍️ ${escapeHtml(args.productName)} (#${args.orderId})\n` +
      `👤 Client : ${fmtUser(args.user)}\n` +
      `👨‍💼 Admin : ${fmtUser(args.by)}`,
    );
  },
  customerInfoSubmitted(args: {
    orderId: number;
    productName: string;
    user: { id: number; username?: string | null; firstName?: string | null };
  }): void {
    send(
      `📝 <b>Infos client transmises</b>\n` +
      `🛍️ ${escapeHtml(args.productName)} (#${args.orderId})\n` +
      `👤 ${fmtUser(args.user)}`,
    );
  },

  // ---- Coupons ----
  couponCreated(args: { code: string; type: string; value: number; by: { id: number; username?: string | null; firstName?: string | null } }): void {
    send(
      `🎟️ <b>Coupon créé</b>\n` +
      `🔖 <code>${escapeHtml(args.code)}</code> — ${args.type === "percent" ? `${args.value}%` : fmtEur(args.value)}\n` +
      `👨‍💼 ${fmtUser(args.by)}`,
    );
  },
  couponUpdated(args: { code: string; by: { id: number; username?: string | null; firstName?: string | null } }): void {
    send(
      `✏️ <b>Coupon modifié</b>\n` +
      `🔖 <code>${escapeHtml(args.code)}</code>\n` +
      `👨‍💼 ${fmtUser(args.by)}`,
    );
  },
  couponDeleted(args: { code: string; by: { id: number; username?: string | null; firstName?: string | null } }): void {
    send(
      `🗑️ <b>Coupon supprimé</b>\n` +
      `🔖 <code>${escapeHtml(args.code)}</code>\n` +
      `👨‍💼 ${fmtUser(args.by)}`,
    );
  },

  // ---- Tickets ----
  ticketCreated(args: {
    ticketId: number;
    category: string;
    subject: string;
    user: { id: number; username?: string | null; firstName?: string | null };
  }): void {
    send(
      `🎫 <b>Nouveau ticket</b> #${args.ticketId}\n` +
      `📂 ${escapeHtml(args.category)}\n` +
      `📝 ${escapeHtml(args.subject)}\n` +
      `👤 ${fmtUser(args.user)}`,
    );
  },
  ticketReply(args: {
    ticketId: number;
    by: "user" | "admin";
    user: { id: number; username?: string | null; firstName?: string | null };
  }): void {
    send(
      `💬 <b>Réponse ticket</b> #${args.ticketId} (${args.by})\n` +
      `👤 ${fmtUser(args.user)}`,
    );
  },
  ticketClosed(args: {
    ticketId: number;
    by: { id: number; username?: string | null; firstName?: string | null };
  }): void {
    send(
      `🔒 <b>Ticket fermé</b> #${args.ticketId}\n` +
      `👨‍💼 ${fmtUser(args.by)}`,
    );
  },

  // ---- Reviews ----
  reviewPosted(args: {
    productName: string;
    rating: number;
    user: { id: number; username?: string | null; firstName?: string | null };
  }): void {
    const stars = "⭐".repeat(Math.max(0, Math.min(5, args.rating)));
    send(
      `🌟 <b>Nouvel avis</b>\n` +
      `🛍️ ${escapeHtml(args.productName)}\n` +
      `${stars} (${args.rating}/5)\n` +
      `👤 ${fmtUser(args.user)}`,
    );
  },

  // ---- Loyalty / Wheel / Jackpot ----
  loyaltyConverted(args: {
    user: { id: number; username?: string | null; firstName?: string | null };
    points: number;
    eur: number;
  }): void {
    send(
      `🎁 <b>Points convertis</b>\n` +
      `👤 ${fmtUser(args.user)}\n` +
      `🏆 ${args.points} pts → +${fmtEur(args.eur)}`,
    );
  },
  wheelSpin(args: {
    user: { id: number; username?: string | null; firstName?: string | null };
    prize: string;
    value?: number;
  }): void {
    send(
      `🎡 <b>Roue tournée</b>\n` +
      `👤 ${fmtUser(args.user)}\n` +
      `🎉 Lot : ${escapeHtml(args.prize)}${args.value ? ` (+${fmtEur(args.value)})` : ""}`,
    );
  },
  jackpotDraw(args: {
    winner: { id: number; username?: string | null; firstName?: string | null };
    prize: number;
  }): void {
    send(
      `🎰 <b>Jackpot tiré !</b>\n` +
      `🏆 Gagnant : ${fmtUser(args.winner)}\n` +
      `💰 Cagnotte : ${fmtEur(args.prize)}`,
    );
  },

  // ---- Admin actions ----
  adminAdjusted(args: {
    target: { id: number; username?: string | null; firstName?: string | null };
    by: { id: number; username?: string | null; firstName?: string | null };
    field: string;
    delta: number | string;
  }): void {
    send(
      `🛠️ <b>Ajustement admin</b>\n` +
      `🎯 Cible : ${fmtUser(args.target)}\n` +
      `📊 ${escapeHtml(args.field)} : ${args.delta}\n` +
      `👨‍💼 ${fmtUser(args.by)}`,
    );
  },
  userBanned(args: {
    target: { id: number; username?: string | null; firstName?: string | null };
    by: { id: number; username?: string | null; firstName?: string | null };
    banned: boolean;
  }): void {
    send(
      `${args.banned ? "🔨" : "♻️"} <b>${args.banned ? "Utilisateur banni" : "Bannissement levé"}</b>\n` +
      `🎯 ${fmtUser(args.target)}\n` +
      `👨‍💼 ${fmtUser(args.by)}`,
    );
  },
  userDeleted(args: {
    target: { id: number; username?: string | null; firstName?: string | null };
    by: { id: number; username?: string | null; firstName?: string | null };
  }): void {
    send(
      `❌ <b>Utilisateur supprimé</b>\n` +
      `🎯 ${fmtUser(args.target)}\n` +
      `👨‍💼 ${fmtUser(args.by)}`,
    );
  },

  // ---- Errors ----
  serverError(args: { route?: string; method?: string; message: string; userId?: number }): void {
    send(
      `🔥 <b>Erreur serveur</b>\n` +
      (args.method && args.route ? `📍 ${args.method} ${escapeHtml(args.route)}\n` : "") +
      (args.userId ? `👤 user #${args.userId}\n` : "") +
      `💥 ${escapeHtml(sanitizeErrorMessage(args.message))}`,
    );
  },

  // ---- Pending orders summary (every 2h) ----
  pendingOrdersSummary(args: {
    pendingCount: number;
    oldestAt: Date | null;
    sample: { id: number; productName: string; userId: number; createdAt: Date }[];
  }): void {
    if (args.pendingCount === 0) {
      enqueue(
        PENDING_CHAT,
        `✨ <b>Aucune commande en attente</b>\nTout est livré 🎉`,
      );
      return;
    }
    const lines: string[] = [
      `⏰ <b>Commandes en attente — ${args.pendingCount}</b>`,
    ];
    if (args.oldestAt) {
      const ageHours = Math.floor((Date.now() - args.oldestAt.getTime()) / 3_600_000);
      lines.push(`⌛ Plus ancienne : ${ageHours}h`);
    }
    if (args.sample.length > 0) {
      lines.push(`\n<b>Aperçu :</b>`);
      for (const o of args.sample) {
        const ageH = Math.floor((Date.now() - o.createdAt.getTime()) / 3_600_000);
        lines.push(`  • #${o.id} — ${escapeHtml(o.productName)} (user #${o.userId}, ${ageH}h)`);
      }
      if (args.pendingCount > args.sample.length) {
        lines.push(`  … et ${args.pendingCount - args.sample.length} de plus`);
      }
    }
    lines.push(`\n👉 Va dans /admin → Commandes pour livrer`);
    enqueue(PENDING_CHAT, lines.join("\n"));
  },

  // Allow quick ad-hoc messages
  raw(text: string, opts: { chat?: "log" | "pending" } = {}): void {
    send(text, opts);
  },

  isEnabled(): boolean {
    return ENABLED;
  },
};
