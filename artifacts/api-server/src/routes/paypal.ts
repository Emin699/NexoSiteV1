import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, usersTable, transactionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { isPayPalConfigured, getClientId, createOrder, captureOrder } from "../lib/paypal-client.js";

const router: IRouter = Router();

router.get("/wallet/recharge/paypal/config", requireAuth, async (_req, res): Promise<void> => {
  const enabled = isPayPalConfigured();
  res.json({
    enabled,
    clientId: enabled ? getClientId() : null,
    env: process.env["PAYPAL_ENV"] === "live" ? "live" : "sandbox",
  });
});

const CreateBody = z.object({
  amountEur: z.number().min(5).max(5000),
});

router.post("/wallet/recharge/paypal/create", requireAuth, async (req, res): Promise<void> => {
  if (!isPayPalConfigured()) {
    res.status(503).json({ error: "PayPal n'est pas configuré sur ce serveur" });
    return;
  }
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Montant invalide (5-5000€)" });
    return;
  }
  try {
    const order = await createOrder(parsed.data.amountEur);
    res.json({ orderId: order.id, amountEur: parsed.data.amountEur });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PayPal error";
    req.log.error({ err }, "PayPal createOrder failed");
    res.status(500).json({ error: msg });
  }
});

const CaptureBody = z.object({ orderId: z.string().min(5) });

router.post("/wallet/recharge/paypal/capture", requireAuth, async (req, res): Promise<void> => {
  if (!isPayPalConfigured()) {
    res.status(503).json({ error: "PayPal n'est pas configuré sur ce serveur" });
    return;
  }
  const parsed = CaptureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "orderId requis" });
    return;
  }

  try {
    const { status, amountEur } = await captureOrder(parsed.data.orderId);
    if (status !== "COMPLETED") {
      res.status(400).json({ error: `Capture non complétée (status: ${status})` });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const [user] = await tx.select().from(usersTable).where(eq(usersTable.id, req.userId!));
      if (!user) throw Object.assign(new Error("User not found"), { status: 404 });

      const newBalance = Math.round((Number(user.balance) + amountEur) * 100) / 100;
      const newTotal = Math.round((Number(user.totalRecharged) + amountEur) * 100) / 100;

      await tx
        .update(usersTable)
        .set({ balance: newBalance.toFixed(2), totalRecharged: newTotal.toFixed(2) })
        .where(eq(usersTable.id, req.userId!));

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "credit",
        amount: amountEur.toFixed(2),
        description: `Recharge PayPal (${amountEur.toFixed(2)}€) — order ${parsed.data.orderId}`,
      });

      return { newBalance, amountEur };
    });

    res.json({ success: true, ...result });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "PayPal error";
    req.log.error({ err }, "PayPal capture failed");
    res.status(500).json({ error: msg });
  }
});

export default router;
