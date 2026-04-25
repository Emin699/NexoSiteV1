import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Search,
  Wallet,
  Star,
  RefreshCw,
  Trophy,
  Plus,
  Minus,
  Mail,
  ShoppingBag,
  Ban,
  Trash2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";

type AdminUser = {
  id: number;
  email: string | null;
  firstName: string;
  username: string | null;
  balance: number;
  loyaltyPoints: number;
  freeSpins: number;
  jackpotTickets: number;
  purchaseCount: number;
  totalRecharged: number;
  isAdmin: boolean;
  isBanned: boolean;
  createdAt: string;
};

type Field = "balance" | "loyaltyPoints" | "freeSpins" | "jackpotTickets";

const FIELD_META: Record<Field, { label: string; icon: React.ElementType; color: string; unit: string; suffix: string }> = {
  balance: { label: "Solde", icon: Wallet, color: "text-green-400", unit: "€", suffix: "€" },
  loyaltyPoints: { label: "Points", icon: Star, color: "text-yellow-400", unit: "pts", suffix: "pts" },
  freeSpins: { label: "Tours", icon: RefreshCw, color: "text-secondary", unit: "tour(s)", suffix: "" },
  jackpotTickets: { label: "Tickets", icon: Trophy, color: "text-primary", unit: "ticket(s)", suffix: "" },
};

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Adjust dialog state
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustUser, setAdjustUser] = useState<AdminUser | null>(null);
  const [adjustField, setAdjustField] = useState<Field>("balance");
  const [adjustDelta, setAdjustDelta] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation dialog state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Ban toggle state
  const [banningId, setBanningId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("nexoshop_token") || "";
      const res = await fetch("/api/admin/users", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data: AdminUser[] = await res.json();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openAdjust = (user: AdminUser, field: Field) => {
    setAdjustUser(user);
    setAdjustField(field);
    setAdjustDelta("");
    setAdjustReason("");
    setAdjustOpen(true);
  };

  const toggleBan = async (user: AdminUser) => {
    if (user.isAdmin) {
      toast.error("Impossible de bannir un administrateur");
      return;
    }
    const action = user.isBanned ? "débannir" : "bannir";
    if (!confirm(`Voulez-vous vraiment ${action} ${user.firstName} (${user.email || `#${user.id}`}) ?`)) {
      return;
    }
    setBanningId(user.id);
    try {
      const token = localStorage.getItem("nexoshop_token") || "";
      const res = await fetch(`/api/admin/users/${user.id}/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ban: !user.isBanned }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur");
      }
      toast.success(user.isBanned ? `${user.firstName} a été débanni` : `${user.firstName} a été banni`);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBanningId(null);
    }
  };

  const openDelete = (user: AdminUser) => {
    if (user.isAdmin) {
      toast.error("Impossible de supprimer un administrateur");
      return;
    }
    setDeleteUser(user);
    setDeleteConfirm("");
    setDeleteOpen(true);
  };

  const submitDelete = async () => {
    if (!deleteUser) return;
    if (deleteConfirm !== "SUPPRIMER") {
      toast.error("Tapez SUPPRIMER pour confirmer");
      return;
    }
    setDeleting(true);
    try {
      const token = localStorage.getItem("nexoshop_token") || "";
      const res = await fetch(`/api/admin/users/${deleteUser.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur");
      }
      toast.success(`${deleteUser.firstName} a été supprimé`);
      setDeleteOpen(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setDeleting(false);
    }
  };

  const submitAdjust = async (sign: 1 | -1) => {
    if (!adjustUser || !adjustDelta) return;
    const value = parseFloat(adjustDelta);
    if (isNaN(value) || value <= 0) {
      toast.error("Valeur invalide");
      return;
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("nexoshop_token") || "";
      const res = await fetch(`/api/admin/users/${adjustUser.id}/adjust`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          field: adjustField,
          delta: sign * value,
          reason: adjustReason || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erreur");
      }
      toast.success(
        `${sign > 0 ? "+" : "-"}${value} ${FIELD_META[adjustField].unit} pour ${adjustUser.firstName}`
      );
      setAdjustOpen(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.firstName.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      String(u.id).includes(q)
    );
  });

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher (nom, email, ID)..."
          className="pl-9 bg-card border-border/60"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-card/50 border border-border/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Utilisateurs</p>
          <p className="text-lg font-bold">{users.length}</p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Solde total</p>
          <p className="text-lg font-bold text-green-400">
            {users.reduce((s, u) => s + u.balance, 0).toFixed(2)}€
          </p>
        </div>
        <div className="bg-card/50 border border-border/50 rounded-lg p-2 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Achats</p>
          <p className="text-lg font-bold text-blue-400">
            {users.reduce((s, u) => s + u.purchaseCount, 0)}
          </p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-muted/20 animate-pulse" />
        ))
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground border border-dashed border-border rounded-lg text-sm">
          Aucun utilisateur
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((user) => (
            <Card
              key={user.id}
              className={`bg-card/50 border-border/50 ${user.isBanned ? "ring-1 ring-red-500/40" : ""}`}
            >
              <CardContent className="p-3">
                {/* Header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <Avatar className="w-9 h-9">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {user.firstName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-bold text-sm truncate">{user.firstName}</p>
                      {user.isAdmin && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-bold uppercase">
                          Admin
                        </span>
                      )}
                      {user.isBanned && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-bold uppercase">
                          Banni
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 shrink-0" />
                      {user.email || "—"} · ID #{user.id}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <ShoppingBag className="w-3 h-3" /> {user.purchaseCount}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {user.totalRecharged.toFixed(2)}€ rechargés
                    </p>
                  </div>
                </div>

                {/* Action grid - 4 fields with adjust buttons */}
                <div className="grid grid-cols-2 gap-1.5">
                  {(Object.keys(FIELD_META) as Field[]).map((field) => {
                    const meta = FIELD_META[field];
                    const Icon = meta.icon;
                    const value = user[field];
                    const display = field === "balance" ? value.toFixed(2) : value.toString();
                    return (
                      <button
                        key={field}
                        onClick={() => openAdjust(user, field)}
                        className="flex items-center gap-2 p-2 rounded-lg bg-muted/20 hover:bg-muted/40 border border-border/30 transition-colors text-left"
                      >
                        <Icon className={`w-4 h-4 ${meta.color} shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[9px] text-muted-foreground uppercase leading-tight">
                            {meta.label}
                          </p>
                          <p className={`text-xs font-bold leading-tight ${meta.color}`}>
                            {display}
                            {meta.suffix}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Modération - Bannir / Supprimer */}
                {!user.isAdmin && (
                  <div className="grid grid-cols-2 gap-1.5 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className={
                        user.isBanned
                          ? "h-8 text-xs border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
                          : "h-8 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                      }
                      onClick={() => toggleBan(user)}
                      disabled={banningId === user.id}
                    >
                      {user.isBanned ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Débannir
                        </>
                      ) : (
                        <>
                          <Ban className="w-3.5 h-3.5 mr-1" /> Bannir
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs border-red-500/40 text-red-300 hover:bg-red-500/10"
                      onClick={() => openDelete(user)}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Supprimer
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Adjust dialog */}
      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {adjustUser && (() => {
                const Icon = FIELD_META[adjustField].icon;
                return <Icon className={`w-5 h-5 ${FIELD_META[adjustField].color}`} />;
              })()}
              Ajuster {FIELD_META[adjustField].label}
            </DialogTitle>
          </DialogHeader>
          {adjustUser && (
            <div className="space-y-3">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Utilisateur</p>
                <p className="font-bold text-sm">
                  {adjustUser.firstName} (#{adjustUser.id})
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Actuel :{" "}
                  <span className={`font-mono font-bold ${FIELD_META[adjustField].color}`}>
                    {adjustField === "balance"
                      ? adjustUser[adjustField].toFixed(2)
                      : adjustUser[adjustField]}
                    {FIELD_META[adjustField].suffix}
                  </span>
                </p>
              </div>
              <div>
                <Label className="text-xs">Montant</Label>
                <Input
                  type="number"
                  min="0"
                  step={adjustField === "balance" ? "0.01" : "1"}
                  value={adjustDelta}
                  onChange={(e) => setAdjustDelta(e.target.value)}
                  placeholder="0"
                  className="bg-card"
                />
              </div>
              <div>
                <Label className="text-xs">Raison (optionnel)</Label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ex: bonus inscription"
                  className="bg-card"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1 border-red-500/50 text-red-400 hover:bg-red-500/10"
              onClick={() => submitAdjust(-1)}
              disabled={submitting || !adjustDelta}
            >
              <Minus className="w-4 h-4 mr-1" /> Retirer
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => submitAdjust(1)}
              disabled={submitting || !adjustDelta}
            >
              <Plus className="w-4 h-4 mr-1" /> Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <ShieldOff className="w-5 h-5" /> Supprimer définitivement
            </DialogTitle>
          </DialogHeader>
          {deleteUser && (
            <div className="space-y-3">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs">
                <p className="font-bold text-red-300 mb-1">⚠️ Action irréversible</p>
                <p className="text-muted-foreground">
                  Le compte de <span className="font-bold text-foreground">{deleteUser.firstName}</span>{" "}
                  ({deleteUser.email || `#${deleteUser.id}`}) ainsi que toutes ses données (commandes,
                  recharges, transactions, panier, avis) seront supprimés.
                </p>
              </div>
              <div>
                <Label className="text-xs">
                  Pour confirmer, tapez <span className="font-mono font-bold text-red-400">SUPPRIMER</span>
                </Label>
                <Input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder="SUPPRIMER"
                  className="bg-card font-mono"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-row gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={submitDelete}
              disabled={deleting || deleteConfirm !== "SUPPRIMER"}
            >
              <Trash2 className="w-4 h-4 mr-1" /> Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
