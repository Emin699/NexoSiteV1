import { Router, type IRouter } from "express";
import {
  db,
  ticketsTable,
  ticketMessagesTable,
  usersTable,
} from "@workspace/db";
import { eq, desc, and, ne } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/userAuth";
import {
  CreateTicketBody,
  PostTicketMessageBody,
  AdminPostTicketMessageBody,
  AdminUpdateTicketStatusBody,
  GetTicketResponse as TicketDetailZ,
  AdminGetTicketResponse as AdminTicketDetailZ,
  GetMyTicketsResponseItem as TicketSummaryZ,
  AdminGetTicketsResponseItem as AdminTicketSummaryZ,
} from "@workspace/api-zod";

const router: IRouter = Router();

const ALLOWED_CATEGORIES = ["support", "question", "replacement"] as const;
const ALLOWED_SUBCATEGORIES = ["basic_fit", "other"] as const;

type Category = (typeof ALLOWED_CATEGORIES)[number];
type Subcategory = (typeof ALLOWED_SUBCATEGORIES)[number];

function parseFormData(raw: string | null): Record<string, string> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === "object" && !Array.isArray(v)) {
      const out: Record<string, string> = {};
      for (const [k, val] of Object.entries(v)) {
        if (typeof val === "string") out[k] = val;
      }
      return out;
    }
  } catch {
    /* noop */
  }
  return null;
}

function userDisplayName(u: { firstName: string | null; username: string | null } | undefined | null): string {
  if (!u) return "Utilisateur";
  if (u.username) return `@${u.username}`;
  return u.firstName ?? "Utilisateur";
}

async function loadDetail(ticketId: number) {
  const [t] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, ticketId));
  if (!t) return null;

  const [owner] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
      username: usersTable.username,
    })
    .from(usersTable)
    .where(eq(usersTable.id, t.userId));

  const messageRows = await db
    .select()
    .from(ticketMessagesTable)
    .where(eq(ticketMessagesTable.ticketId, ticketId))
    .orderBy(ticketMessagesTable.createdAt);

  const authorIds = Array.from(new Set(messageRows.map((m) => m.authorId)));
  const authorMap = new Map<number, { firstName: string | null; username: string | null }>();
  for (const aid of authorIds) {
    const [u] = await db
      .select({ firstName: usersTable.firstName, username: usersTable.username })
      .from(usersTable)
      .where(eq(usersTable.id, aid));
    if (u) authorMap.set(aid, u);
  }

  const messages = messageRows.map((m) => ({
    id: m.id,
    authorRole: m.authorRole,
    authorName:
      m.authorRole === "admin"
        ? "Support NexoShop"
        : userDisplayName(authorMap.get(m.authorId)),
    body: m.body,
    createdAt: m.createdAt.toISOString(),
  }));

  return { ticket: t, owner, messages };
}

// ===== USER ROUTES =====

router.get("/tickets", requireAuth, async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(ticketsTable)
    .where(eq(ticketsTable.userId, req.userId!))
    .orderBy(desc(ticketsTable.updatedAt));

  res.json(
    rows.map((t) =>
      TicketSummaryZ.parse({
        id: t.id,
        category: t.category,
        subcategory: t.subcategory,
        subject: t.subject,
        status: t.status,
        lastReplyBy: t.lastReplyBy,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }),
    ),
  );
});

router.post("/tickets", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateTicketBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Données invalides" });
    return;
  }
  const { category, subcategory, subject, body, formData } = parsed.data;

  if (!ALLOWED_CATEGORIES.includes(category as Category)) {
    res.status(400).json({ error: "Catégorie inconnue" });
    return;
  }
  if (subcategory && !ALLOWED_SUBCATEGORIES.includes(subcategory as Subcategory)) {
    res.status(400).json({ error: "Sous-catégorie inconnue" });
    return;
  }
  if (category === "replacement" && !subcategory) {
    res.status(400).json({ error: "Sous-catégorie requise pour un remplacement" });
    return;
  }

  const subjectClean = subject.trim().slice(0, 200);
  const bodyClean = body.trim().slice(0, 5000);
  if (!subjectClean || !bodyClean) {
    res.status(400).json({ error: "Sujet et message requis" });
    return;
  }

  const created = await db.transaction(async (tx) => {
    const [t] = await tx
      .insert(ticketsTable)
      .values({
        userId: req.userId!,
        category,
        subcategory: subcategory ?? null,
        subject: subjectClean,
        status: "open",
        formData: formData ? JSON.stringify(formData) : null,
        lastReplyBy: "user",
      })
      .returning();
    await tx.insert(ticketMessagesTable).values({
      ticketId: t.id,
      authorId: req.userId!,
      authorRole: "user",
      body: bodyClean,
    });
    return t;
  });

  const detail = await loadDetail(created.id);
  if (!detail) {
    res.status(500).json({ error: "Erreur création ticket" });
    return;
  }
  res.status(201).json(
    TicketDetailZ.parse({
      id: detail.ticket.id,
      category: detail.ticket.category,
      subcategory: detail.ticket.subcategory,
      subject: detail.ticket.subject,
      status: detail.ticket.status,
      formData: parseFormData(detail.ticket.formData),
      lastReplyBy: detail.ticket.lastReplyBy,
      createdAt: detail.ticket.createdAt.toISOString(),
      updatedAt: detail.ticket.updatedAt.toISOString(),
      messages: detail.messages,
    }),
  );
});

