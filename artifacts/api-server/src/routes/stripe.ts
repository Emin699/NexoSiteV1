import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, usersTable, transactionsTable, stripeRechargesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth";
import {
  isStripeConfigured,
  getPublishableKey,
  createPaymentIntent,
  retrieveIntent,
} from "../lib/stripe-client.js";
import { notify, safeNotify } from "../lib/notifier.js";

const router: IRouter = Router();

router.get("/wallet/recharge/stripe/config", requireAuth, async (_req, res): Promise<void> => {
  const enabled = isStripeConfigured();
  res.json({
    enabled,
    publishableKey: enabled ? getPublishableKey() : null,
  });
});

const CreateBody = z.object({
  amountEur: z.number().min(5).max(5000),
});

router.post("/wallet/recharge/stripe/create-intent", requireAuth, async (req, res): Promise<void> => {
  if (!isStripeConfigured()) {
    res.status(503).json({ error: "Stripe n'est pas configuré sur ce serveur" });
    return;
  }
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Montant invalide (5-5000€)" });
    return;
  }
  try {
    const intent = await createPaymentIntent(parsed.data.amountEur, req.userId!);
    await db.insert(stripeRechargesTable).values({
      userId: req.userId!,
      intentId: intent.id,
      amountEur: parsed.data.amountEur.toFixed(2),
      status: "created",
    });
    safeNotify(async () => {
      const [me] = await db.select({ id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName }).from(usersTable).where(eq(usersTable.id, req.userId!));
      if (me) notify.rechargeStarted({ user: me, method: "stripe", amount: parsed.data.amountEur });
    });
    res.json({
      intentId: intent.id,
      clientSecret: intent.clientSecret,
      amountEur: parsed.data.amountEur,
    });
  } catch (err) {
    req.log.error({ err }, "Stripe createIntent failed");
    res.status(502).json({ error: "Stripe indisponible — réessaie" });
  }
});

const ConfirmBody = z.object({ intentId: z.string().min(5) });

router.post("/wallet/recharge/stripe/confirm", requireAuth, async (req, res): Promise<void> => {
  if (!isStripeConfigured()) {
    res.status(503).json({ error: "Stripe n'est pas configuré sur ce serveur" });
    return;
  }
  const parsed = ConfirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "intentId requis" });
    return;
  }
  const intentId = parsed.data.intentId;

  const [record] = await db
    .select()
    .from(stripeRechargesTable)
    .where(eq(stripeRechargesTable.intentId, intentId));

  if (!record) {
    res.status(404).json({ error: "Paiement Stripe inconnu" });
    return;
  }
  if (record.userId !== req.userId) {
    res.status(403).json({ error: "Ce paiement n'appartient pas à votre compte" });
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
    const { status, amountEur, paymentMethodType } = await retrieveIntent(intentId);
    // Transient statuses — client should poll, not show an error
    if (status === "processing" || status === "requires_action" || status === "requires_confirmation") {
      res.json({
        success: false,
        pending: true,
        status,
        amountEur: Number(record.amountEur),
      });
      return;
    }
    if (status !== "succeeded") {
      res.status(400).json({ error: `Paiement non finalisé (statut: ${status})` });
      return;
    }
    if (Math.abs(amountEur - Number(record.amountEur)) > 0.01) {
      req.log.error(
        { intentId, expected: record.amountEur, actual: amountEur },
        "Stripe amount mismatch",
      );
      res.status(400).json({ error: "Montant capturé incohérent" });
      return;
    }

    const result = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(stripeRechargesTable)
        .set({
          status: "captured",
          capturedAt: new Date(),
          paymentMethod: paymentMethodType ?? null,
        })
        .where(and(
          eq(stripeRechargesTable.id, record.id),
          eq(stripeRechargesTable.status, "created"),
        ))
        .returning();

      if (claimed.length === 0) {
        throw Object.assign(new Error("Paiement déjà capturé"), { status: 409 });
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

      const methodLabel = paymentMethodType ? ` ${paymentMethodType}` : "";
      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "credit",
        amount: amountEur.toFixed(2),
        description: `Recharge Stripe${methodLabel} (${amountEur.toFixed(2)}€) — stripe:${intentId}`,
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
        method: "stripe",
        amount: result.amountEur,
        newBalance: result.newBalance,
      });
    });
    res.json({ success: true, newBalance: result.newBalance, amountEur: result.amountEur });
  } catch (err) {
    const e = err as { status?: number; message?: string };
    req.log.error({ err, intentId }, "Stripe confirm failed");
    if (e.status !== 409) {
      safeNotify(async () => {
        const [me] = await db.select({ id: usersTable.id, username: usersTable.username, firstName: usersTable.firstName }).from(usersTable).where(eq(usersTable.id, req.userId!));
        if (me) notify.rechargeFailed({ user: me, method: "stripe", reason: e.message ?? "confirm failed" });
      });
    }
    if (e.status === 409) {
      res.status(409).json({ error: "Paiement déjà capturé" });
    } else {
      res.status(502).json({ error: "Stripe indisponible — réessaie" });
    }
  }
});

export default router;
