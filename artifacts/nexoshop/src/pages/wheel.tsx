import { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  useGetWheelStatus, 
  useSpinWheel,
  getGetWheelStatusQueryKey,
  getGetMeQueryKey,
  getGetMeStatsQueryKey,
  getGetWalletQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Gift, Zap, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function Wheel() {
  const queryClient = useQueryClient();
  const { data: status, isLoading } = useGetWheelStatus();
  const spinWheel = useSpinWheel();
  
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [rotation, setRotation] = useState(0);

  const handleSpin = async () => {
    if (!status?.canSpin || spinning) return;
    
    setSpinning(true);
    setResult(null);
    
    try {
      // Visual spinning effect starts
      const newRotation = rotation + 1440 + Math.random() * 360; // 4 full spins + random
      setRotation(newRotation);
      
      const res = await spinWheel.mutateAsync();
      
      // Wait for visual effect
      setTimeout(() => {
        setResult(res);
        setSpinning(false);
        queryClient.invalidateQueries({ queryKey: getGetWheelStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        
        if (res.rewardType === 'none') {
          toast("Pas de chance cette fois-ci !", { icon: "😢" });
        } else {
          toast.success(res.message, { icon: "🎉" });
        }
      }, 3000);
      
    } catch (e: any) {
      setSpinning(false);
      toast.error(e.message || "Erreur lors du lancer");
    }
  };

  const formatTimeLeft = (hours: number | null | undefined) => {
    if (!hours) return "";
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    return `${h}h ${m}m`;
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#0f1117]">
      <div className="p-4 flex items-center relative z-10">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full bg-black/20 text-white hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-white ml-2">Roue de la Destinée</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-purple-600/20 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="text-center mb-8 z-10">
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-600 mb-2">
            Tentez votre chance
          </h2>
          <p className="text-muted-foreground text-sm max-w-[280px] mx-auto">
            Gagnez du solde, des points de fidélité ou des tickets jackpot !
          </p>
        </div>

        {/* The Wheel */}
        <div className="relative w-64 h-64 md:w-80 md:h-80 mb-12 z-10">
          {/* Pointer */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 22H22L12 2Z" />
            </svg>
          </div>
          
          {/* Wheel Graphic */}
          <div 
            className="w-full h-full rounded-full border-4 border-purple-500/30 overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.4)] relative"
            style={{ 
              transition: 'transform 3s cubic-bezier(0.15, 0.85, 0.35, 1)',
              transform: `rotate(${rotation}deg)`,
              background: 'conic-gradient(from 0deg, #8b5cf6 0 45deg, #1f2937 45deg 90deg, #ec4899 90deg 135deg, #1f2937 135deg 180deg, #3b82f6 180deg 225deg, #1f2937 225deg 270deg, #f59e0b 270deg 315deg, #1f2937 315deg 360deg)'
            }}
          >
            {/* Inner circle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-background rounded-full border-2 border-white/10 z-10 flex items-center justify-center">
              <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-4 z-10">
          {result ? (
            <Card className="bg-card/80 border-purple-500/30 backdrop-blur-md animate-in zoom-in duration-300">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                  <Gift className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">Résultat</h3>
                <p className="text-lg text-white font-medium">{result.message}</p>
                <Button 
                  className="mt-6 w-full bg-muted/50 hover:bg-muted text-white"
                  onClick={() => setResult(null)}
                >
                  Continuer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Button 
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 shadow-[0_0_20px_rgba(168,85,247,0.5)] border-none rounded-xl"
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
                  <span>Revenez plus tard</span>
                )}
              </Button>
              
              {!status?.canSpin && !isLoading && status?.hoursUntilNextSpin && (
                <div className="text-center text-sm text-muted-foreground bg-card/50 py-3 rounded-lg border border-border">
                  Prochain lancer gratuit dans <span className="font-mono font-bold text-white">{formatTimeLeft(status.hoursUntilNextSpin)}</span>
                </div>
              )}
              
              <div className="text-center text-xs text-muted-foreground mt-4">
                1 lancer gratuit toutes les 24 heures.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
