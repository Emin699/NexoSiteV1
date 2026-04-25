import { useState, useMemo } from "react";
import {
  useAdminGetTickets,
  useAdminGetTicket,
  useAdminPostTicketMessage,
  useAdminUpdateTicketStatus,
  getAdminGetTicketsQueryKey,
  getAdminGetTicketQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Headphones,
  HelpCircle,
  Package,
  Inbox,
  Send,
  Lock,
  Unlock,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORY_META: Record<string, { label: string; icon: typeof Headphones; color: string; bg: string }> = {
  support: { label: "Support", icon: Headphones, color: "text-primary", bg: "bg-primary/15" },
  question: { label: "Question", icon: HelpCircle, color: "text-cyan-400", bg: "bg-cyan-500/15" },
  replacement: { label: "Remplacement", icon: Package, color: "text-amber-400", bg: "bg-amber-500/15" },
};

const SUBCATEGORY_LABEL: Record<string, string> = {
  basic_fit: "Basic Fit",
  other: "Autre",
};

const FORM_LABELS: Record<string, string> = {
  nom: "Nom",
  prenom: "Prénom",
  dateNaissance: "Date de naissance",
  dateAchat: "Date d'achat",
  dernierMail: "Dernier mail",
  nomProduit: "Nom du produit",
  identifiant: "Identifiant",
  autresInfos: "Autres infos",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function AdminTickets() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "closed" | "all">("open");
  const [openId, setOpenId] = useState<number | null>(null);

  const params = filter === "all" ? undefined : { status: filter };
  const { data: tickets, isLoading } = useAdminGetTickets(params, {
    query: { queryKey: getAdminGetTicketsQueryKey(params), refetchInterval: 20000 },
  });

  const sortedTickets = useMemo(() => {
    if (!tickets) return [];
    return [...tickets].sort((a, b) => {
      // Open + last reply by user (waiting for admin) first
      const aPending = a.status !== "closed" && a.lastReplyBy === "user" ? 0 : 1;
      const bPending = b.status !== "closed" && b.lastReplyBy === "user" ? 0 : 1;
      if (aPending !== bPending) return aPending - bPending;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [tickets]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["open", "closed", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className={filter === f ? "bg-primary hover:bg-primary/90" : ""}
          >
            {f === "open" ? "Ouverts" : f === "closed" ? "Fermés" : "Tous"}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : sortedTickets.length === 0 ? (
        <Card className="bg-card/40 border-border/40">
          <CardContent className="p-8 flex flex-col items-center text-center gap-2">
            <Inbox className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucun ticket.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedTickets.map((t) => {
            const meta = CATEGORY_META[t.category] ?? CATEGORY_META.support;
            const Icon = meta.icon;
            const closed = t.status === "closed";
            const pending = !closed && t.lastReplyBy === "user";
            return (
              <button
                key={t.id}
                onClick={() => setOpenId(t.id)}
                className={`w-full text-left rounded-xl border p-3 flex items-center gap-3 transition ${
                  pending
                    ? "bg-primary/10 border-primary/40 hover:bg-primary/15"
                    : "bg-card/40 border-border/40 hover:bg-card/70"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${meta.bg}`}>
                  <Icon className={`w-5 h-5 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{t.subject}</p>
                    {pending && (
                      <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(167,139,250,0.9)] shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5 flex-wrap">
                    <Badge
                      variant="outline"
                      className={
                        closed
                          ? "bg-zinc-700 text-zinc-300 border-zinc-600 text-[10px] px-1.5 py-0"
                          : "bg-emerald-600/30 text-emerald-300 border-emerald-500/40 text-[10px] px-1.5 py-0"
                      }
                    >
                      {closed ? "Fermé" : "Ouvert"}
                    </Badge>
                    <span>#{t.id}</span>
                    <span>·</span>
                    <span className="truncate">{t.userName}</span>
                    {t.subcategory && (
                      <>
                        <span>·</span>
                        <span>{SUBCATEGORY_LABEL[t.subcategory] ?? t.subcategory}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{formatDate(t.updatedAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <AdminTicketDialog
        ticketId={openId}
        onClose={() => setOpenId(null)}
        onChanged={() =>
          qc.invalidateQueries({ queryKey: getAdminGetTicketsQueryKey(params) })
        }
      />
    </div>
  );
}

function AdminTicketDialog({
  ticketId,
  onClose,
  onChanged,
}: {
  ticketId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [reply, setReply] = useState("");
  const id = ticketId ?? 0;
  const { data: ticket, isLoading } = useAdminGetTicket(id, {
    query: {
      queryKey: getAdminGetTicketQueryKey(id),
      enabled: !!ticketId,
      refetchInterval: ticketId ? 15000 : false,
    },
  });
  const post = useAdminPostTicketMessage();
  const updateStatus = useAdminUpdateTicketStatus();

  const refresh = () => {
    qc.invalidateQueries({ queryKey: getAdminGetTicketQueryKey(id) });
    onChanged();
  };

  const send = async () => {
    if (!reply.trim() || !ticket) return;
    try {
      await post.mutateAsync({ id, data: { body: reply.trim() } });
      setReply("");
      refresh();
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      toast.error(msg ?? "Erreur d'envoi");
    }
  };

  const toggleStatus = async () => {
    if (!ticket) return;
    const next = ticket.status === "closed" ? "open" : "closed";
    try {
      await updateStatus.mutateAsync({ id, data: { status: next } });
      toast.success(next === "closed" ? "Ticket fermé" : "Ticket rouvert");
      refresh();
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      toast.error(msg ?? "Erreur");
    }
  };

  return (
    <Dialog open={!!ticketId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[92dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b border-border/40 shrink-0">
          <DialogTitle className="text-sm">
            {ticket ? (
              <>
                #{ticket.id} · {CATEGORY_META[ticket.category]?.label ?? ticket.category}
                {ticket.subcategory ? ` · ${SUBCATEGORY_LABEL[ticket.subcategory] ?? ticket.subcategory}` : ""}
              </>
            ) : (
              "Ticket"
            )}
          </DialogTitle>
          {ticket && (
            <p className="text-xs text-muted-foreground">
              {ticket.subject} · {ticket.userName} ({ticket.userEmail ?? "—"})
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {isLoading || !ticket ? (
            <div className="h-32 bg-muted/20 animate-pulse rounded" />
          ) : (
            <>
              {ticket.formData && Object.keys(ticket.formData).length > 0 && (
                <Card className="bg-amber-500/5 border-amber-500/30">
                  <CardContent className="p-3 space-y-1">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-1">
                      Infos transmises
                    </p>
                    <div className="grid gap-1 text-xs">
                      {Object.entries(ticket.formData).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-muted-foreground">{FORM_LABELS[k] ?? k}</span>
                          <span className="font-mono text-amber-200 truncate">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {ticket.messages.map((m) => {
                const isAdmin = m.authorRole === "admin";
                return (
                  <div key={m.id} className={`flex gap-2 ${isAdmin ? "justify-end" : "justify-start"}`}>
                    {!isAdmin && (
                      <div className="w-7 h-7 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
                        <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    )}
                    <div
                      className={`max-w-[78%] rounded-2xl px-3 py-2 ${
                        isAdmin
                          ? "bg-primary/80 text-white rounded-tr-sm"
                          : "bg-card/80 border border-border/40 rounded-tl-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-[10px] font-bold uppercase tracking-wider ${
                          isAdmin ? "opacity-90" : "text-cyan-300"
                        }`}>
                          {m.authorName}
                        </p>
                        <p className={`text-[10px] ${isAdmin ? "opacity-70" : "text-muted-foreground"}`}>
                          {formatDate(m.createdAt)}
                        </p>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                    {isAdmin && (
                      <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>

        <div className="p-3 border-t border-border/40 shrink-0 space-y-2">
          {ticket && (
            <>
              <Textarea
                rows={2}
                placeholder={ticket.status === "closed" ? "Ticket fermé" : "Ta réponse…"}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                disabled={ticket.status === "closed"}
                className="resize-none text-sm"
                maxLength={5000}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleStatus}
                  disabled={updateStatus.isPending}
                  className="flex-1"
                >
                  {ticket.status === "closed" ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 mr-1" /> Rouvrir
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 mr-1" /> Fermer
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  onClick={send}
                  disabled={post.isPending || !reply.trim() || ticket.status === "closed"}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Send className="w-3.5 h-3.5 mr-1" />
                  {post.isPending ? "Envoi…" : "Envoyer"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
