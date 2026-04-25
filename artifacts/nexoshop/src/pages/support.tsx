import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetMyTickets,
  useCreateTicket,
  getGetMyTicketsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
  HelpCircle,
  Package,
  MessageCircle,
  Plus,
  Inbox,
  Dumbbell,
  Box,
} from "lucide-react";
import { toast } from "sonner";

type Category = "support" | "question" | "replacement";
type Subcategory = "basic_fit" | "other";

const CATEGORY_META: Record<Category, { label: string; icon: typeof Headphones; color: string; bg: string }> = {
  support: {
    label: "Support",
    icon: Headphones,
    color: "text-primary",
    bg: "bg-primary/15",
  },
  question: {
    label: "Question",
    icon: HelpCircle,
    color: "text-cyan-400",
    bg: "bg-cyan-500/15",
  },
  replacement: {
    label: "Remplacement",
    icon: Package,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
  },
};

function statusLabel(status: string): { label: string; cls: string } {
  if (status === "closed") return { label: "Fermé", cls: "bg-zinc-700 text-zinc-300" };
  return { label: "Ouvert", cls: "bg-emerald-600/30 text-emerald-300 border border-emerald-500/30" };
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function Support() {
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const { data: tickets, isLoading } = useGetMyTickets({
    query: { queryKey: getGetMyTicketsQueryKey() },
  });
  const createTicket = useCreateTicket();

  const [openCategory, setOpenCategory] = useState<Category | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [form, setForm] = useState<Record<string, string>>({});

  const resetForm = () => {
    setOpenCategory(null);
    setSubcategory(null);
    setSubject("");
    setBody("");
    setForm({});
  };

  const onSubmit = async () => {
    if (!openCategory) return;
    if (openCategory === "replacement" && !subcategory) {
      toast.error("Choisis le type de produit");
      return;
    }
    if (!subject.trim()) {
      toast.error("Donne un sujet à ton ticket");
      return;
    }
    if (!body.trim()) {
      toast.error("Décris ta demande");
      return;
    }

    let formData: Record<string, string> | undefined;
    if (openCategory === "replacement") {
      formData = { ...form };
      const required =
        subcategory === "basic_fit"
          ? ["nom", "prenom", "dateNaissance", "dateAchat", "dernierMail"]
          : ["nomProduit", "identifiant"];
      for (const k of required) {
        if (!formData[k] || !formData[k].trim()) {
          toast.error("Remplis tous les champs requis");
          return;
        }
      }
    }

    try {
      const created = await createTicket.mutateAsync({
        data: {
          category: openCategory,
          subcategory: openCategory === "replacement" ? subcategory! : null,
          subject: subject.trim(),
          body: body.trim(),
          ...(formData ? { formData } : {}),
        },
      });
      toast.success("Ticket envoyé !");
      resetForm();
      qc.invalidateQueries({ queryKey: getGetMyTicketsQueryKey() });
      navigate(`/support/${created.id}`);
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      toast.error(msg ?? "Erreur lors de la création");
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <div className="p-4 flex items-center gap-3">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full bg-white/5 hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Support & Tickets</h1>
      </div>

      <div className="flex-1 px-4 pb-24 space-y-6">
        {/* Action buttons */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Créer un ticket
          </p>
          <div className="grid gap-3">
            {(Object.keys(CATEGORY_META) as Category[]).map((cat) => {
              const meta = CATEGORY_META[cat];
              const Icon = meta.icon;
              const description =
                cat === "support"
                  ? "Pour toute demande au staff"
                  : cat === "question"
                  ? "Une question, un doute"
                  : "Remplacement de produit";
              return (
                <button
                  key={cat}
                  onClick={() => setOpenCategory(cat)}
                  className="w-full text-left rounded-2xl border border-border/40 bg-card/50 hover:bg-card/80 transition p-4 flex items-center gap-4"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${meta.bg}`}>
                    <Icon className={`w-6 h-6 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold leading-tight">{meta.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Tickets list */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Mes tickets
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse" />
              ))}
            </div>
          ) : !tickets || tickets.length === 0 ? (
            <Card className="bg-card/40 border-border/40">
              <CardContent className="p-8 flex flex-col items-center text-center gap-2">
                <Inbox className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucun ticket pour l'instant.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => {
                const meta = CATEGORY_META[t.category as Category] ?? CATEGORY_META.support;
                const Icon = meta.icon;
                const st = statusLabel(t.status);
                const needsRead = t.status !== "closed" && t.lastReplyBy === "admin";
                return (
                  <Link key={t.id} href={`/support/${t.id}`}>
                    <div className="rounded-xl border border-border/40 bg-card/40 hover:bg-card/70 transition p-3 flex items-center gap-3 cursor-pointer">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${meta.bg}`}>
                        <Icon className={`w-5 h-5 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium text-sm truncate">{t.subject}</p>
                          {needsRead && (
                            <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_6px_rgba(167,139,250,0.9)] shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className={st.cls + " text-[10px] px-1.5 py-0"}>
                            {st.label}
                          </Badge>
                          <span>#{t.id}</span>
                          <span>·</span>
                          <span>{formatDate(t.updatedAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create dialog */}
      <Dialog open={!!openCategory} onOpenChange={(o) => !o && resetForm()}>
        <DialogContent className="max-w-md max-h-[92dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {openCategory && (
                <>
                  {(() => {
                    const Icon = CATEGORY_META[openCategory].icon;
                    return <Icon className={`w-5 h-5 ${CATEGORY_META[openCategory].color}`} />;
                  })()}
                  {CATEGORY_META[openCategory].label}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {openCategory === "replacement"
                ? "Décris précisément le problème — plus tu donnes d'infos, plus vite on traite."
                : openCategory === "support"
                ? "Une demande pour le staff de NexoShop."
                : "Pose ta question, on te répond au plus vite."}
            </DialogDescription>
          </DialogHeader>

          {openCategory === "replacement" && !subcategory ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">Quel type de produit ?</p>
              <button
                onClick={() => setSubcategory("basic_fit")}
                className="w-full rounded-xl border border-border/40 bg-card/50 hover:bg-card/80 transition p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-orange-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold leading-tight">Basic Fit</p>
                  <p className="text-xs text-muted-foreground">Abonnement salle</p>
                </div>
              </button>
              <button
                onClick={() => setSubcategory("other")}
                className="w-full rounded-xl border border-border/40 bg-card/50 hover:bg-card/80 transition p-4 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Box className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold leading-tight">Autre produit</p>
                  <p className="text-xs text-muted-foreground">Streaming, Musique, IA…</p>
                </div>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {openCategory === "replacement" && subcategory === "basic_fit" && (
                <div className="space-y-2 rounded-xl bg-orange-500/5 border border-orange-500/20 p-3">
                  <p className="text-xs font-semibold text-orange-300 uppercase tracking-wider">
                    Infos Basic Fit (obligatoires)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Nom</Label>
                      <Input
                        value={form.nom ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Prénom</Label>
                      <Input
                        value={form.prenom ?? ""}
                        onChange={(e) => setForm((f) => ({ ...f, prenom: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Date de naissance</Label>
                    <Input
                      type="date"
                      value={form.dateNaissance ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, dateNaissance: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Date d'achat</Label>
                    <Input
                      type="date"
                      value={form.dateAchat ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, dateAchat: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Dernier mail fourni</Label>
                    <Input
                      type="email"
                      placeholder="ex : prenom.nom@gmail.com"
                      value={form.dernierMail ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, dernierMail: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {openCategory === "replacement" && subcategory === "other" && (
                <div className="space-y-2 rounded-xl bg-blue-500/5 border border-blue-500/20 p-3">
                  <p className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                    Infos produit (obligatoires)
                  </p>
                  <div>
                    <Label className="text-xs">Nom du produit</Label>
                    <Input
                      placeholder="ex : Netflix Premium"
                      value={form.nomProduit ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, nomProduit: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Identifiant / email du compte</Label>
                    <Input
                      value={form.identifiant ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, identifiant: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Autres infos (optionnel)</Label>
                    <Input
                      placeholder="N° commande, mot de passe précédent…"
                      value={form.autresInfos ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, autresInfos: e.target.value }))}
                    />
                  </div>
                  <p className="text-[11px] text-blue-300/80 mt-1">
                    Pense à bien détailler ta demande dans le message ci-dessous.
                  </p>
                </div>
              )}

              <div>
                <Label className="text-xs">Sujet</Label>
                <Input
                  placeholder={
                    openCategory === "replacement"
                      ? "ex : Remplacement Basic Fit"
                      : openCategory === "support"
                      ? "ex : Question sur ma cagnotte"
                      : "ex : Comment ça marche ?"
                  }
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div>
                <Label className="text-xs">Message</Label>
                <Textarea
                  rows={5}
                  placeholder="Décris ta demande en détail…"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  maxLength={5000}
                />
                <p className="text-[10px] text-muted-foreground mt-1 text-right">
                  {body.length}/5000
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            {openCategory === "replacement" && subcategory && (
              <Button variant="ghost" onClick={() => setSubcategory(null)} className="mr-auto">
                <ChevronLeft className="w-4 h-4 mr-1" /> Retour
              </Button>
            )}
            <Button variant="outline" onClick={resetForm}>
              Annuler
            </Button>
            {(openCategory !== "replacement" || subcategory) && (
              <Button
                onClick={onSubmit}
                disabled={createTicket.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                {createTicket.isPending ? "Envoi…" : "Envoyer"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
