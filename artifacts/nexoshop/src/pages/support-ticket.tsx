import { useState, useRef, useEffect } from "react";
import { Link, useParams, useLocation } from "wouter";
import {
  useGetTicket,
  usePostTicketMessage,
  getGetTicketQueryKey,
  getGetMyTicketsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Send,
  Headphones,
  HelpCircle,
  Package,
  ShieldCheck,
  Lock,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

const CATEGORY_LABEL: Record<string, string> = {
  support: "Support",
  question: "Question",
  replacement: "Remplacement",
};

const SUBCATEGORY_LABEL: Record<string, string> = {
  basic_fit: "Basic Fit",
  other: "Autre produit",
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

export default function SupportTicketDetail() {
  const params = useParams<{ id: string }>();
  const ticketId = Number(params.id);
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [reply, setReply] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading } = useGetTicket(ticketId, {
    query: {
      queryKey: getGetTicketQueryKey(ticketId),
      enabled: Number.isFinite(ticketId),
      refetchInterval: 15000,
    },
  });
  const post = usePostTicketMessage();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.messages.length]);

  const onSend = async () => {
    if (!reply.trim() || !ticket) return;
    try {
      await post.mutateAsync({ id: ticketId, data: { body: reply.trim() } });
      setReply("");
      qc.invalidateQueries({ queryKey: getGetTicketQueryKey(ticketId) });
      qc.invalidateQueries({ queryKey: getGetMyTicketsQueryKey() });
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      toast.error(msg ?? "Impossible d'envoyer");
    }
  };

  if (!Number.isFinite(ticketId)) {
    navigate("/support");
    return null;
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-12 bg-muted/30 rounded animate-pulse" />
        <div className="h-32 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Ticket introuvable.{" "}
        <Link href="/support" className="text-primary underline">
          Retour
        </Link>
      </div>
    );
  }

  const categoryLabel = CATEGORY_LABEL[ticket.category] ?? ticket.category;
  const closed = ticket.status === "closed";

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-10">
        <Link href="/support">
          <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">
            #{ticket.id} · {categoryLabel}
            {ticket.subcategory ? ` · ${SUBCATEGORY_LABEL[ticket.subcategory] ?? ticket.subcategory}` : ""}
          </p>
          <h1 className="text-base font-bold truncate">{ticket.subject}</h1>
        </div>
        <Badge
          variant="outline"
          className={
            closed
              ? "bg-zinc-700 text-zinc-300 border-zinc-600"
              : "bg-emerald-600/30 text-emerald-300 border-emerald-500/40"
          }
        >
          {closed ? "Fermé" : "Ouvert"}
        </Badge>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-32">
        {/* Form data card if replacement */}
        {ticket.formData && Object.keys(ticket.formData).length > 0 && (
          <Card className="bg-amber-500/5 border-amber-500/30">
            <CardContent className="p-3 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-1.5">
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

        {/* Messages */}
        {ticket.messages.map((m) => {
          const isAdmin = m.authorRole === "admin";
          return (
            <div
              key={m.id}
              className={`flex gap-2 ${isAdmin ? "justify-start" : "justify-end"}`}
            >
              {isAdmin && (
                <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-violet-400" />
                </div>
              )}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 ${
                  isAdmin
                    ? "bg-violet-500/15 border border-violet-500/30 rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${
                    isAdmin ? "text-violet-300" : "opacity-80"
                  }`}>
                    {m.authorName}
                  </p>
                  <p className={`text-[10px] ${isAdmin ? "text-muted-foreground" : "opacity-70"}`}>
                    {formatDate(m.createdAt)}
                  </p>
                </div>
                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
              </div>
              {!isAdmin && (
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <UserIcon className="w-4 h-4 text-primary" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      <div className="border-t border-border/40 bg-background/95 backdrop-blur p-3 fixed bottom-0 left-0 right-0 max-w-md mx-auto">
        {closed ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-2">
            <Lock className="w-4 h-4" /> Ticket fermé
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <Textarea
              rows={1}
              placeholder="Ta réponse…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              className="resize-none min-h-[42px] max-h-32"
              maxLength={5000}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
            />
            <Button
              onClick={onSend}
              disabled={post.isPending || !reply.trim()}
              size="icon"
              className="bg-violet-600 hover:bg-violet-700 shrink-0 h-[42px] w-[42px]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
