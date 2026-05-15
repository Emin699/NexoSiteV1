import { db, sumupRechargesTable, usersTable, transactionsTable } from "@workspace/db";
import { and, eq, sql, gt } from "drizzle-orm";
import { retrieveSumupCheckout, isSumupConfigured } from "./sumup-client";
import { logger } from "./logger";
import { notify, safeNotify } from "./notifier";

const POLL_INTERVAL_MS = 60_000; // toutes les 60 secondes

async function processPendingCheckout(record: typeof sumupRechargesTable.$inferSelect): Promise<void> {
  try {
    const checkout = await retrieveSumupCheckout(record.checkoutId);

    if (checkout.status === "PENDING") return; // pas encore payé, on réessaie plus tard

    if (checkout.status !== "PAID") {
      // FAILED ou autre statut terminal → on marque dans la DB
      await db
        .update(sumupRechargesTable)
        .set({ status: checkout.status })
        .where(
          and(
            eq(sumupRechargesTable.id, record.id),
            eq(sumupRechargesTable.status, "PENDING"),
          )
        );
      logger.info({ checkoutId: record.checkoutId, status: checkout.status }, "sumup-watcher: checkout non-payé, marqué");
      return;
    }

    // Statut PAID → crédit atomique
    const credited = Number(record.amountEur);

    const result = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(sumupRechargesTable)
        .set({ status: "PAID", capturedAt: new Date() })
        .where(
          and(
            eq(sumupRechargesTable.id, record.id),
            eq(sumupRechargesTable.status, "PENDING"),
          )
        )
        .returning();

      if (claimed.length === 0) return null; // déjà traité (race condition)

      const [updated] = await tx
        .update(usersTable)
        .set({
          balance: sql`${usersTable.balance} + ${credited.toFixed(2)}`,
          totalRecharged: sql`${usersTable.totalRecharged} + ${credited.toFixed(2)}`,
        })
        .where(eq(usersTable.id, record.userId))
        .returning();

      await tx.insert(transactionsTable).values({
        userId: record.userId,
        type: "credit",
        amount: credited.toFixed(2),
        description: `Recharge SumUp (${credited.toFixed(2)}€) — auto sumup:${record.checkoutId}`,
      });

      return updated;
    });

    if (!result) return; // déjà crédité

    logger.info(
      { userId: record.userId, eur: credited, checkoutId: record.checkoutId },
      "sumup-watcher: auto-crédit SumUp"
    );

    safeNotify(async () => {
      notify.rechargeCompleted({
        user: { id: result.id, username: result.username, firstName: result.firstName },
        method: "sumup",
        amount: credited,
        newBalance: Number(result.balance),
      });
    });

  } catch (err) {
    logger.error({ err, checkoutId: record.checkoutId }, "sumup-watcher: erreur traitement checkout");
  }
}

let timer: ReturnType<typeof setInterval> | null = null;
let started = false;

export function startSumupWatcher(): void {
  if (started || !isSumupConfigured()) {
    if (!isSumupConfigured()) {
      logger.info("sumup-watcher: désactivé (SumUp non configuré)");
    }
    return;
  }
  started = true;

  const tick = async () => {
    try {
      const pending = await db
        .select()
        .from(sumupRechargesTable)
        .where(eq(sumupRechargesTable.status, "PENDING"))
        .limit(50);

      if (pending.length === 0) return;

      logger.debug({ count: pending.length }, "sumup-watcher: vérification des checkouts en attente");

      for (const record of pending) {
        await processPendingCheckout(record);
      }
    } catch (err) {
      logger.error({ err }, "sumup-watcher: erreur tick");
    }
  };

  timer = setInterval(tick, POLL_INTERVAL_MS);
  setTimeout(() => { void tick(); }, 10_000); // premier check 10s après le boot
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "sumup-watcher: démarré");
}

export function stopSumupWatcher(): void {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}
