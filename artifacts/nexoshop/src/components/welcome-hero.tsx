import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Star, Quote, Users, ShoppingBag, Shield, Zap, Headphones, ThumbsUp } from "lucide-react";
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

const BADGES = [
  { icon: Shield,     label: "Paiement sécurisé" },
  { icon: Zap,        label: "Livraison automatique" },
  { icon: Headphones, label: "Support rapide" },
];

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

  const total    = stats?.totalReviews ?? reviewsData?.total ?? 0;
  const average  = stats?.averageRating ?? reviewsData?.average ?? 0;
  const totalUsers  = stats?.totalUsers ?? 0;
  const totalOrders = stats?.totalOrders ?? 0;

  const statCards = [
    {
      icon: ShoppingBag,
      value: totalOrders > 0 ? `${totalOrders.toLocaleString("fr-FR")}+` : "250+",
      label: "Commandes",
      color: "#a855f7",
    },
    {
      icon: Users,
      value: totalUsers > 0 ? `${totalUsers.toLocaleString("fr-FR")}+` : "120+",
      label: "Clients",
      color: "#06b6d4",
    },
    {
      icon: ThumbsUp,
      value: total > 0 ? `${average.toFixed(1)}/5` : "4.9/5",
      label: "Satisfaction",
      color: "#fbbf24",
    },
  ];

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 shadow-lg"
      style={{
        background: "linear-gradient(135deg, #0a0015 0%, #06060f 50%, #000a14 100%)",
        border: "1px solid rgba(168,85,247,0.22)",
        boxShadow: "0 8px 32px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* Glow blobs */}
      <div
        className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "rgba(168,85,247,0.18)", filter: "blur(60px)" }}
      />
      <div
        className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full pointer-events-none"
        style={{ background: "rgba(6,182,212,0.14)", filter: "blur(60px)" }}
      />

      <div className="relative z-10 flex flex-col gap-4">
        {/* Badge pills */}
        <div className="flex flex-wrap gap-2">
          {BADGES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
              style={{
                background: "rgba(168,85,247,0.1)",
                border: "1px solid rgba(168,85,247,0.25)",
                color: "#c084fc",
              }}
            >
              <Icon size={11} strokeWidth={2.5} />
              {label}
            </div>
          ))}
        </div>

        {/* Title + description */}
        <div>
          <h2 className="text-2xl font-black leading-tight tracking-tight">
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
          <p className="text-sm mt-1 leading-relaxed" style={{ color: "#8b7ea8" }}>
            Une plateforme rapide, sécurisée et automatisée pour accéder à tes services préférés.
          </p>
        </div>

        {/* Stat cards */}
        <div className="flex gap-2.5">
          {statCards.map(({ icon: Icon, value, label, color }) => (
            <div
              key={label}
              className="flex-1 flex flex-col items-center gap-1.5 rounded-xl py-3 px-2 text-center"
              style={{
                background: "rgba(255,255,255,0.04)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(168,85,247,0.18)",
              }}
            >
              <Icon size={18} color={color} strokeWidth={2} />
              <span className="text-lg font-extrabold tabular-nums leading-none" style={{ color: "#e2d9f3" }}>{value}</span>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: "#7a6d9a" }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Marquee reviews */}
        {reviews.length > 0 && (
          <div className="relative -mx-5 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 w-14 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to right, #06060f, transparent)" }}
            />
            <div
              className="absolute inset-y-0 right-0 w-14 z-10 pointer-events-none"
              style={{ background: "linear-gradient(to left, #06060f, transparent)" }}
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
