import { useEffect, useState, useMemo } from "react";
import { Star, Quote } from "lucide-react";
import { useGetAllReviews } from "@workspace/api-client-react";

const ROTATE_MS = 5000;

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={
            n <= Math.round(rating)
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/40"
          }
        />
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 border border-primary/30 flex items-center justify-center text-base font-bold shrink-0">
      {initial}
    </div>
  );
}

export function WelcomeHero() {
  const { data } = useGetAllReviews();
  const total = data?.total ?? 0;
  const average = data?.average ?? 0;

  // Only keep reviews with a non-empty comment for rotation.
  const reviews = useMemo(() => {
    const items = data?.items ?? [];
    return items.filter((r) => (r.comment ?? "").trim().length > 0).slice(0, 30);
  }, [data]);

  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (reviews.length <= 1) return;
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIdx((i) => (i + 1) % reviews.length);
        setFade(true);
      }, 280);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [reviews.length]);

  const current = reviews[idx];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-secondary/20 border border-primary/20 p-6 shadow-lg">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-secondary/30 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header: welcome + global rating */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold leading-tight">
              Bienvenue sur <span className="text-primary">Nexo Shop</span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Vos abonnements, clés &amp; outils IA livrés en quelques secondes.
            </p>
          </div>
          {total > 0 && (
            <div className="flex flex-col items-end shrink-0">
              <div className="flex items-center gap-1.5">
                <Stars rating={average} size={15} />
                <span className="text-sm font-bold">{average.toFixed(1)}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {total} avis vérifiés
              </span>
            </div>
          )}
        </div>

        {/* Rotating review card */}
        {current && (
          <div
            className={`relative bg-background/40 backdrop-blur-sm border border-border/40 rounded-xl p-4 transition-all duration-300 ease-out ${
              fade ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            }`}
            key={current.id}
          >
            <Quote className="absolute top-2 right-3 w-4 h-4 text-primary/30" />
            <div className="flex gap-3 items-start">
              <Avatar name={current.firstName} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm truncate">
                    {current.firstName}
                  </span>
                  <Stars rating={current.rating} size={12} />
                </div>
                {current.productName && (
                  <p className="text-[11px] text-muted-foreground mb-1.5 truncate">
                    sur {current.productName}
                  </p>
                )}
                <p className="text-sm text-foreground/90 line-clamp-2 leading-snug">
                  « {current.comment} »
                </p>
              </div>
              {current.imageUrl && (
                <img
                  src={current.imageUrl}
                  alt="photo de l'avis"
                  className="w-14 h-14 rounded-lg object-cover border border-border/40 shrink-0 hidden sm:block"
                />
              )}
            </div>

            {/* Pagination dots */}
            {reviews.length > 1 && (
              <div className="flex justify-center gap-1 mt-3">
                {reviews.slice(0, Math.min(reviews.length, 8)).map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all duration-300 ${
                      i === idx % Math.min(reviews.length, 8)
                        ? "w-4 bg-primary"
                        : "w-1 bg-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
