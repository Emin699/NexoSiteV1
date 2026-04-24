import { db, cryptoRechargesTable, usersTable, transactionsTable } from "@workspace/db";
import { and, eq, sql, gt } from "drizzle-orm";
import { listIncomingTxs } from "./ltc-verify";
import { logger } from "./logger";

const POLL_INTERVAL_MS = 30_000;
const MIN_CONFIRMATIONS = 1;

type Pending = typeof cryptoRechargesTable.$inferSelect;

async function tryCreditMatch(pending: Pending, txHash: string, ltcReceived: number): Promise<boolean> {
  // STRICT match in satoshis. The per-session amount is unique-jittered at
  // creation time, so the on-chain amount must equal the expected amount
  // exactly (±1 satoshi for explorer rounding) to attribute the tx.
  const expectedSat = Math.round(Number(pending.amountLtc) * 1e8);
  const receivedSat = Math.round(ltcReceived * 1e8);
  if (Math.abs(receivedSat - expectedSat) > 1) return false;

  const credited = Number(pending.amountEur);

  try {
    await db.transaction(async (tx) => {
      // Atomic claim: only flip pending → verified if still pending.
      const claimed = await tx
        .update(cryptoRechargesTable)
        .set({ status: "verified", txHash, verifiedAt: new Date() })
        .where(and(
          eq(cryptoRechargesTable.id, pending.id),
          eq(cryptoRechargesTable.status, "pending"),
        ))
        .returning();
      if (claimed.length === 0) {
        throw Object.assign(new Error("already-claimed"), { silent: true });
      }

      await tx
        .update(usersTable)
        .set({
          balance: sql`${usersTable.balance} + ${credited.toFixed(2)}`,
          totalRecharged: sql`${usersTable.totalRecharged} + ${credited.toFixed(2)}`,
        })
        .where(eq(usersTable.id, pending.userId));

      await tx.insert(transactionsTable).values({
        userId: pending.userId,
        type: "credit",
        amount: credited.toFixed(2),
        description: `Recharge Litecoin (${credited.toFixed(2)}€) — auto tx ${txHash.slice(0, 12)}…`,
      });
    });
    logger.info({ userId: pending.userId, eur: credited, txHash }, "auto-credited LTC recharge");
    return true;
  } catch (err) {
    const e = err as { code?: string; cause?: { code?: string }; silent?: boolean };
    const code = e.code ?? e.cause?.code;
    if (code === "23505") {
      // Unique constraint on tx_hash — this tx was already used elsewhere.
      // Mark this pending session as cancelled to avoid retry loops.
      await db
        .update(cryptoRechargesTable)
        .set({ status: "tx_already_used" })
        .where(eq(cryptoRechargesTable.id, pending.id));
      logger.warn({ pendingId: pending.id, txHash }, "tx already used by another recharge");
      return false;
    }
    if (!e.silent) {
      logger.error({ err, pendingId: pending.id }, "auto-credit failed");
    }
    return false;
  }
}

async function processPending(pending: Pending): Promise<void> {
  const result = await listIncomingTxs(pending.address);
  if (!result.ok) {
    logger.debug({ pendingId: pending.id, reason: result.reason }, "watcher: skip (explorer error)");
    return;
  }
  // Look at txs received AFTER this session was created, with enough confirmations.
  // Txs with timestamp=0 (unconfirmed/missing) are excluded — fail-closed.
  const createdSec = Math.floor(pending.createdAt.getTime() / 1000) - 5;
  const candidates = result.txs
    .filter((t) => t.confirmations >= MIN_CONFIRMATIONS && t.timestamp > 0 && t.timestamp >= createdSec)
    .sort((a, b) => b.ltcReceived - a.ltcReceived);

  for (const cand of candidates) {
    const ok = await tryCreditMatch(pending, cand.txHash, cand.ltcReceived);
    if (ok) return;
  }
}

let started = false;
let timer: ReturnType<typeof setInterval> | null = null;

export function startRechargeWatcher(): void {
  if (started) return;
  started = true;

  const tick = async () => {
    try {
      const now = new Date();
      // Mark expired ones first.
      await db
        .update(cryptoRechargesTable)
        .set({ status: "expired" })
        .where(and(
          eq(cryptoRechargesTable.status, "pending"),
          sql`${cryptoRechargesTable.expiresAt} < ${now}`,
        ));

      const pendings = await db
        .select()
        .from(cryptoRechargesTable)
        .where(and(
          eq(cryptoRechargesTable.status, "pending"),
          gt(cryptoRechargesTable.expiresAt, now),
        ))
        .limit(50);

      if (pendings.length === 0) return;

      // Group by address to minimize explorer hits.
      const byAddress = new Map<string, Pending[]>();
      for (const p of pendings) {
        const arr = byAddress.get(p.address) ?? [];
        arr.push(p);
        byAddress.set(p.address, arr);
      }

      for (const [address, group] of byAddress.entries()) {
        const result = await listIncomingTxs(address);
        if (!result.ok) continue;
        // FIFO: oldest pending first → fairness when amounts coincide (rare
        // thanks to jitter, but kept as a deterministic tie-breaker).
        const ordered = [...group].sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
        );
        for (const pending of ordered) {
          // FAIL-CLOSED temporal guard: tx must have a confirmed block timestamp
          // ≥ session.createdAt - 5s. Txs with timestamp=0 (unconfirmed/missing)
          // are skipped to prevent attributing unrelated history to fresh sessions.
          const createdSec = Math.floor(pending.createdAt.getTime() / 1000) - 5;
          const candidates = result.txs
            .filter((t) => t.confirmations >= MIN_CONFIRMATIONS && t.timestamp > 0 && t.timestamp >= createdSec)
            .sort((a, b) => a.timestamp - b.timestamp);
          for (const cand of candidates) {
            const ok = await tryCreditMatch(pending, cand.txHash, cand.ltcReceived);
            if (ok) break;
          }
        }
      }
    } catch (err) {
      logger.error({ err }, "recharge watcher tick failed");
    }
  };

  timer = setInterval(tick, POLL_INTERVAL_MS);
  // Fire-and-forget first run shortly after boot.
  setTimeout(() => { void tick(); }, 5_000);
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "recharge watcher started");
}

export function stopRechargeWatcher(): void {
  if (timer) clearInterval(timer);
  timer = null;
  started = false;
}

// Silence unused-import noise: processPending kept for future per-session calls.
void processPending;
