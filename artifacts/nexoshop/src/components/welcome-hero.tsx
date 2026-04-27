import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Quote, Users, ShoppingBag } from "lucide-react";
import { useGetAllReviews } from "@workspace/api-client-react";

type PublicStats = {
  totalUsers: number;
  totalOrders: number;
  totalReviews: number;
  averageRating: number;
};

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
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-secondary/40 border border-primary/30 flex items-center justify-center text-sm font-bold shrink-0">
      {initial}
    </div>
  );
}

type ReviewItem = {
  id: number;
  firstName: string;
  productName: string | null;
  rating: number;
  comment: string;
  imageUrl: string | null;
};

function ReviewCard({ r }: { r: ReviewItem }) {
  return (
    <div className="relative bg-background/50 backdrop-blur-sm border border-border/40 rounded-xl p-3 w-[320px] shrink-0 mx-2">
      <Quote className="absolute top-1.5 right-2 w-3.5 h-3.5 text-primary/30" />
      <div className="flex gap-2.5 items-start">
        <Avatar name={r.firstName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-xs truncate">{r.firstName}</span>
            <Stars rating={r.rating} size={11} />
          </div>
          {r.productName && (
            <p className="text-[10px] text-muted-foreground mb-0.5 truncate">
              sur {r.productName}
            </p>
          )}
          <p className="text-xs text-foreground/90 line-clamp-2 leading-snug">
            « {r.comment} »
          </p>
        </div>
      </div>
    </div>
  );
}

export function WelcomeHero() {
  const { data: reviewsData } = useGetAllReviews();
  const { data: stats } = useQuery<PublicStats>({
    queryKey: ["/api/public/stats"],
    queryFn: async () => {
      const res = await fetch("/api/public/stats");
      if (!res.ok) throw new Error("stats failed");
      return res.json();
    },
    staleTime: 60_000,
  });

  // Only keep reviews with a non-empty comment.
  const reviews = useMemo<ReviewItem[]>(() => {
    const items = reviewsData?.items ?? [];
    return items
      .filter((r) => (r.comment ?? "").trim().length > 0)
      .slice(0, 30)
      .map((r) => ({
        id: r.id,
        firstName: r.firstName,
        productName: r.productName,
        rating: r.rating,
        comment: r.comment ?? "",
        imageUrl: r.imageUrl,
      }));
  }, [reviewsData]);

  // Duplicate the list so the marquee can loop seamlessly.
  const loopReviews = useMemo(() => [...reviews, ...reviews], [reviews]);

  // Animation duration scales with number of items (~5s per card).
  const durationSec = Math.max(20, reviews.length * 5);

  const total = stats?.totalReviews ?? reviewsData?.total ?? 0;
  const average = stats?.averageRating ?? reviewsData?.average ?? 0;
  const totalUsers = stats?.totalUsers ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-secondary/20 border border-primary/20 p-6 shadow-lg">
      <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/30 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-secondary/30 rounded-full blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header: welcome */}
        <div>
          <h2 className="text-2xl font-bold leading-tight">
            Bienvenue sur <span className="text-primary">Nexo Shop</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vos abonnements, clés &amp; outils IA livrés en quelques secondes.
          </p>
        </div>

        {/* Continuous right→left marquee of reviews */}
        {reviews.length > 0 && (
          <div className="relative -mx-6 overflow-hidden">
            {/* Edge fade masks */}
            <div className="absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
            <div
              className="flex w-max"
              style={{
                animation: `nexo-marquee ${durationSec}s linear infinite`,
              }}
            >
              {loopReviews.map((r, i) => (
                <ReviewCard key={`${r.id}-${i}`} r={r} />
              ))}
            </div>
          </div>
        )}

        {/* Footer stats: orders, users, rating */}
        <div className="flex items-center justify-center gap-4 sm:gap-8 pt-2 border-t border-border/30">
          <Stat
            icon={<ShoppingBag className="w-4 h-4 text-primary" />}
            value={totalOrders.toLocaleString("fr-FR")}
            label="commandes"
          />
          <div className="w-px h-8 bg-border/40" />
          <Stat
            icon={<Users className="w-4 h-4 text-primary" />}
            value={totalUsers.toLocaleString("fr-FR")}
            label="utilisateurs"
          />
          <div className="w-px h-8 bg-border/40" />
          <Stat
            icon={<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
            value={`${average.toFixed(1)}/5`}
            label={`${total} avis`}
          />
        </div>
      </div>

      <style>{`
        @keyframes nexo-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-0">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-base font-bold tabular-nums">{value}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
