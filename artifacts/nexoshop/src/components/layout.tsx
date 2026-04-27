import React from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Wallet, User, Store, ShieldCheck, LogIn, Send, Radio, ArrowUpRight } from "lucide-react";
import { useGetMe, useGetCart } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { hasAuthToken, useRequireAuth } from "@/hooks/use-auth";

const TELEGRAM_HANDLE = "nexoshop6912";
const TELEGRAM_URL = `https://t.me/${TELEGRAM_HANDLE}`;

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const requireAuth = useRequireAuth();
  const isAuthed = hasAuthToken();
  // Skip /me + /cart calls entirely for anonymous visitors so we don't fire 401s.
  const { data: user } = useGetMe({ query: { enabled: isAuthed } });
  const { data: cart } = useGetCart({ query: { enabled: isAuthed } });

  const guard = (e: React.MouseEvent, msg: string) => {
    if (isAuthed) return;
    e.preventDefault();
    requireAuth(msg);
  };

  const isHome = location === "/";
  const isCart = location === "/cart";
  const isWallet = location === "/wallet";
  const isAdmin = location === "/admin";
  const isProfile = !isAdmin && (location.startsWith("/profile") || 
                    location === "/wheel" || 
                    location === "/loyalty" || 
                    location === "/jackpot" || 
                    location === "/tiers" || 
                    location === "/referral");

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background text-foreground pb-16">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center justify-between px-4 h-14 max-w-screen-md mx-auto">
          {isAuthed ? (
            <Link href="/wallet" className="flex items-center gap-2 p-1 -ml-1 rounded-full hover:bg-muted/50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="font-mono font-bold text-sm">
                {user?.balance.toFixed(2) || "0.00"}€
              </span>
            </Link>
          ) : (
            <Link
              href="/auth"
              className="flex items-center gap-1.5 px-3 py-1.5 -ml-1 rounded-full bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="text-xs font-bold">Connexion</span>
            </Link>
          )}

          <Link
            href="/"
            className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2"
          >
            <img
              src="/nexoshop-icon.png"
              alt=""
              aria-hidden="true"
              className="w-7 h-7 rounded-md shadow-md shadow-primary/20"
            />
            <img
              src="/nexoshop-logo.png"
              alt="NexoShop"
              className="h-6 w-auto select-none"
              draggable={false}
            />
          </Link>

          <Link
            href="/cart"
            onClick={(e) => guard(e, "Connecte-toi pour accéder à ton panier")}
            className="relative p-2 -mr-2 rounded-full hover:bg-muted/50 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {cart?.itemCount ? (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] bg-primary text-primary-foreground border-none rounded-full animate-in zoom-in"
              >
                {cart.itemCount}
              </Badge>
            ) : null}
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-screen-md mx-auto overflow-x-hidden flex flex-col">
        <div className="flex-1">{children}</div>

        {/* Footer */}
        <footer className="mt-10 border-t border-border/40 bg-card/30 px-4 py-5">
          <div className="max-w-screen-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()} <span className="font-semibold text-foreground">NexoShop</span> — Tous droits réservés.
            </p>

            <div className="flex items-center gap-4">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Contact</span>
              </a>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Canal</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="top"
                  align="end"
                  className="w-56 p-2"
                  sideOffset={8}
                >
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-semibold text-foreground">Canal Telegram NexoShop</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Annonces, drops & promos.
                    </p>
                  </div>
                  <a
                    href={TELEGRAM_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex items-center justify-between gap-2 w-full px-3 py-2 rounded-md bg-[#229ED9] hover:bg-[#1c84b5] text-white text-xs font-semibold transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Send className="w-3.5 h-3.5" />
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

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-card/90 backdrop-blur-md border-t border-border z-50 pb-safe">
        <div className="flex items-center justify-around h-16 max-w-screen-md mx-auto px-2">
          <Link 
            href="/" 
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isHome ? "text-primary" : "text-muted-foreground hover:text-foreground transition-colors"}`}
          >
            <Store className="w-5 h-5" />
            <span className="text-[10px] font-medium">Shop</span>
          </Link>
          
          <Link 
            href="/wallet"
            onClick={(e) => guard(e, "Connecte-toi pour accéder à ton portefeuille")}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isWallet ? "text-primary" : "text-muted-foreground hover:text-foreground transition-colors"}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">Wallet</span>
          </Link>

          <Link 
            href="/profile"
            onClick={(e) => guard(e, "Connecte-toi pour accéder à ton profil")}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isProfile ? "text-primary" : "text-muted-foreground hover:text-foreground transition-colors"}`}
          >
            <User className="w-5 h-5" />
            <span className="text-[10px] font-medium">Profil</span>
          </Link>

          {user?.isAdmin ? (
            <Link 
              href="/admin" 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isAdmin ? "text-primary" : "text-muted-foreground hover:text-foreground transition-colors"}`}
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] font-medium">Admin</span>
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
