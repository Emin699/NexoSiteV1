import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Quote, Users, ShoppingBag, Zap } from "lucide-react";
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
          className={n <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.35), rgba(6,182,212,0.35))",
        border: "1px solid rgba(168,85,247,0.4)",
      }}
    >
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
    <div
      className="relative rounded-xl p-3 w-[300px] shrink-0 mx-2"
      style={{
        background: "rgba(168,85,247,0.06)",
        border: "1px solid rgba(168,85,247,0.18)",
        backdropFilter: "blur(8px)",
      }}
    >
      <Quote
        className="absolute top-1.5 right-2 w-3.5 h-3.5"
        style={{ color: "rgba(168,85,247,0.35)" }}
      />
      <div className="flex gap-2.5 items-start">
        <Avatar name={r.firstName} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-xs truncate" style={{ color: "#e2d9f3" }}>{r.firstName}</span>
            <Stars rating={r.rating} size={10} />
          </div>
          {r.productName && (
            <p className="text-[10px] text-muted-foreground mb-0.5 truncate">sur {r.productName}</p>
          )}
          <p className="text-xs text-foreground/80 line-clamp-2 leading-snug">« {r.comment} »</p>
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

  const loopReviews = useMemo(() => [...reviews, ...reviews], [reviews]);
  const durationSec = Math.max(25, reviews.length * 6);

  const total = stats?.totalReviews ?? reviewsData?.total ?? 0;
  const average = stats?.averageRating ?? reviewsData?.average ?? 0;
  const totalUsers = stats?.totalUsers ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
      style={{
        background: "linear-gradient(135deg, rgba(168,85,247,0.12) 0%, rgba(6,4,15,0.95) 50%, rgba(6,182,212,0.08) 100%)",
        border: "1px solid rgba(168,85,247,0.25)",
        boxShadow: "0 0 40px rgba(168,85,247,0.1), inset 0 1px 0 rgba(168,85,247,0.1)",
      }}
    >
      {/* Glow blobs */}
      <div
        className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "rgba(168,85,247,0.2)", filter: "blur(40px)" }}
      />
      <div
        className="absolute bottom-0 left-0 -ml-10 -mb-10 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: "rgba(6,182,212,0.15)", filter: "blur(40px)" }}
      />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-4 h-4" style={{ color: "#a855f7" }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "#a855f7" }}>
              Livraison instantanée · 24h/24
            </span>
          </div>
          <h2 className="text-2xl font-bold leading-tight">
            Bienvenue sur{" "}
            <span
              style={{
                background: "linear-gradient(90deg, #a855f7, #06b6d4)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              NexoShop
            </span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Abonnements, clés &amp; outils IA livrés en quelques secondes.
          </p>
        </div>

        {/* Stats row */}
        <div
          className="flex items-center justify-center gap-0 rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(168,85,247,0.18)" }}
        >
          <StatBox
            icon={<ShoppingBag className="w-4 h-4" style={{ color: "#a855f7" }} />}
            value={totalOrders.toLocaleString("fr-FR")}
            label="Commandes"
          />
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(168,85,247,0.18)" }} />
          <StatBox
            icon={<Users className="w-4 h-4" style={{ color: "#06b6d4" }} />}
            value={totalUsers.toLocaleString("fr-FR")}
            label="Utilisateurs"
          />
          <div style={{ width: 1, alignSelf: "stretch", background: "rgba(168,85,247,0.18)" }} />
          <StatBox
            icon={<Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />}
            value={`${average.toFixed(1)}/5`}
            label={`${total} Avis`}
          />
        </div>

        {/* Marquee reviews */}
        {reviews.length > 0 && (
          <div className="relative -mx-5 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 w-14 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to right, rgba(6,4,15,1), transparent)" }}
            />
            <div
              className="absolute inset-y-0 right-0 w-14 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to left, rgba(6,4,15,1), transparent)" }}
            />
            <div
              className="flex w-max"
              style={{ animation: `nexo-marquee ${durationSec}s linear infinite` }}
            >
              {loopReviews.map((r, i) => (
                <ReviewCard key={`${r.id}-${i}`} r={r} />
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes nexo-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function StatBox({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div
      className="flex-1 flex flex-col items-center gap-0.5 py-3 px-2"
      style={{ background: "rgba(168,85,247,0.04)" }}
    >
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-base font-bold tabular-nums text-foreground">{value}</span>
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
