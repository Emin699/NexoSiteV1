import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, usersTable, transactionsTable, paypalRechargesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import { isPayPalConfigured, getClientId, createOrder, captureOrder } from "../lib/paypal-client.js";
import { notify, safeNotify } from "../lib/notifier.js";

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
    // Persist server-side link orderId -> userId/amount/status. Required by /capture.
    await db.insert(paypalRechargesTable).values({
      userId: req.userId!,
      orderId: order.id,
      amountEur: parsed.data.amountEur.toFixed(2),
      status: "created",
    });
    safeNotify(async () => {
      const [me] = await db.select({ id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName }).from(usersTable).where(eq(usersTable.id, req.userId!));
      if (me) notify.rechargeStarted({ user: me, method: "paypal", amount: parsed.data.amountEur });
    });
    res.json({ orderId: order.id, amountEur: parsed.data.amountEur });
  } catch (err) {
    req.log.error({ err }, "PayPal createOrder failed");
    res.status(502).json({ error: "PayPal indisponible — réessaie" });
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

  const orderId = parsed.data.orderId;

  // Find the server-side record we created at /create. This is the binding
  // between this orderId and (userId, amount). No record => reject.
  const [record] = await db
    .select()
    .from(paypalRechargesTable)
    .where(eq(paypalRechargesTable.orderId, orderId));

  if (!record) {
    res.status(404).json({ error: "Ordre PayPal inconnu" });
    return;
  }
  if (record.userId !== req.userId) {
    res.status(403).json({ error: "Cet ordre n'appartient pas à votre compte" });
    return;
  }
  if (record.status === "captured") {
    const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    res.json({
      success: true,
      alreadyCaptured: true,
      newBalance: u ? Number(u.balance) : null,
      amountEur: Number(record.amountEur),
    });
    return;
  }

  try {
    const { status, amountEur } = await captureOrder(orderId);
    if (status !== "COMPLETED") {
      res.status(400).json({ error: "Capture non complétée" });
      return;
    }

    // Server validates that PayPal-reported amount matches the amount we recorded.
    if (Math.abs(amountEur - Number(record.amountEur)) > 0.01) {
      req.log.error({ orderId, expected: record.amountEur, actual: amountEur }, "PayPal amount mismatch");
      res.status(400).json({ error: "Montant capturé incohérent" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      // Atomic claim: only one transaction can flip created → captured.
      const claimed = await tx
        .update(paypalRechargesTable)
        .set({ status: "captured", capturedAt: new Date() })
        .where(and(
          eq(paypalRechargesTable.id, record.id),
          eq(paypalRechargesTable.status, "created"),
        ))
        .returning();

      if (claimed.length === 0) {
        throw Object.assign(new Error("Ordre déjà capturé"), { status: 409 });
      }

      const [updated] = await tx
        .update(usersTable)
        .set({
          balance: sql`${usersTable.balance} + ${amountEur.toFixed(2)}`,
          totalRecharged: sql`${usersTable.totalRecharged} + ${amountEur.toFixed(2)}`,
        })
        .where(eq(usersTable.id, req.userId!))
        .returning();
      if (!updated) throw Object.assign(new Error("User not found"), { status: 404 });

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "credit",
        amount: amountEur.toFixed(2),
        description: `Recharge PayPal (${amountEur.toFixed(2)}€) — paypal:${orderId}`,
      });

      return {
        newBalance: Number(updated.balance),
        amountEur,
        username: updated.username,
        firstName: updated.firstName,
      };
    });

    safeNotify(() => {
      notify.rechargeCompleted({
        user: { id: req.userId!, username: result.username, firstName: result.firstName },
        method: "paypal",
        amount: result.amountEur,
        newBalance: result.newBalance,
      });
    });
    res.json({ success: true, newBalance: result.newBalance, amountEur: result.amountEur });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    req.log.error({ err, orderId }, "PayPal capture failed");
    if (e.status !== 409) {
      safeNotify(async () => {
        const [me] = await db.select({ id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName }).from(usersTable).where(eq(usersTable.id, req.userId!));
        if (me) notify.rechargeFailed({ user: me, method: "paypal", reason: e.message ?? "capture failed" });
      });
    }
    if (e.status === 409) {
      res.status(409).json({ error: "Ordre déjà capturé" });
    } else {
      res.status(502).json({ error: "PayPal indisponible — réessaie" });
    }
  }
});

export default router;
