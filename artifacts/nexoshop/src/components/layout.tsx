import React from "react";
import { Link, useLocation } from "wouter";
import {
  ShoppingCart, Wallet, User, Store, ShieldCheck, LogIn, LifeBuoy,
  Radio, ArrowUpRight, PackageSearch, Star,
} from "lucide-react";
import { useGetMe, useGetCart } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hasAuthToken, useRequireAuth } from "@/hooks/use-auth";
import { SignupPrompt } from "@/components/signup-prompt";

const TELEGRAM_CHANNEL_URL = "https://t.me/+DE3YyhusyQA0YTk0";

function TelegramLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.022c.242-.213-.054-.334-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.658-.643.135-.953l11.566-4.458c.538-.196 1.006.128.832.938z" />
    </svg>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const requireAuth = useRequireAuth();
  const isAuthed = hasAuthToken();
  const { data: user } = useGetMe({ query: { enabled: isAuthed } });
  const { data: cart } = useGetCart({ query: { enabled: isAuthed } });

  const guard = (e: React.MouseEvent, msg: string) => {
    if (isAuthed) return;
    e.preventDefault();
    requireAuth(msg);
  };

  const isHome     = location === "/";
  const isCart     = location === "/cart";
  const isWallet   = location === "/wallet";
  const isAdmin    = location === "/gestion-x7q2p9k";
  const isOrders   = location === "/orders";
  const isReviews  = location === "/reviews";
  const isSupport  = location.startsWith("/support");
  const isProfile  = !isAdmin && (
    location.startsWith("/profile") ||
    location === "/wheel" ||
    location === "/loyalty" ||
    location === "/jackpot" ||
    location === "/tiers" ||
    location === "/referral"
  );

  const mobileNavItem = (active: boolean) =>
    `flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 ${
      active
        ? "text-primary drop-shadow-[0_0_8px_rgba(168,85,247,0.8)]"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground">

      {/* ── HEADER ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 w-full backdrop-blur-md border-b"
        style={{
          background: "rgba(6,4,15,0.92)",
          borderBottomColor: "rgba(168,85,247,0.25)",
          boxShadow: "0 1px 30px rgba(168,85,247,0.08)",
        }}
      >
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-md mx-auto">
          {/* Left: balance (if authed) */}
          <div>
            {isAuthed ? (
              <Link href="/wallet" className="flex items-center gap-2 p-1 -ml-1 rounded-full hover:bg-primary/10 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <span className="font-mono font-bold text-sm"
                  style={{ color: "#a855f7", textShadow: "0 0 12px rgba(168,85,247,0.5)" }}>
                  {user?.balance.toFixed(2) || "0.00"}€
                </span>
              </Link>
            ) : (
              <span aria-hidden="true" className="w-2" />
            )}
          </div>

          {/* Center: logo */}
          <Link href="/" className="flex items-center absolute left-1/2 -translate-x-1/2">
            <img
              src="/nexoshop-logo.png"
              alt="NexoShop"
              className="h-6 sm:h-9 w-auto select-none"
              style={{ filter: "drop-shadow(0 0 10px rgba(168,85,247,0.4))" }}
              draggable={false}
            />
          </Link>

          {/* Right: auth + cart */}
          <div className="flex items-center gap-2 -mr-2">
            {!isAuthed && (
              <Link
                href="/auth"
                data-signup-anchor
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: "linear-gradient(135deg, #a855f7, #7c3aed)",
                  color: "#fff",
                  boxShadow: "0 0 16px rgba(168,85,247,0.45)",
                }}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Se connecter</span>
              </Link>
            )}
            <Link
              href="/cart"
              onClick={(e) => guard(e, "Connecte-toi pour accéder à ton panier")}
              className="relative p-2 rounded-full hover:bg-primary/10 transition-colors"
            >
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {cart?.itemCount ? (
                <Badge
                  className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] border-none rounded-full animate-in zoom-in"
                  style={{ background: "#a855f7", color: "#fff" }}
                >
                  {cart.itemCount}
                </Badge>
              ) : null}
            </Link>
          </div>
        </div>
      </header>

      {!isAuthed && <SignupPrompt />}

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 w-full max-w-screen-md mx-auto overflow-x-hidden flex flex-col pb-16">
        <div className="flex-1">{children}</div>

        {/* Footer */}
        <footer
          className="mt-10 border-t px-4 py-5"
          style={{ borderColor: "rgba(168,85,247,0.15)", background: "rgba(168,85,247,0.03)" }}
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()}{" "}
              <span className="font-semibold" style={{ color: "#a855f7" }}>NexoShop</span>{" "}
              — Tous droits réservés.
            </p>
            <div className="flex items-center gap-4">
              <Link
                href="/support"
                onClick={(e) => guard(e, "Connecte-toi pour accéder au support")}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Support</span>
              </Link>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                    <Radio className="w-3.5 h-3.5" />
                    <span>Canal</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="end" className="w-60 p-3" sideOffset={8}>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-full bg-[#229ED9]/15 flex items-center justify-center text-[#229ED9]">
                      <TelegramLogo className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground leading-tight">Canal Telegram</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">Annonces, drops & promos.</p>
                    </div>
                  </div>
                  <a
                    href={TELEGRAM_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-2 w-full px-3 py-2 rounded-md bg-[#229ED9] hover:bg-[#1c84b5] text-white text-xs font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <TelegramLogo className="w-3.5 h-3.5" />
                      Rejoindre
                    </span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </footer>
      </main>

      {/* ── MOBILE BOTTOM NAV ────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 w-full backdrop-blur-md border-t z-50 pb-safe"
        style={{
          background: "rgba(6,4,15,0.94)",
          borderTopColor: "rgba(168,85,247,0.2)",
          boxShadow: "0 -1px 30px rgba(168,85,247,0.08)",
        }}
      >
        <div className="flex items-center justify-around h-16 max-w-screen-md mx-auto px-2">
          <Link href="/" className={mobileNavItem(isHome)}>
            <Store className="w-5 h-5" />
            <span className="text-[10px] font-medium">Shop</span>
          </Link>

          <Link
            href="/orders"
            onClick={(e) => guard(e, "Connecte-toi pour voir tes commandes")}
            className={mobileNavItem(isOrders)}
          >
            <PackageSearch className="w-5 h-5" />
            <span className="text-[10px] font-medium">Commandes</span>
          </Link>

          <Link href="/reviews" className={mobileNavItem(isReviews)}>
            <Star className="w-5 h-5" />
            <span className="text-[10px] font-medium">Avis</span>
          </Link>

          <Link
            href="/wallet"
            onClick={(e) => guard(e, "Connecte-toi pour accéder à ton portefeuille")}
            className={mobileNavItem(isWallet)}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">Wallet</span>
          </Link>

          <Link
            href="/profile"
            onClick={(e) => guard(e, "Connecte-toi pour accéder à ton profil")}
            className={mobileNavItem(isProfile)}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profil</span>
          </Link>

          {user?.isAdmin && (
            <Link href="/gestion-x7q2p9k" className={mobileNavItem(isAdmin)}>
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          )}
        </div>
      </nav>
    </div>
  );
}
