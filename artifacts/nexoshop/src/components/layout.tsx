import React from "react";
import { Link, useLocation } from "wouter";
import { ShoppingCart, Wallet, User, Store, ShieldCheck } from "lucide-react";
import { useGetMe, useGetCart } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: user } = useGetMe();
  const { data: cart } = useGetCart();

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
          <Link href="/wallet" className="flex items-center gap-2 p-1 -ml-1 rounded-full hover:bg-muted/50 transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <Wallet className="w-4 h-4" />
            </div>
            <span className="font-mono font-bold text-sm">
              {user?.balance.toFixed(2) || "0.00"}€
            </span>
          </Link>

          <div className="flex items-center">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary absolute left-1/2 -translate-x-1/2">
              NexoShop
            </h1>
          </div>

          <Link href="/cart" className="relative p-2 -mr-2 rounded-full hover:bg-muted/50 transition-colors">
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
      <main className="flex-1 w-full max-w-screen-md mx-auto overflow-x-hidden">
        {children}
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
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isWallet ? "text-primary" : "text-muted-foreground hover:text-foreground transition-colors"}`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">Wallet</span>
          </Link>

          <Link 
            href="/profile" 
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
