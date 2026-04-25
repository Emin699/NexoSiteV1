import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Sparkles, Star } from "lucide-react";

interface ThankYouModalProps {
  open: boolean;
  onClose: () => void;
  onLeaveReview: () => void;
  productName?: string;
}

export function ThankYouModal({ open, onClose, onLeaveReview, productName }: ThankYouModalProps) {
  const [phase, setPhase] = useState<"animate" | "cta">("animate");

  useEffect(() => {
    if (open) {
      setPhase("animate");
      const t = setTimeout(() => setPhase("cta"), 1400);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="bg-gradient-to-b from-card via-card to-primary/5 border-primary/30 max-w-sm overflow-hidden p-0"
      >
        {/* Animation block */}
        <div className="relative px-6 pt-10 pb-4 flex flex-col items-center text-center overflow-hidden">
          {/* Floating sparkles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <Sparkles
                key={i}
                className={`absolute animate-ping ${i % 2 === 0 ? "text-primary/60" : "text-secondary/60"}`}
                style={{
                  width: `${10 + (i % 3) * 4}px`,
                  height: `${10 + (i % 3) * 4}px`,
                  left: `${10 + ((i * 13) % 80)}%`,
                  top: `${5 + ((i * 17) % 60)}%`,
                  animationDelay: `${i * 120}ms`,
                  animationDuration: `${1500 + (i % 4) * 200}ms`,
                }}
              />
            ))}
          </div>

          {/* Heart with pulse */}
          <div className="relative z-10 mb-3">
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-2xl shadow-primary/40 animate-[heartbeat_1.2s_ease-in-out_infinite]">
              <Heart className="w-10 h-10 text-white fill-white" strokeWidth={2.5} />
            </div>
          </div>

          {/* MERCI */}
          <h1
            className="relative z-10 text-5xl font-black bg-gradient-to-br from-primary via-secondary to-primary bg-clip-text text-transparent tracking-wider animate-in zoom-in fade-in duration-700"
            style={{ letterSpacing: "0.05em" }}
          >
            MERCI&nbsp;!
          </h1>

          <p className="relative z-10 mt-2 text-sm text-foreground/80 max-w-[260px]">
            Votre commande a bien été enregistrée
            {productName ? (
              <>
                <br />
                <span className="text-foreground font-semibold">{productName}</span>
              </>
            ) : null}
          </p>
        </div>

        {/* CTA — apparait en phase 2 */}
        <div
          className={`px-6 pb-6 pt-2 transition-all duration-500 ${
            phase === "cta" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-3 flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0" />
            <p className="text-xs text-foreground/85">
              Aidez-nous : laissez un avis et recevez{" "}
              <strong className="text-amber-300">+1 tour de roue</strong>.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1 text-muted-foreground hover:text-foreground"
              onClick={onClose}
              disabled={phase !== "cta"}
            >
              Plus tard
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white border-none font-bold shadow-md shadow-primary/30"
              onClick={onLeaveReview}
              disabled={phase !== "cta"}
            >
              <Star className="w-4 h-4 mr-2" />
              Laisser un avis
            </Button>
          </div>

          <p className="text-[10px] text-muted-foreground/60 text-center mt-3 leading-relaxed">
            Sans avis de votre part sous 24 h, un avis automatique 5 étoiles sera publié.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
