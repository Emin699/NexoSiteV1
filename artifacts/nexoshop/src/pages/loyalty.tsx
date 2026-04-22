import { useState } from "react";
import { Link } from "wouter";
import { 
  useGetWallet, 
  useConvertPoints,
  getGetWalletQueryKey,
  getGetMeQueryKey,
  getGetMeStatsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Coins, ArrowRight, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";

const POINTS_PER_EUR = 20;

export default function Loyalty() {
  const queryClient = useQueryClient();
  const { data: wallet, isLoading } = useGetWallet();
  const convertPoints = useConvertPoints();
  
  const [pointsToConvert, setPointsToConvert] = useState<number>(0);

  const availablePoints = wallet?.loyaltyPoints || 0;
  const maxEur = Math.floor(availablePoints / POINTS_PER_EUR);
  const potentialEur = pointsToConvert / POINTS_PER_EUR;

  const handleConvert = async () => {
    if (pointsToConvert <= 0 || pointsToConvert > availablePoints) return;
    
    try {
      const res = await convertPoints.mutateAsync({ data: { points: pointsToConvert } });
      if (res.success) {
        toast.success(`Conversion réussie : +${res.eurEarned.toFixed(2)}€`, { icon: "💶" });
        setPointsToConvert(0);
        queryClient.invalidateQueries({ queryKey: getGetWalletQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMeStatsQueryKey() });
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la conversion");
    }
  };

  const handleSliderChange = (value: number[]) => {
    // Snap to blocks of POINTS_PER_EUR
    const blocks = Math.floor(value[0] / POINTS_PER_EUR);
    setPointsToConvert(blocks * POINTS_PER_EUR);
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <div className="p-4 flex items-center border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold ml-2">Points de Fidélité</h1>
      </div>

      <div className="p-4 space-y-6 animate-in fade-in">
        {/* Balance */}
        <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/5 border-yellow-500/30">
          <CardContent className="p-6 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mb-3">
              <Coins className="w-6 h-6 text-yellow-500" />
            </div>
            <div className="text-sm text-muted-foreground font-medium mb-1">Vos Points</div>
            <div className="text-4xl font-mono font-black text-yellow-500 mb-2">
              {isLoading ? "..." : availablePoints}
            </div>
            <div className="text-xs bg-background/50 px-2 py-1 rounded border border-yellow-500/20">
              {POINTS_PER_EUR} points = 1.00€
            </div>
          </CardContent>
        </Card>

        {/* Conversion Calculator */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Convertir en Solde</h3>
          
          <Card className="bg-card border-border/50">
            <CardContent className="p-5 space-y-6">
              
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground">Points à convertir</span>
                  <span className="font-mono font-bold text-xl text-yellow-500">{pointsToConvert}</span>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
                <div className="flex flex-col text-right">
                  <span className="text-sm text-muted-foreground">Solde reçu</span>
                  <span className="font-mono font-bold text-xl text-primary">+{potentialEur.toFixed(2)}€</span>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <Slider 
                  defaultValue={[0]} 
                  max={Math.floor(availablePoints / POINTS_PER_EUR) * POINTS_PER_EUR} 
                  step={POINTS_PER_EUR}
                  value={[pointsToConvert]}
                  onValueChange={handleSliderChange}
                  className="py-4"
                  disabled={availablePoints < POINTS_PER_EUR}
                />
                
                <div className="flex justify-between gap-2">
                  <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setPointsToConvert(0)}>
                    Min
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 text-xs" 
                    onClick={() => setPointsToConvert(Math.floor(availablePoints / POINTS_PER_EUR) * POINTS_PER_EUR)}
                    disabled={availablePoints < POINTS_PER_EUR}
                  >
                    Max
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>

          <Button 
            className="w-full h-14 text-lg font-bold bg-yellow-500 hover:bg-yellow-600 text-yellow-950 border-none rounded-xl"
            disabled={pointsToConvert === 0 || convertPoints.isPending}
            onClick={handleConvert}
          >
            <WalletIcon className="w-5 h-5 mr-2" />
            Créditer {potentialEur.toFixed(2)}€
          </Button>

          {availablePoints < POINTS_PER_EUR && (
            <p className="text-center text-sm text-muted-foreground">
              Il vous faut au moins {POINTS_PER_EUR} points pour convertir.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
