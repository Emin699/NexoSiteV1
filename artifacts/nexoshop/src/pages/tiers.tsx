import { Link } from "wouter";
import { useGetTiers } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Crown, Lock, Unlock, ArrowUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Tiers() {
  const { data: tierData, isLoading } = useGetTiers();

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <div className="p-4 flex items-center border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold ml-2">Niveaux VIP</h1>
      </div>

      <div className="p-4 space-y-6 animate-in fade-in">
        
        {/* Current Tier Summary */}
        <Card className="bg-gradient-to-br from-amber-500/20 via-card to-yellow-600/10 border-amber-500/30 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Crown className="w-7 h-7 text-amber-950" />
              </div>
              <div>
                <div className="text-sm text-amber-500/80 font-medium">Niveau Actuel</div>
                <div className="text-2xl font-bold font-mono text-amber-500">
                  {isLoading ? "..." : tierData?.currentTierName}
                </div>
              </div>
            </div>

            {tierData?.nextTierAt !== null && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progression</span>
                  <span className="font-mono">{tierData?.totalRecharged.toFixed(2)}€ / {tierData?.nextTierAt}€</span>
                </div>
                <Progress value={tierData?.progress || 0} className="h-2 bg-muted" />
                <p className="text-[10px] text-center text-muted-foreground pt-1">
                  Rechargez encore <span className="font-bold text-foreground">{(tierData?.nextTierAt! - (tierData?.totalRecharged || 0)).toFixed(2)}€</span> pour passer au niveau supérieur
                </p>
              </div>
            )}
            {tierData?.nextTierAt === null && !isLoading && (
              <div className="text-center text-sm font-medium text-amber-500 bg-amber-500/10 p-3 rounded-lg">
                Félicitations, vous avez atteint le niveau maximum ! 👑
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tiers List */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg px-1">Avantages par niveau</h3>
          
          <div className="space-y-3 relative">
            {/* Connecting line */}
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-border z-0"></div>

            {tierData?.tiers.map((tier, i) => {
              const isCurrent = tier.level === tierData.currentTier;
              const isUnlocked = tier.unlocked;
              
              return (
                <div key={tier.level} className="relative z-10 flex gap-4">
                  {/* Indicator */}
                  <div className={`w-12 h-12 rounded-full border-4 shrink-0 flex items-center justify-center font-bold text-sm ${
                    isCurrent ? 'bg-amber-500 border-background text-amber-950 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 
                    isUnlocked ? 'bg-card border-amber-500/50 text-amber-500' : 'bg-muted border-background text-muted-foreground'
                  }`}>
                    {tier.level}
                  </div>
                  
                  {/* Content */}
                  <Card className={`flex-1 ${isCurrent ? 'border-amber-500/50 shadow-md shadow-amber-500/10' : 'border-border/50'}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className={`font-bold ${isCurrent ? 'text-amber-500' : isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {tier.name}
                          </h4>
                          <div className="text-xs text-muted-foreground font-mono">Dès {tier.requiredAmount}€</div>
                        </div>
                        <div>
                          {isUnlocked ? (
                            <Unlock className="w-4 h-4 text-green-500" />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground/50" />
                          )}
                        </div>
                      </div>
                      <div className="text-sm flex items-start gap-2 bg-muted/30 p-2 rounded text-muted-foreground">
                        <ArrowUp className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
                        <span>{tier.reward}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
