import { useState } from "react";
import { Link } from "wouter";
import { useGetReferral } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, Users, Copy, Check, Share2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function Referral() {
  const { data: refData, isLoading } = useGetReferral();
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    if (!refData?.referralLink) return;
    navigator.clipboard.writeText(refData.referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Lien copié dans le presse-papier");
  };

  const shareLink = async () => {
    if (!refData?.referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Rejoignez NexoShop',
          text: 'Découvrez la meilleure boutique de produits digitaux !',
          url: refData.referralLink,
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      copyLink();
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background">
      <div className="p-4 flex items-center border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-10">
        <Link href="/profile">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold ml-2">Parrainage</h1>
      </div>

      <div className="p-4 space-y-6 animate-in fade-in">
        
        {/* Banner */}
        <div className="bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-blue-500/30 rounded-2xl p-6 text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-white">Invitez vos amis</h2>
          <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
            Gagnez <strong className="text-blue-400">1.00€</strong> sur votre solde pour chaque ami qui s'inscrit et effectue son premier achat.
          </p>
        </div>

        {/* Link Share */}
        <div className="space-y-3">
          <label className="text-sm font-bold ml-1">Votre lien personnel</label>
          <div className="flex gap-2">
            <Input 
              readOnly 
              value={refData?.referralLink || "Génération..."} 
              className="bg-card font-mono text-xs border-border/50"
            />
            <Button variant="secondary" size="icon" onClick={copyLink} className="shrink-0 bg-card border border-border/50">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button variant="default" size="icon" onClick={shareLink} className="shrink-0 bg-blue-600 hover:bg-blue-700">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="text-sm text-muted-foreground mb-1">Gains Totaux</div>
              <div className="text-2xl font-mono font-bold text-green-500">
                {isLoading ? "..." : `+${refData?.totalEarned.toFixed(2)}€`}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <div className="text-sm text-muted-foreground mb-1">Amis Inscrits</div>
              <div className="text-2xl font-mono font-bold text-blue-500">
                {isLoading ? "..." : refData?.referrals.length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Referral List */}
        <div className="space-y-4 pt-4">
          <h3 className="font-bold text-lg px-1 flex items-center justify-between">
            <span>Vos Filleuls</span>
            {refData && refData.remainingCap > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                Reste {refData.remainingCap} places
              </span>
            )}
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-16 bg-muted/50 rounded-xl animate-pulse" />)}
            </div>
          ) : !refData?.referrals || refData.referrals.length === 0 ? (
            <div className="text-center py-8 bg-card/30 rounded-xl border border-dashed border-border/50">
              <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Vous n'avez pas encore invité d'amis.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {refData.referrals.map((ref) => (
                <Card key={ref.id} className="bg-card/50 border-border/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                        {ref.referredName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{ref.referredName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ref.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div>
                      {ref.paid ? (
                        <Badge className="bg-green-500/20 text-green-500 border-none hover:bg-green-500/20">+1.00€ payé</Badge>
                      ) : ref.eligible ? (
                        <Badge className="bg-yellow-500/20 text-yellow-500 border-none hover:bg-yellow-500/20">En attente</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground border-border">Non éligible</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