router.get("/tickets/:id", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }
  const detail = await loadDetail(id);
  if (!detail || detail.ticket.userId !== req.userId!) {
    res.status(404).json({ error: "Ticket introuvable" });
    return;
  }
  res.json(
    TicketDetailZ.parse({
      id: detail.ticket.id,
      category: detail.ticket.category,
      subcategory: detail.ticket.subcategory,
      subject: detail.ticket.subject,
      status: detail.ticket.status,
      formData: parseFormData(detail.ticket.formData),
      lastReplyBy: detail.ticket.lastReplyBy,
      createdAt: detail.ticket.createdAt.toISOString(),
      updatedAt: detail.ticket.updatedAt.toISOString(),
      messages: detail.messages,
    }),
  );
});

router.post("/tickets/:id/messages", requireAuth, async (req, res): Promise<void> => {
  const id = Number(req.params["id"]);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }
  const parsed = PostTicketMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Message invalide" });
    return;
  }
  const bodyClean = parsed.data.body.trim().slice(0, 5000);
  if (!bodyClean) {
    res.status(400).json({ error: "Message vide" });
    return;
  }

  const [t] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
  if (!t || t.userId !== req.userId!) {
    res.status(404).json({ error: "Ticket introuvable" });
    return;
  }
  if (t.status === "closed") {
    res.status(403).json({ error: "Ce ticket est fermé" });
    return;
  }

  await db.transaction(async (tx) => {
    await tx.insert(ticketMessagesTable).values({
      ticketId: id,
      authorId: req.userId!,
      authorRole: "user",
      body: bodyClean,
    });
    await tx
      .update(ticketsTable)
      .set({ updatedAt: new Date(), lastReplyBy: "user" })
      .where(eq(ticketsTable.id, id));
  });

  const detail = await loadDetail(id);
  if (!detail) {
    res.status(404).json({ error: "Ticket introuvable" });
    return;
  }
  res.status(201).json(
    TicketDetailZ.parse({
      id: detail.ticket.id,
      category: detail.ticket.category,
      subcategory: detail.ticket.subcategory,
      subject: detail.ticket.subject,
      status: detail.ticket.status,
      formData: parseFormData(detail.ticket.formData),
      lastReplyBy: detail.ticket.lastReplyBy,
      createdAt: detail.ticket.createdAt.toISOString(),
      updatedAt: detail.ticket.updatedAt.toISOString(),
      messages: detail.messages,
    }),
  );
});

// ===== ADMIN ROUTES =====

router.get(
  "/admin/tickets",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const rawStatus = String(req.query["status"] ?? "all");
    if (!["open", "closed", "all"].includes(rawStatus)) {
      res.status(400).json({ error: "Statut invalide" });
      return;
    }
    const where =
      rawStatus === "all"
        ? undefined
        : rawStatus === "open"
        ? and(ne(ticketsTable.status, "closed"))
        : eq(ticketsTable.status, rawStatus);

    const rows = where
      ? await db.select().from(ticketsTable).where(where).orderBy(desc(ticketsTable.updatedAt))
      : await db.select().from(ticketsTable).orderBy(desc(ticketsTable.updatedAt));

    const userIds = Array.from(new Set(rows.map((r) => r.userId)));
    const userMap = new Map<
      number,
      { id: number; email: string | null; firstName: string | null; username: string | null }
    >();
    for (const uid of userIds) {
      const [u] = await db
        .select({
          id: usersTable.id,
          email: usersTable.email,
          firstName: usersTable.firstName,
          username: usersTable.username,
        })
        .from(usersTable)
        .where(eq(usersTable.id, uid));
      if (u) userMap.set(uid, u);
    }

    res.json(
      rows.map((t) => {
        const u = userMap.get(t.userId);
        return AdminTicketSummaryZ.parse({
          id: t.id,
          userId: t.userId,
          userEmail: u?.email ?? null,
          userName: userDisplayName(u),
          category: t.category,
          subcategory: t.subcategory,
          subject: t.subject,
          status: t.status,
          lastReplyBy: t.lastReplyBy,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        });
      }),
    );
  },
);

