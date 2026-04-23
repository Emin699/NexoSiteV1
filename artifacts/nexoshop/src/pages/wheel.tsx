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
  short: string;
  probability: number;
  icon: React.ElementType;
  color: string;
  bg: string;
  fill: string;
  text: string;
};

const REWARDS: Reward[] = [
  { type: "nothing",        label: "Rien",            short: "Rien",     probability: 60.2,  icon: XCircle,   color: "text-zinc-400",     bg: "bg-zinc-500/10",     fill: "#3f3f46", text: "#a1a1aa" },
  { type: "balance_05",     label: "+0.50€",          short: "0,50€",    probability: 12,    icon: Wallet,    color: "text-green-400",    bg: "bg-green-500/10",    fill: "#16a34a", text: "#fff"     },
  { type: "coupon_percent", label: "Coupon -5%",      short: "-5%",      probability: 5,     icon: Percent,   color: "text-blue-400",     bg: "bg-blue-500/10",     fill: "#2563eb", text: "#fff"     },
  { type: "balance_1",      label: "+1.00€",          short: "1€",       probability: 8,     icon: Wallet,    color: "text-emerald-400",  bg: "bg-emerald-500/10",  fill: "#059669", text: "#fff"     },
  { type: "points_10",      label: "+10 pts",         short: "10 pts",   probability: 2,     icon: Star,      color: "text-yellow-400",   bg: "bg-yellow-500/10",   fill: "#ca8a04", text: "#fff"     },
  { type: "balance_5",      label: "+5.00€",          short: "5€",       probability: 4,     icon: Wallet,    color: "text-cyan-400",     bg: "bg-cyan-500/10",     fill: "#0891b2", text: "#fff"     },
  { type: "free_spin",      label: "Relance",         short: "Relance",  probability: 3,     icon: RefreshCw, color: "text-violet-400",   bg: "bg-violet-500/10",   fill: "#7c3aed", text: "#fff"     },
  { type: "coupon_amount",  label: "Coupon -3€",      short: "-3€",      probability: 3.5,   icon: Tag,       color: "text-indigo-400",   bg: "bg-indigo-500/10",   fill: "#4f46e5", text: "#fff"     },
  { type: "points_50",      label: "+50 pts",         short: "50 pts",   probability: 1.5,   icon: Trophy,    color: "text-orange-400",   bg: "bg-orange-500/10",   fill: "#ea580c", text: "#fff"     },
  { type: "deezer",         label: "Deezer Premium",  short: "Deezer",   probability: 0.5,   icon: Music2,    color: "text-pink-400",     bg: "bg-pink-500/10",     fill: "#db2777", text: "#fff"     },
  { type: "points_100",     label: "+100 pts",        short: "100 pts",  probability: 0.3,   icon: Gift,      color: "text-rose-400",     bg: "bg-rose-500/10",     fill: "#e11d48", text: "#fff"     },
  { type: "jackpot",        label: "JACKPOT 20€",     short: "JACKPOT",  probability: 0.01,  icon: Trophy,    color: "text-amber-300",    bg: "bg-amber-500/10",    fill: "#f59e0b", text: "#000"     },
];

const SEG = 360 / REWARDS.length; // 30°
const R = 140; // wheel radius

