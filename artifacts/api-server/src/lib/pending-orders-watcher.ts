import { db, ordersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { logger } from "./logger";
import { notify } from "./notifier";

const HOURS = Math.max(0.1, Number(process.env.PENDING_ORDERS_INTERVAL_HOURS ?? "2"));
const INTERVAL_MS = Math.round(HOURS * 3_600_000);
const SAMPLE_SIZE = 10;

let started = false;
let bootTimer: NodeJS.Timeout | null = null;
let tickInterval: NodeJS.Timeout | null = null;

async function runOnce(): Promise<void> {
  try {
    const rows = await db
      .select({
        id: ordersTable.id,
        productName: ordersTable.productName,
        userId: ordersTable.userId,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .where(eq(ordersTable.status, "pending"))
      .orderBy(asc(ordersTable.createdAt));

    const oldestAt = rows.length > 0 ? rows[0].createdAt : null;
    notify.pendingOrdersSummary({
      pendingCount: rows.length,
      oldestAt,
      sample: rows.slice(0, SAMPLE_SIZE),
    });
  } catch (err) {
    logger.warn({ err }, "pending orders watcher tick failed");
  }
}

export function startPendingOrdersWatcher(): void {
  if (started) {
    logger.debug("pending orders watcher already started — ignoring");
    return;
  }
  if (!notify.isEnabled()) {
    logger.info("pending orders watcher disabled (notifier not configured)");
    return;
  }
  started = true;
  logger.info({ intervalHours: HOURS }, "pending orders watcher started");
  // First run after 60s so we don't spam at boot, then every INTERVAL_MS.
  bootTimer = setTimeout(() => {
    bootTimer = null;
    void runOnce();
    tickInterval = setInterval(() => void runOnce(), INTERVAL_MS);
  }, 60_000);
}

export function stopPendingOrdersWatcher(): void {
  if (bootTimer) {
    clearTimeout(bootTimer);
    bootTimer = null;
  }
  if (tickInterval) {
    clearInterval(tickInterval);
    tickInterval = null;
  }
  if (started) {
    logger.info("pending orders watcher stopped");
    started = false;
  }
}
