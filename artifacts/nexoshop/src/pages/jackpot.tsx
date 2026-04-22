import { Link } from "wouter";
import { useGetJackpot } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Ticket, Trophy, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Jackpot() {
  const { data: jackpot, isLoading } = useGetJackpot();

  // Mock next draw calculation if not provided
  const nextDrawDate = jackpot?.nextDrawDate ? new Date(jackpot.nextDrawDate) : new Date(Date.now() + 86400000 * 3);
  const formattedDate = nextDrawDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <div className="p-4 flex items-center border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold ml-2">Jackpot Hebdomadaire</h1>
      </div>

      <div className="p-4 space-y-6 animate-in fade-in">
        {/* Banner */}
        <div className="relative rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 p-6 overflow-hidden shadow-lg shadow-red-500/20 text-white">
          <div className="absolute right-0 top-0 opacity-20 transform translate-x-1/4 -translate-y-1/4">
            <Trophy className="w-48 h-48" />
          </div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/20 backdrop-blur-sm text-xs font-bold mb-3 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              Tirage en cours
            </div>
            
            <h2 className="text-3xl font-black mb-1">Mega Jackpot</h2>
            <p className="text-red-100 mb-6 text-sm">Gagnez jusqu'à 100€ de solde chaque semaine !</p>
            
            <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-red-200 mb-0.5">Prochain tirage</div>
                <div className="font-bold capitalize">{formattedDate}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-red-200 mb-0.5">Tickets totaux</div>
                <div className="font-mono font-bold text-xl">{isLoading ? "..." : jackpot?.totalTickets || 0}</div>
              </div>
            </div>
          </div>
        </div>

        {/* User Tickets */}
        <Card className="bg-card border-border/50">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <Ticket className="w-7 h-7 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Vos Tickets</h3>
              <p className="text-sm text-muted-foreground">Tickets validés pour ce tirage</p>
            </div>
            <div className="text-3xl font-mono font-black text-red-500">
              {isLoading ? "-" : jackpot?.userTickets || 0}
            </div>
          </CardContent>
        </Card>

        {/* How it works */}
        <div className="space-y-3 pt-2">
          <h3 className="font-bold flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            Comment ça marche ?
          </h3>
          <div className="bg-muted/30 rounded-xl p-4 space-y-4 text-sm text-muted-foreground border border-border/50">
            <p>
              Le Jackpot NexoShop récompense nos acheteurs les plus fidèles avec un tirage au sort hebdomadaire.
            </p>
            <ul className="space-y-3 list-none">
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded bg-card flex items-center justify-center font-bold text-xs shrink-0">1</div>
                <span>Gagnez <strong>1 ticket</strong> pour chaque achat effectué sur la boutique.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded bg-card flex items-center justify-center font-bold text-xs shrink-0">2</div>
                <span>Le tirage a lieu automatiquement tous les dimanches soir.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-6 h-6 rounded bg-card flex items-center justify-center font-bold text-xs shrink-0">3</div>
                <span>Le gagnant reçoit son prix directement sur son solde NexoShop.</span>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