// SVG arc for a slice
function slicePath(index: number) {
  const start = index * SEG - 90;
  const end = (index + 1) * SEG - 90;
  const x1 = R * Math.cos((start * Math.PI) / 180);
  const y1 = R * Math.sin((start * Math.PI) / 180);
  const x2 = R * Math.cos((end * Math.PI) / 180);
  const y2 = R * Math.sin((end * Math.PI) / 180);
  return `M0 0 L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

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

  const availableSpins = status?.canSpin
    ? Math.max(1, status?.freeSpins ?? 1)
    : status?.freeSpins ?? 0;

  const handleSpin = async () => {
    if (!status?.canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    try {
      const res = await spinWheel.mutateAsync();
      // Find reward index for deterministic landing
      const idx = REWARDS.findIndex((r) => {
        if (res.rewardType === "nothing") return r.type === "nothing";
        if (res.rewardType === "balance") return r.label === res.reward;
        if (res.rewardType === "free_spin") return r.type === "free_spin";
        if (res.rewardType === "points") return r.label === res.reward;
        if (res.rewardType === "coupon_percent") return r.type === "coupon_percent";
        if (res.rewardType === "coupon_amount") return r.type === "coupon_amount";
        if (res.rewardType === "deezer") return r.type === "deezer";
        if (res.rewardType === "jackpot") return r.type === "jackpot";
        return false;
      });
      const targetIdx = idx >= 0 ? idx : 0;
      // pointer at top, segment center is at idx*SEG + SEG/2 (clockwise from top)
      const targetAngle = targetIdx * SEG + SEG / 2;
      const baseFullSpins = 6 * 360;
      const currentMod = ((rotation % 360) + 360) % 360;
      const newRotation = rotation + baseFullSpins - currentMod - targetAngle;
      setRotation(newRotation);

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
      }, 4200);
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
      if (result?.rewardType === "jackpot") return r.type === "jackpot";
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

      <div className="flex-1 flex flex-col items-center p-4 gap-5 overflow-y-auto pb-8 relative">
        {/* Background glow */}
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-[120px] pointer-events-none" />
        <div className="fixed top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-pink-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Spin counter */}
        <div className="w-full max-w-sm z-10">
          {isLoading ? (
            <div className="h-16 rounded-2xl bg-muted/20 animate-pulse" />
          ) : (
            <div className={`flex items-center justify-between rounded-2xl border px-5 py-3.5 backdrop-blur-md ${
              status?.canSpin
                ? "bg-violet-500/10 border-violet-500/30 shadow-[0_0_20px_rgba(139,92,246,0.15)]"
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
                <span className="text-xs text-violet-400 font-bold uppercase tracking-wider">Prêt !</span>
              ) : null}
            </div>
          )}
        </div>

        {/* SVG Wheel */}
        <div className="relative w-[320px] h-[340px] z-10 shrink-0 flex items-center justify-center">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500/30 via-pink-500/20 to-amber-400/20 blur-2xl" />

          {/* Pointer (top) */}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]">
            <svg width="36" height="42" viewBox="0 0 36 42">
              <defs>
                <linearGradient id="pointerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#d97706" />
                </linearGradient>
              </defs>
              <path d="M18 38 L4 4 L32 4 Z" fill="url(#pointerGrad)" stroke="#78350f" strokeWidth="2" strokeLinejoin="round" />
              <circle cx="18" cy="10" r="2.5" fill="#fff8" />
            </svg>
          </div>

          {/* Wheel container */}
          <div className="relative w-[320px] h-[320px] rounded-full overflow-hidden">
            {/* Outer decorative ring with LED dots */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 p-[6px] shadow-[0_0_30px_rgba(245,158,11,0.4),inset_0_2px_8px_rgba(0,0,0,0.4)]">
              <div className="w-full h-full rounded-full bg-[#0a0c14] p-[3px] relative overflow-hidden">
                {/* The spinning wheel */}
                <svg
                  viewBox="-150 -150 300 300"
                  className="w-full h-full"
                  style={{
                    transition: spinning ? "transform 4s cubic-bezier(0.17, 0.67, 0.21, 1)" : "none",
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  {REWARDS.map((reward, i) => {
                    const midAngle = i * SEG + SEG / 2 - 90; // -90 to start from top
                    const labelR = 95;
                    const tx = labelR * Math.cos((midAngle * Math.PI) / 180);
                    const ty = labelR * Math.sin((midAngle * Math.PI) / 180);
                    // Rotate text so it reads outward from center
                    const textRotation = midAngle + 90;
                    return (
                      <g key={reward.type}>
                        <path d={slicePath(i)} fill={reward.fill} stroke="#0a0c14" strokeWidth="1.5" />
                        <text
                          x={tx}
                          y={ty}
                          fill={reward.text}
                          fontSize="11"
                          fontWeight="800"
                          textAnchor="middle"
                          dominantBaseline="middle"
                          transform={`rotate(${textRotation} ${tx} ${ty})`}
                          style={{ letterSpacing: "0.5px" }}
                        >
                          {reward.short}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {/* LED dots around outer edge (static, not rotating) */}
                <div className="absolute inset-0 pointer-events-none">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const angle = (i * 360) / 24;
                    const r = 145;
                    const x = r * Math.cos(((angle - 90) * Math.PI) / 180);
                    const y = r * Math.sin(((angle - 90) * Math.PI) / 180);
                    return (
                      <div
                        key={i}
                        className={`absolute w-2 h-2 rounded-full ${
                          spinning && i % 2 === 0 ? "bg-amber-300 shadow-[0_0_6px_rgba(252,211,77,0.9)]" : "bg-amber-500/70 shadow-[0_0_4px_rgba(245,158,11,0.6)]"
                        }`}
                        style={{
                          left: `calc(50% + ${x}px - 4px)`,
                          top: `calc(50% + ${y}px - 4px)`,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Center hub */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 w-16 h-16 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 shadow-[0_0_20px_rgba(245,158,11,0.6),inset_0_2px_4px_rgba(255,255,255,0.4)] flex items-center justify-center border-2 border-amber-200/40">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0a0c14] to-[#1a1d2e] flex items-center justify-center border border-amber-500/30">
                <Sparkles className={`w-6 h-6 text-amber-300 ${spinning ? "animate-spin" : ""}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Result or Spin Button */}
        <div className="w-full max-w-sm z-10">
          {result ? (
            <Card className="bg-card/90 border-violet-500/40 animate-in zoom-in-95 duration-300 shadow-[0_0_30px_rgba(168,85,247,0.3)]">
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
              className="w-full h-14 text-lg font-black bg-gradient-to-r from-violet-600 via-pink-600 to-amber-500 hover:opacity-90 shadow-[0_0_25px_rgba(139,92,246,0.5)] border-none rounded-2xl uppercase tracking-wider"
              onClick={handleSpin}
              disabled={isLoading || !status?.canSpin || spinning}
            >
              {spinning ? (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 animate-spin" /> En rotation...
                </span>
              ) : status?.canSpin ? (
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5" /> Lancer
                </span>
              ) : (
                <span className="flex items-center gap-2 text-muted-foreground text-base normal-case tracking-normal">
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
              const isJackpot = reward.type === "jackpot";
              return (
                <div
                  key={reward.type}
                  className={`flex items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                    isJackpot
                      ? "border-amber-400/60 bg-gradient-to-r from-amber-500/20 to-amber-600/10 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                      : `border-white/5 ${reward.bg}`
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
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
