import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Sparkles, X, UserPlus, Wallet, Trophy, Zap } from "lucide-react";

const STORAGE_KEY = "nexoshop_signup_prompt_dismissed_v1";

export function SignupPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "1") return;
    // Small delay so the user notices the page first.
    const t = window.setTimeout(() => setVisible(true), 700);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div
      className="fixed top-16 right-3 z-[60] w-[min(20rem,calc(100vw-1.5rem))] animate-in fade-in slide-in-from-top-3 duration-500"
      role="dialog"
      aria-label="Inscription suggérée"
    >
      {/* Curved arrow pointing up to the "Connexion" button (top-right of header) */}
      <svg
        className="absolute -top-9 right-4 text-primary"
        width="48"
        height="40"
        viewBox="0 0 48 40"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M40 4 C 40 18, 30 28, 14 34"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="3 4"
        />
        {/* Arrow head pointing up-right toward the button */}
        <path
          d="M40 4 L 35 8 M40 4 L 44 9"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="none"
        />
      </svg>

      <div className="relative rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-secondary/10 p-4 shadow-xl backdrop-blur-md">
        {/* Soft blobs */}
        <div className="absolute -top-4 -left-4 w-16 h-16 bg-primary/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-secondary/20 rounded-full blur-2xl pointer-events-none" />

        <button
          type="button"
          onClick={dismiss}
          className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="relative flex items-start gap-2.5">
          <div className="w-9 h-9 shrink-0 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 pr-4">
            <h3 className="text-sm font-bold leading-tight">
              Débloque tout NexoShop
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
              Crée ton compte gratuitement pour profiter de toutes les fonctionnalités.
            </p>
          </div>
        </div>

        <ul className="relative mt-3 grid grid-cols-1 gap-1.5 text-[11px] text-foreground/90">
          <li className="flex items-center gap-2">
            <Wallet className="w-3 h-3 text-primary" />
            Portefeuille &amp; achats instantanés
          </li>
          <li className="flex items-center gap-2">
            <Trophy className="w-3 h-3 text-primary" />
            Programme fidélité, roue &amp; jackpot
          </li>
          <li className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-primary" />
            Livraison automatique en quelques secondes
          </li>
        </ul>

        <div className="relative flex items-center gap-2 mt-3">
          <Link
            href="/auth"
            onClick={dismiss}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Créer mon compte
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="px-2.5 py-2 rounded-lg text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
