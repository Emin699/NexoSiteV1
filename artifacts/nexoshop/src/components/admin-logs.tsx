import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ShoppingBag,
  Gift,
  Star,
  Trophy,
  RefreshCw,
  Users as UsersIcon,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Package,
  Activity,
} from "lucide-react";

type Tx = {
  id: number;
  userId: number;
  userEmail: string | null;
  userName: string | null;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
};

type Order = {
  id: number;
  userId: number;
  userEmail: string | null;
  userName: string | null;
  productName: string;
  price: number;
  status: string;
  createdAt: string;
};

type LogEntry =
  | { kind: "tx"; data: Tx; timestamp: number }
  | { kind: "order"; data: Order; timestamp: number };

const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  purchase: { label: "Achat", icon: ShoppingBag, color: "text-blue-400", bg: "bg-blue-500/10" },
  deposit: { label: "Dépôt", icon: ArrowDownRight, color: "text-green-400", bg: "bg-green-500/10" },
  withdrawal: { label: "Retrait", icon: ArrowUpRight, color: "text-orange-400", bg: "bg-orange-500/10" },
  wheel_win: { label: "Roue", icon: Gift, color: "text-violet-400", bg: "bg-violet-500/10" },
  loyalty: { label: "Fidélité", icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  jackpot: { label: "Jackpot", icon: Trophy, color: "text-pink-400", bg: "bg-pink-500/10" },
  referral: { label: "Parrainage", icon: UsersIcon, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  free_spin: { label: "Tour bonus", icon: RefreshCw, color: "text-violet-400", bg: "bg-violet-500/10" },
  admin_credit: { label: "Crédit admin", icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  admin_debit: { label: "Débit admin", icon: ShieldCheck, color: "text-red-400", bg: "bg-red-500/10" },
  admin_loyaltyPoints: { label: "Admin points", icon: ShieldCheck, color: "text-yellow-400", bg: "bg-yellow-500/10" },
  admin_freeSpins: { label: "Admin spins", icon: ShieldCheck, color: "text-violet-400", bg: "bg-violet-500/10" },
  admin_jackpotTickets: { label: "Admin tickets", icon: ShieldCheck, color: "text-pink-400", bg: "bg-pink-500/10" },
  default: { label: "Événement", icon: Activity, color: "text-muted-foreground", bg: "bg-muted/30" },
};

function getMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.default;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminLogs() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "purchase" | "wallet" | "wheel" | "admin">("all");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs?limit=300", {
        headers: { "X-User-Id": localStorage.getItem("userId") || "" },
      });
      const data = await res.json();
      const txEntries: LogEntry[] = (data.transactions as Tx[]).map((t) => ({
        kind: "tx",
        data: t,
        timestamp: new Date(t.createdAt).getTime(),
      }));
      const orderEntries: LogEntry[] = (data.orders as Order[]).map((o) => ({
        kind: "order",
        data: o,
        timestamp: new Date(o.createdAt).getTime(),
      }));
      const combined = [...txEntries, ...orderEntries].sort((a, b) => b.timestamp - a.timestamp);
      setEntries(combined);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = entries.filter((e) => {
    if (filter === "all") return true;
    if (filter === "purchase") return e.kind === "order" || (e.kind === "tx" && e.data.type === "purchase");
    if (filter === "wallet")
      return e.kind === "tx" && ["deposit", "withdrawal"].includes(e.data.type);
    if (filter === "wheel") return e.kind === "tx" && (e.data.type === "wheel_win" || e.data.type === "free_spin");
    if (filter === "admin") return e.kind === "tx" && e.data.type.startsWith("admin_");
    return true;
  });

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all", label: "Tout" },
    { key: "purchase", label: "Achats" },
    { key: "wallet", label: "Portefeuille" },
    { key: "wheel", label: "Roue" },
    { key: "admin", label: "Admin" },
  ];

  return (
    <div className="space-y-3">
      {/* Filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
        <button
          onClick={load}
          className="shrink-0 ml-auto text-xs px-3 py-1.5 rounded-full font-medium bg-card border border-border text-muted-foreground hover:text-foreground"
          disabled={loading}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card/50 border border-border/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
          <p className="text-lg font-bold">{entries.length}</p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Achats</p>
          <p className="text-lg font-bold text-blue-400">
            {entries.filter((e) => e.kind === "order").length}
          </p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Transactions</p>
          <p className="text-lg font-bold text-violet-400">
            {entries.filter((e) => e.kind === "tx").length}
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 rounded-lg bg-muted/20 animate-pulse" />
        ))
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-lg text-sm">
          Aucun log
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((entry, idx) => {
            if (entry.kind === "order") {
              const o = entry.data;
              const meta = TYPE_META.purchase;
              const Icon = Package;
              return (
                <Card key={`o${o.id}-${idx}`} className="bg-card/40 border-border/40">
                  <CardContent className="p-2.5 flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">
                        Achat : {o.productName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {o.userName || o.userEmail || `User #${o.userId}`} · {formatDate(o.createdAt)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold font-mono text-blue-400">
                        -{o.price.toFixed(2)}€
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[8px] px-1 py-0 h-3.5 mt-0.5"
                      >
                        {o.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            }
            const t = entry.data;
            const meta = getMeta(t.type);
            const Icon = meta.icon;
            const isPositive = t.amount > 0 && !t.type.startsWith("withdrawal") && !t.type.includes("debit");
            return (
              <Card key={`t${t.id}-${idx}`} className="bg-card/40 border-border/40">
                <CardContent className="p-2.5 flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{t.description}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {t.userName || t.userEmail || `User #${t.userId}`} · {formatDate(t.createdAt)}
                    </p>
                  </div>
                  {t.amount !== 0 && (
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold font-mono ${isPositive ? "text-green-400" : "text-red-400"}`}>
                        {isPositive ? "+" : "-"}
                        {Math.abs(t.amount).toFixed(2)}€
                      </p>
                    </div>
                  )}
                  {t.amount === 0 && (
                    <Badge variant="outline" className={`text-[9px] ${meta.color}`}>
                      {meta.label}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

void Wallet;