router.get(
  "/admin/tickets/:id",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    const detail = await loadDetail(id);
    if (!detail) {
      res.status(404).json({ error: "Ticket introuvable" });
      return;
    }
    res.json(
      AdminTicketDetailZ.parse({
        id: detail.ticket.id,
        userId: detail.ticket.userId,
        userEmail: detail.owner?.email ?? null,
        userName: userDisplayName(detail.owner),
        category: detail.ticket.category,
        subcategory: detail.ticket.subcategory,
        subject: detail.ticket.subject,
        status: detail.ticket.status,
        formData: parseFormData(detail.ticket.formData),
        lastReplyBy: detail.ticket.lastReplyBy,
        createdAt: detail.ticket.createdAt.toISOString(),
        updatedAt: detail.ticket.updatedAt.toISOString(),
        messages: detail.messages,
      }),
    );
  },
);

router.post(
  "/admin/tickets/:id/messages",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    const parsed = PostTicketMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Message invalide" });
      return;
    }
    const bodyClean = parsed.data.body.trim().slice(0, 5000);
    if (!bodyClean) {
      res.status(400).json({ error: "Message vide" });
      return;
    }
    const [t] = await db.select().from(ticketsTable).where(eq(ticketsTable.id, id));
    if (!t) {
      res.status(404).json({ error: "Ticket introuvable" });
      return;
    }
    if (t.status === "closed") {
      res.status(403).json({ error: "Ce ticket est fermé" });
      return;
    }

    await db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: ticketsTable.status })
        .from(ticketsTable)
        .where(eq(ticketsTable.id, id))
        .for("update");
      if (!current || current.status === "closed") {
        throw new Error("TICKET_CLOSED");
      }
      await tx.insert(ticketMessagesTable).values({
        ticketId: id,
        authorId: req.userId!,
        authorRole: "admin",
        body: bodyClean,
      });
      await tx
        .update(ticketsTable)
        .set({ updatedAt: new Date(), lastReplyBy: "admin" })
        .where(eq(ticketsTable.id, id));
    }).catch((err: unknown) => {
      if (err instanceof Error && err.message === "TICKET_CLOSED") {
        res.status(403).json({ error: "Ce ticket est fermé" });
        return;
      }
      throw err;
    });
    if (res.headersSent) return;

    const detail = await loadDetail(id);
    if (!detail) {
      res.status(404).json({ error: "Ticket introuvable" });
      return;
    }
    res.status(201).json(
      AdminTicketDetailZ.parse({
        id: detail.ticket.id,
        userId: detail.ticket.userId,
        userEmail: detail.owner?.email ?? null,
        userName: userDisplayName(detail.owner),
        category: detail.ticket.category,
        subcategory: detail.ticket.subcategory,
        subject: detail.ticket.subject,
        status: detail.ticket.status,
        formData: parseFormData(detail.ticket.formData),
        lastReplyBy: detail.ticket.lastReplyBy,
        createdAt: detail.ticket.createdAt.toISOString(),
        updatedAt: detail.ticket.updatedAt.toISOString(),
        messages: detail.messages,
      }),
    );
  },
);

router.patch(
  "/admin/tickets/:id/status",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = Number(req.params["id"]);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    const parsed = AdminUpdateTicketStatusBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Statut invalide" });
      return;
    }
    const status = parsed.data.status;
    const [updated] = await db
      .update(ticketsTable)
      .set({
        status,
        closedAt: status === "closed" ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(ticketsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Ticket introuvable" });
      return;
    }
    const detail = await loadDetail(id);
    if (!detail) {
      res.status(404).json({ error: "Ticket introuvable" });
      return;
    }
    res.json(
      AdminTicketDetailZ.parse({
        id: detail.ticket.id,
        userId: detail.ticket.userId,
        userEmail: detail.owner?.email ?? null,
        userName: userDisplayName(detail.owner),
        category: detail.ticket.category,
        subcategory: detail.ticket.subcategory,
        subject: detail.ticket.subject,
        status: detail.ticket.status,
        formData: parseFormData(detail.ticket.formData),
        lastReplyBy: detail.ticket.lastReplyBy,
        createdAt: detail.ticket.createdAt.toISOString(),
        updatedAt: detail.ticket.updatedAt.toISOString(),
        messages: detail.messages,
      }),
    );
  },
);

export default router;
