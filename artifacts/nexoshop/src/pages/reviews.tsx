import { useGetAllReviews, useGetMe, getGetAllReviewsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Star, Trash2, MessageSquare, ShoppingBag, Gem } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

function StarRow({ rating, size = "w-4 h-4" }: { rating: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${size} ${s <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { data, isLoading } = useGetAllReviews();
  const { data: me } = useGetMe();
  const isAdmin = !!me?.isAdmin;
  const qc = useQueryClient();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer cet avis ? Cette action est irréversible.")) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem("nexoshop_token") || "";
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur");
      }
      toast.success("Avis supprimé");
      qc.invalidateQueries({ queryKey: getGetAllReviewsQueryKey() });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeletingId(null);
    }
  };

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const average = data?.average ?? 0;

  // Distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: items.filter((r) => r.rating === star).length,
    pct: total > 0 ? (items.filter((r) => r.rating === star).length / total) * 100 : 0,
  }));

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 animate-in fade-in">
      <div className="flex items-center gap-2 mb-1">
        <MessageSquare className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold">Avis clients</h1>
      </div>

      {/* Note totale */}
      <Card className="bg-gradient-to-br from-amber-500/10 via-card to-card border-amber-500/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-5">
            <div className="text-center shrink-0">
              <div className="text-5xl font-bold text-amber-400 leading-none">
                {average.toFixed(1)}
              </div>
              <div className="mt-2">
                <StarRow rating={Math.round(average)} size="w-4 h-4" />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1.5 uppercase">
                {total} avis
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {distribution.map(({ star, count, pct }) => (
                <div key={star} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-muted-foreground">{star}</span>
                  <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg text-sm">
          Aucun avis pour le moment
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((review) => {
            const initials = review.firstName.slice(0, 2).toUpperCase();
            const date = new Date(review.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            });
            return (
              <Card key={review.id} className="bg-card/50 border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">{review.firstName}</p>
                          <p className="text-[10px] text-muted-foreground">{date}</p>
                        </div>
                        <StarRow rating={review.rating} size="w-3.5 h-3.5" />
                      </div>
                      {review.productName && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mb-1.5">
                          <ShoppingBag className="w-3 h-3" />
                          <span className="truncate">{review.productName}</span>
                        </p>
                      )}
                      {review.comment && (
                        <p className="text-sm text-foreground/90 whitespace-pre-wrap break-words">
                          {review.comment}
                        </p>
                      )}
                      {review.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setLightbox(review.imageUrl!)}
                          className="mt-2 block rounded-lg overflow-hidden border border-border/50 hover:border-primary transition-colors"
                        >
                          <img
                            src={review.imageUrl}
                            alt="Photo de l'avis"
                            className="max-h-40 w-auto object-cover"
                          />
                        </button>
                      )}
                      {isAdmin && (
                        <div className="mt-3 flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-red-500/40 text-red-300 hover:bg-red-500/10"
                            onClick={() => handleDelete(review.id)}
                            disabled={deletingId === review.id}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            {deletingId === review.id ? "..." : "Supprimer"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Vouch channel CTA */}
      <div className="pt-4 pb-2 flex justify-center">
        <a
          href="https://t.me/+7goUQusx2_83Mzg0"
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-secondary/20 border border-primary/40 hover:border-primary hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-300"
        >
          <Gem className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold">Canal Vouch</span>
        </a>
      </div>

      {/* Lightbox image */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Aperçu avis"
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
