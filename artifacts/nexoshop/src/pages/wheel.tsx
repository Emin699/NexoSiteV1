import { useState } from "react";
import { Link } from "wouter";
import {
  useGetWheelStatus,
  useSpinWheel,
  getGetWheelStatusQueryKey,
  getGetMeQueryKey,
  getGetMeStatsQueryKey,
  getGetWalletQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  Zap,
  Sparkles,
  RefreshCw,
  Wallet,
  Percent,
  Tag,
  Star,
  Music2,
  XCircle,
  Trophy,
  Gift,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

type Reward = {
  type: string;
  label: string;
  probability: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  segment: string;
};

const REWARDS: Reward[] = [
  {
    type: "nothing",
    label: "Rien",
    probability: 60.2,
    icon: XCircle,
    color: "text-muted-foreground",
    bg: "bg-muted/20",
    segment: "#1f2937",
  },
  {
    type: "balance_05",
    label: "+0.50€",
    probability: 12,
    icon: Wallet,
    color: "text-green-400",
    bg: "bg-green-500/10",
    segment: "#065f46",
  },
  {
    type: "balance_1",
    label: "+1.00€",
    probability: 8,
    icon: Wallet,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    segment: "#047857",
  },
  {
    type: "balance_5",
    label: "+5.00€",
    probability: 4,
    icon: Wallet,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
    segment: "#0891b2",
  },
  {
    type: "coupon_percent",
    label: "Coupon -5%",
    probability: 5,
    icon: Percent,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    segment: "#1d4ed8",
  },
  {
    type: "coupon_amount",
    label: "Coupon -3€",
    probability: 3.5,
    icon: Tag,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10",
    segment: "#4338ca",
  },
  {
    type: "free_spin",
    label: "Relance gratuite",
    probability: 3,
    icon: RefreshCw,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    segment: "#7c3aed",
  },
  {
    type: "points_10",
    label: "+10 pts",
    probability: 2,
    icon: Star,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
    segment: "#b45309",
  },
  {
    type: "points_50",
    label: "+50 pts",
    probability: 1.5,
    icon: Trophy,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    segment: "#c2410c",
  },
  {
    type: "deezer",
    label: "Deezer Premium",
    probability: 0.5,
    icon: Music2,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    segment: "#be185d",
  },
  {
    type: "points_100",
    label: "+100 pts",
    probability: 0.3,
    icon: Gift,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
    segment: "#9f1239",
  },
];

function buildConicGradient() {
  let deg = 0;
  const parts: string[] = [];
  for (const r of REWARDS) {
    const slice = (r.probability / 100) * 360;
    parts.push(`${r.segment} ${deg}deg ${deg + slice}deg`);
    deg += slice;
  }
  if (deg < 360) parts.push(`#1f2937 ${deg}deg 360deg`);
  return `conic-gradient(from 0deg, ${parts.join(", ")})`;
}

const CONIC = buildConicGradient();

function formatTime(hours: number | null | undefined) {
  if (!hours) return "";
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function Wheel() {
  const qc = useQueryClient();
  const { data: status, isLoading } = useGetWheelStatus();
  const spinWheel = useSpinWheel();

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ reward: string; message: string; rewardType: string } | null>(null);
  const [rotation, setRotation] = useState(0);

  const totalSpins = (status?.freeSpins ?? 0) + (status?.canSpin && (status?.freeSpins ?? 0) === 0 ? 1 : 0);
  const availableSpins = status?.canSpin ? Math.max(1, status?.freeSpins ?? 1) : (status?.freeSpins ?? 0);

  const handleSpin = async () => {
    if (!status?.canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    const newRotation = rotation + 1800 + Math.random() * 360;
    setRotation(newRotation);

    try {
      const res = await spinWheel.mutateAsync();
      setTimeout(() => {
        setResult({ reward: res.reward, message: res.message, rewardType: res.rewardType });
        setSpinning(false);
        qc.invalidateQueries({ queryKey: getGetWheelStatusQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        qc.invalidateQueries({ queryKey: getGetMeStatsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        if (res.rewardType !== "nothing") {
          toast.success(res.message);
        } else {
          toast("Pas de chance cette fois-ci !");
        }
      }, 3000);
    } catch (e: unknown) {
      setSpinning(false);
      const msg = (e as { data?: { error?: string } })?.data?.error;
      toast.error(msg || "Aucun tour disponible");
    }
  };

  const getResultReward = () =>
    REWARDS.find((r) => {
      if (result?.rewardType === "nothing") return r.type === "nothing";
      if (result?.rewardType === "balance") return r.label === result.reward;
      if (result?.rewardType === "free_spin") return r.type === "free_spin";
      if (result?.rewardType === "points") return r.label === result.reward;
      if (result?.rewardType === "coupon_percent") return r.type === "coupon_percent";
      if (result?.rewardType === "coupon_amount") return r.type === "coupon_amount";
      if (result?.rewardType === "deezer") return r.type === "deezer";
      return false;
    }) ?? REWARDS[0];

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0a0c14]">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 relative z-10">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full bg-white/5 text-white hover:bg-white/10">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold text-white">Roue de la Destinée</h1>
      </div>

      <div className="flex-1 flex flex-col items-center p-4 gap-5 overflow-y-auto pb-8">
        {/* Background glow */}
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 bg-purple-600/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Spin counter */}
        <div className="w-full max-w-sm z-10">
          {isLoading ? (
            <div className="h-16 rounded-2xl bg-muted/20 animate-pulse" />
          ) : (
            <div className={`flex items-center justify-between rounded-2xl border px-5 py-3.5 ${
              status?.canSpin
                ? "bg-violet-500/10 border-violet-500/30"
                : "bg-muted/20 border-border/40"
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  status?.canSpin ? "bg-violet-500/20" : "bg-muted/30"
                }`}>
                  <RefreshCw className={`w-5 h-5 ${status?.canSpin ? "text-violet-400" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tours disponibles</p>
                  <p className={`text-2xl font-black leading-none ${status?.canSpin ? "text-violet-300" : "text-muted-foreground"}`}>
                    {availableSpins}
                  </p>
                </div>
              </div>
              {!status?.canSpin && status?.hoursUntilNextSpin ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-mono font-bold">{formatTime(status.hoursUntilNextSpin)}</span>
                </div>
              ) : status?.canSpin ? (
                <span className="text-xs text-violet-400 font-medium">Prêt !</span>
              ) : null}
            </div>
          )}
        </div>

        {/* Wheel */}
        <div className="relative w-64 h-64 z-10 shrink-0">
          <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="#a855f7">
              <path d="M12 2L2 22H22L12 2Z" />
            </svg>
          </div>

          <div
            className="w-full h-full rounded-full border-4 border-violet-500/40 overflow-hidden shadow-[0_0_40px_rgba(168,85,247,0.35)] relative"
            style={{
              transition: spinning ? "transform 3s cubic-bezier(0.15, 0.85, 0.35, 1)" : "none",
              transform: `rotate(${rotation}deg)`,
              background: CONIC,
            }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-[#0a0c14] rounded-full border-2 border-violet-500/30 z-10 flex items-center justify-center shadow-inner">
              <div className="w-5 h-5 bg-violet-500 rounded-full shadow-[0_0_12px_rgba(168,85,247,0.8)]" />
            </div>
          </div>
        </div>

        {/* Result or Spin Button */}
        <div className="w-full max-w-sm z-10">
          {result ? (
            <Card className="bg-card/90 border-violet-500/40 animate-in zoom-in-95 duration-300 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
              <CardContent className="p-5 text-center">
                {(() => {
                  const reward = getResultReward();
                  const Icon = reward.icon;
                  return (
                    <>
                      <div className={`w-16 h-16 mx-auto rounded-2xl ${reward.bg} flex items-center justify-center mb-3`}>
                        <Icon className={`w-8 h-8 ${reward.color}`} />
                      </div>
                      <p className={`text-2xl font-black mb-1 ${reward.color}`}>{result.reward}</p>
                      <p className="text-sm text-muted-foreground">{result.message}</p>
                      <Button
                        className="mt-4 w-full bg-violet-600 hover:bg-violet-700 border-none"
                        onClick={() => setResult(null)}
                      >
                        Continuer
                      </Button>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          ) : (
            <Button
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-violet-600 to-pink-600 hover:opacity-90 shadow-[0_0_20px_rgba(139,92,246,0.4)] border-none rounded-2xl"
              onClick={handleSpin}
              disabled={isLoading || !status?.canSpin || spinning}
            >
              {spinning ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 animate-spin" /> En rotation...
                </span>
              ) : status?.canSpin ? (
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Lancer la Roue
                </span>
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground text-base">
                  <Clock className="w-4 h-4" /> Revenez plus tard
                </span>
              )}
            </Button>
          )}
        </div>

        {/* All Rewards List */}
        <div className="w-full max-w-sm z-10">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 text-center">
            Toutes les récompenses
          </p>
          <div className="grid grid-cols-2 gap-2">
            {REWARDS.map((reward) => {
              const Icon = reward.icon;
              return (
                <div
                  key={reward.type}
                  className={`flex items-center gap-2.5 rounded-xl border border-white/5 ${reward.bg} px-3 py-2.5`}
                >
                  <div className={`w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${reward.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold leading-tight ${reward.color}`}>{reward.label}</p>
                    <p className="text-[10px] text-muted-foreground/60">{reward.probability}%</p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-center text-[10px] text-muted-foreground/50 mt-3">
            1 tour gratuit toutes les 24h · Tours bonus via avis ou achats
          </p>
        </div>
      </div>
    </div>
  );
}
