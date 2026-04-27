import app from "./app";
import { logger } from "./lib/logger";
import { startRechargeWatcher } from "./lib/recharge-watcher";
import { startPendingOrdersWatcher, stopPendingOrdersWatcher } from "./lib/pending-orders-watcher";
import { notify } from "./lib/notifier";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // Start the background watcher that auto-credits confirmed LTC payments.
  startRechargeWatcher();
  // Start the periodic pending-orders summary to the Telegram notify channel.
  startPendingOrdersWatcher();
  if (notify.isEnabled()) {
    notify.raw(`🟢 <b>Serveur démarré</b> — port ${port}`);
  }
});

// Make sure we send a graceful shutdown notice if the server is stopped.
const shutdown = (signal: string) => {
  stopPendingOrdersWatcher();
  if (notify.isEnabled()) {
    notify.raw(`🔴 <b>Serveur arrêté</b> (${signal})`);
  }
  setTimeout(() => process.exit(0), 500);
};
process.once("SIGINT", () => shutdown("SIGINT"));
process.once("SIGTERM", () => shutdown("SIGTERM"));
