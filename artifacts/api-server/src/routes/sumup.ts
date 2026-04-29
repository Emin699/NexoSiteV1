import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, usersTable, transactionsTable, sumupRechargesTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/userAuth.js";
import {
  isSumupConfigured,
  createSumupCheckout,
  retrieveSumupCheckout,
} from "../lib/sumup-client.js";
import { notify, safeNotify } from "../lib/notifier.js";

const router: IRouter = Router();

// Endpoint pour vérifier si SumUp est configuré
router.get("/wallet/recharge/sumup/config", requireAuth, async (_req, res): Promise<void> => {
  const enabled = isSumupConfigured();
  res.json({ enabled });
});

const CreateBody = z.object({
  amountEur: z.number().min(5).max(5000),
});

// Créer un checkout SumUp
router.post("/wallet/recharge/sumup/create", requireAuth, async (req, res): Promise<void> => {
  if (!isSumupConfigured()) {
    res.status(503).json({ error: "SumUp n'est pas configuré sur ce serveur" });
    return;
  }
  
  const parsed = CreateBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Montant invalide (5-5000€)" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    
    const checkout = await createSumupCheckout(parsed.data.amountEur, req.userId!, user?.email || undefined);
    
    await db.insert(sumupRechargesTable).values({
      userId: req.userId!,
      checkoutId: checkout.id,
      checkoutReference: checkout.checkout_reference,
      amountEur: parsed.data.amountEur.toFixed(2),
      status: checkout.status,
    });

    safeNotify(async () => {
      if (user) notify.rechargeStarted({ user, method: "sumup", amount: parsed.data.amountEur });
    });

    res.json({
      checkoutId: checkout.id,
      amountEur: parsed.data.amountEur,
      status: checkout.status,
    });
  } catch (err) {
    req.log.error({ err }, "SumUp createCheckout failed");
    res.status(502).json({ error: "SumUp indisponible — réessaie" });
  }
});

const ConfirmBody = z.object({ checkoutId: z.string().min(5) });

// Confirmer le statut d'un checkout
router.post("/wallet/recharge/sumup/confirm", requireAuth, async (req, res): Promise<void> => {
  const parsed = ConfirmBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "checkoutId requis" });
    return;
  }
  
  const checkoutId = parsed.data.checkoutId;

  const [record] = await db
    .select()
    .from(sumupRechargesTable)
    .where(eq(sumupRechargesTable.checkoutId, checkoutId));

  if (!record) {
    res.status(404).json({ error: "Paiement SumUp inconnu" });
    return;
  }
  
  if (record.userId !== req.userId) {
    res.status(403).json({ error: "Ce paiement n'appartient pas à votre compte" });
    return;
  }

  if (record.status === "PAID") {
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
    const checkout = await retrieveSumupCheckout(checkoutId);
    const status = checkout.status; // PENDING, PAID, FAILED, EXPIRED

    if (status === "PENDING") {
      res.json({
        success: false,
        pending: true,
        status,
        amountEur: Number(record.amountEur),
      });
      return;
    }

    if (status !== "PAID") {
      res.status(400).json({ error: `Paiement non finalisé (statut SumUp: ${status})` });
      return;
    }

    // Capture du paiement dans le système
    const result = await db.transaction(async (tx) => {
      const claimed = await tx
        .update(sumupRechargesTable)
        .set({
          status: "PAID",
          capturedAt: new Date(),
        })
        .where(and(
          eq(sumupRechargesTable.id, record.id),
          eq(sumupRechargesTable.status, "PENDING"),
        ))
        .returning();

      if (claimed.length === 0) {
        throw Object.assign(new Error("Paiement déjà traité"), { status: 409 });
      }

      const [updated] = await tx
        .update(usersTable)
        .set({
          balance: sql`${usersTable.balance} + ${Number(record.amountEur).toFixed(2)}`,
          totalRecharged: sql`${usersTable.totalRecharged} + ${Number(record.amountEur).toFixed(2)}`,
        })
        .where(eq(usersTable.id, req.userId!))
        .returning();

      await tx.insert(transactionsTable).values({
        userId: req.userId!,
        type: "credit",
        amount: Number(record.amountEur).toFixed(2),
        description: `Recharge SumUp (${Number(record.amountEur).toFixed(2)}€) — sumup:${checkoutId}`,
      });

      return {
        newBalance: Number(updated.balance),
        username: updated.username,
        firstName: updated.firstName,
      };
    });

    safeNotify(() => {
      notify.rechargeCompleted({
        user: { id: req.userId!, username: result.username, firstName: result.firstName },
        method: "sumup",
        amount: Number(record.amountEur),
        newBalance: result.newBalance,
      });
    });

    res.json({ success: true, newBalance: result.newBalance, amountEur: Number(record.amountEur) });

  } catch (err) {
    const e = err as { status?: number; message?: string };
    req.log.error({ err, checkoutId }, "SumUp confirm failed");
    if (e.status === 409) {
      res.status(409).json({ error: "Paiement déjà traité" });
    } else {
      res.status(502).json({ error: "Erreur lors de la confirmation SumUp" });
    }
  }
});

export default router;
