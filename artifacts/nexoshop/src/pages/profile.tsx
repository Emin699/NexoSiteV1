import { Link } from "wouter";
import { useGetMe, useGetMeStats } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  User, Settings, ChevronRight, Gift, Coins, 
  Crown, Ticket, Users, ShoppingBag, CreditCard,
  LogOut, ShieldAlert
} from "lucide-react";

export default function Profile() {
  const { data: user, isLoading: isLoadingUser } = useGetMe();
  const { data: stats, isLoading: isLoadingStats } = useGetMeStats();

  const menuItems = [
    { href: "/wheel", icon: Gift, label: "Roue de la Destinée", color: "text-purple-500", bg: "bg-purple-500/10" },
    { href: "/loyalty", icon: Coins, label: "Points de Fidélité", color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { href: "/jackpot", icon: Ticket, label: "Jackpot Hebdomadaire", color: "text-red-500", bg: "bg-red-500/10" },
    { href: "/tiers", icon: Crown, label: "Niveaux VIP", color: "text-amber-500", bg: "bg-amber-500/10" },
    { href: "/referral", icon: Users, label: "Parrainage", color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  if (isLoadingUser || isLoadingStats) {
    return <div className="p-4 space-y-4 animate-pulse h-[100dvh] bg-background"></div>;
  }

  const initials = user?.firstName?.charAt(0).toUpperCase() || "U";

  return (
    <div className="flex flex-col gap-6 p-4 pb-24 animate-in fade-in">
      
      {/* Header Profile Info */}
      <div className="flex items-center gap-4 mt-2">
        <Avatar className="w-16 h-16 border-2 border-primary/20 ring-2 ring-primary/10 ring-offset-2 ring-offset-background">
          <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white text-xl font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold leading-tight">{user?.firstName || "Utilisateur"}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">ID: {user?.id}</span>
            {user?.username && <span>@{user.username}</span>}
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex flex-col items-center text-center justify-center space-y-1">
            <ShoppingBag className="w-5 h-5 text-primary mb-1" />
            <div className="text-2xl font-mono font-bold">{stats?.purchaseCount || 0}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Achats</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/50">
          <CardContent className="p-4 flex flex-col items-center text-center justify-center space-y-1">
            <CreditCard className="w-5 h-5 text-secondary mb-1" />
            <div className="text-2xl font-mono font-bold">{stats?.totalSpent?.toFixed(2) || "0.00"}€</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Dépensé</div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Menu */}
      <Card className="bg-card/50 border-border/50 overflow-hidden">
        <div className="divide-y divide-border/50">
          {menuItems.map((item, index) => (
            <Link key={index} href={item.href}>
              <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.bg} ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="font-medium group-hover:text-primary transition-colors">{item.label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Support / Legal */}
      <Card className="bg-card/30 border-border/30 overflow-hidden">
        <div className="divide-y divide-border/30">
          <div className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-sm text-muted-foreground">Support & FAQ</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 hover:bg-muted/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <LogOut className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium text-sm text-muted-foreground">Déconnexion</span>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="text-center text-xs text-muted-foreground mt-4 pb-4">
        NexoShop v1.0.0
      </div>
    </div>
  );
}
