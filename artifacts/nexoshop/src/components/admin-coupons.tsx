import { useState } from "react";
import {
  useAdminListCoupons,
  useAdminCreateCoupon,
  useAdminUpdateCoupon,
  useAdminDeleteCoupon,
  useAdminResetCouponUses,
  getAdminListCouponsQueryKey,
  type AdminCoupon,
  type AdminCouponBody,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  Ticket,
  Percent,
  Euro,
  User as UserIcon,
  Calendar,
  Power,
} from "lucide-react";
import { toast } from "sonner";

type FormState = {
  code: string;
  description: string;
  type: "percent" | "amount";
  value: string;
  maxUses: string;
  maxUsesPerUser: string;
  minOrderAmount: string;
  startsAt: string;
  expiresAt: string;
  restrictedToUserId: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  code: "",
  description: "",
  type: "percent",
  value: "",
  maxUses: "1",
  maxUsesPerUser: "1",
  minOrderAmount: "0",
  startsAt: "",
  expiresAt: "",
  restrictedToUserId: "",
  isActive: true,
};

function toLocalDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  // yyyy-MM-ddTHH:mm in local time
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDateTimeInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function AdminCoupons() {
  const qc = useQueryClient();
  const { data: coupons, isLoading } = useAdminListCoupons();
  const createMut = useAdminCreateCoupon();
  const updateMut = useAdminUpdateCoupon();
  const deleteMut = useAdminDeleteCoupon();
  const resetMut = useAdminResetCouponUses();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCoupon | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const invalidate = () => qc.invalidateQueries({ queryKey: getAdminListCouponsQueryKey() });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (c: AdminCoupon) => {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description ?? "",
      type: c.type as "percent" | "amount",
      value: String(c.value),
      maxUses: String(c.maxUses),
      maxUsesPerUser: String(c.maxUsesPerUser),
      minOrderAmount: String(c.minOrderAmount),
      startsAt: toLocalDateTimeInput(c.startsAt),
      expiresAt: toLocalDateTimeInput(c.expiresAt),
      restrictedToUserId: c.restrictedToUserId != null ? String(c.restrictedToUserId) : "",
      isActive: c.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase();
    const value = parseFloat(form.value);
    if (!code || !Number.isFinite(value) || value <= 0) {
      toast.error("Code et valeur sont obligatoires");
      return;
    }
    if (form.type === "percent" && value > 100) {
      toast.error("Le pourcentage ne peut pas dépasser 100");
      return;
    }
    const maxUses = Math.max(1, parseInt(form.maxUses) || 1);
    const maxUsesPerUser = Math.max(0, parseInt(form.maxUsesPerUser) || 0);
    const minOrderAmount = Math.max(0, parseFloat(form.minOrderAmount) || 0);
    const restrictedToUserId = form.restrictedToUserId.trim()
      ? parseInt(form.restrictedToUserId)
      : null;
    if (form.restrictedToUserId.trim() && (!restrictedToUserId || restrictedToUserId <= 0)) {
      toast.error("ID utilisateur invalide");
      return;
    }

    const payload: AdminCouponBody = {
      code,
      description: form.description.trim() || null,
      type: form.type,
      value,
      maxUses,
      maxUsesPerUser,
      minOrderAmount,
      startsAt: fromLocalDateTimeInput(form.startsAt),
      expiresAt: fromLocalDateTimeInput(form.expiresAt),
      restrictedToUserId,
      isActive: form.isActive,
    };

    try {
      if (editing) {
        const { code: _omit, ...rest } = payload;
        await updateMut.mutateAsync({ code: editing.code, data: rest });
        toast.success("Coupon mis à jour");
      } else {
        await createMut.mutateAsync({ data: payload });
        toast.success("Coupon créé");
      }
      setDialogOpen(false);
      invalidate();
    } catch (err) {
      const e = err as { response?: { data?: { error?: string } } };
      toast.error(e?.response?.data?.error ?? "Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (c: AdminCoupon) => {
    if (!confirm(`Supprimer le coupon ${c.code} ?`)) return;
    try {
      await deleteMut.mutateAsync({ code: c.code });
      toast.success("Coupon supprimé");
      invalidate();
    } catch {
      toast.error("Erreur de suppression");
    }
  };

  const handleResetUses = async (c: AdminCoupon) => {
    if (!confirm(`Réinitialiser le compteur d'utilisations de ${c.code} ?`)) return;
    try {
      await resetMut.mutateAsync({ code: c.code });
      toast.success("Compteur réinitialisé");
      invalidate();
    } catch {
      toast.error("Erreur de réinitialisation");
    }
  };

  const handleToggleActive = async (c: AdminCoupon) => {
    try {
      await updateMut.mutateAsync({ code: c.code, data: { isActive: !c.isActive } });
      invalidate();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Button size="sm" onClick={openCreate} className="w-full bg-primary hover:bg-primary/90">
        <Plus className="w-4 h-4 mr-1" />
        Nouveau coupon
      </Button>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/20 animate-pulse border border-border/30" />
          ))}
        </div>
      ) : !coupons || coupons.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl flex flex-col items-center gap-2">
          <Ticket className="w-8 h-8 text-muted-foreground/30" />
          <p className="text-sm">Aucun coupon créé</p>
          <p className="text-xs text-muted-foreground/60">Crée ton premier code promo</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {coupons.map((c) => {
            const isExpired = c.expiresAt && new Date(c.expiresAt) < new Date();
            const isExhausted = c.currentUses >= c.maxUses;
            const usagePct = Math.min(100, Math.round((c.currentUses / Math.max(1, c.maxUses)) * 100));
            return (
              <Card key={c.code} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-3 flex flex-col gap-2">
                  {/* Top row: code + status + actions */}
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm tracking-wider">{c.code}</span>
                        {c.type === "percent" ? (
                          <Badge className="bg-blue-500/15 text-blue-300 border-blue-500/30 text-[10px] gap-0.5 h-5">
                            <Percent className="w-3 h-3" />
                            {c.value}%
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px] gap-0.5 h-5">
                            <Euro className="w-3 h-3" />
                            -{c.value.toFixed(2)}€
                          </Badge>
                        )}
                        {!c.isActive && (
                          <Badge className="bg-muted/30 text-muted-foreground border-border/40 text-[10px] h-5">Inactif</Badge>
                        )}
                        {isExpired && (
                          <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-[10px] h-5">Expiré</Badge>
                        )}
                        {isExhausted && !isExpired && (
                          <Badge className="bg-orange-500/15 text-orange-400 border-orange-500/30 text-[10px] h-5">Épuisé</Badge>
                        )}
                      </div>
                      {c.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 truncate">{c.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Switch
                        checked={c.isActive}
                        onCheckedChange={() => handleToggleActive(c)}
                        title={c.isActive ? "Désactiver" : "Activer"}
                      />
                    </div>
                  </div>

                  {/* Middle: usage bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Utilisations</span>
                      <span className="font-mono">{c.currentUses} / {c.maxUses}</span>
                    </div>
                    <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${isExhausted ? "bg-orange-500" : "bg-primary"}`}
                        style={{ width: `${usagePct}%` }}
                      />
                    </div>
                  </div>

                  {/* Conditions row */}
                  <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                    {c.maxUsesPerUser > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/20 border border-border/30">
                        <UserIcon className="w-2.5 h-2.5" />
                        {c.maxUsesPerUser}× / user
                      </span>
                    )}
                    {c.minOrderAmount > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/20 border border-border/30">
                        Min {c.minOrderAmount.toFixed(2)}€
                      </span>
                    )}
                    {c.restrictedToUserId && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300">
                        <UserIcon className="w-2.5 h-2.5" />
                        User #{c.restrictedToUserId}
                      </span>
                    )}
                    {c.expiresAt && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/20 border border-border/30">
                        <Calendar className="w-2.5 h-2.5" />
                        Exp. {new Date(c.expiresAt).toLocaleDateString("fr-FR")}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1 pt-1 border-t border-border/30">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs flex-1 hover:bg-primary/10 hover:text-primary"
                      onClick={() => openEdit(c)}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Éditer
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs flex-1 hover:bg-blue-500/10 hover:text-blue-400"
                      onClick={() => handleResetUses(c)}
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs flex-1 hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => handleDelete(c)}
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Suppr.
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-primary" />
              {editing ? `Éditer ${editing.code}` : "Nouveau coupon"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Code *</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME10"
                disabled={!!editing}
                className="font-mono uppercase"
              />
            </div>

            <div>
              <Label className="text-xs">Description (optionnel)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Réduction de bienvenue"
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as "percent" | "amount" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">
                      <span className="flex items-center gap-2"><Percent className="w-3 h-3" /> Pourcentage</span>
                    </SelectItem>
                    <SelectItem value="amount">
                      <span className="flex items-center gap-2"><Euro className="w-3 h-3" /> Montant fixe</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valeur * ({form.type === "percent" ? "%" : "€"})</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={form.type === "percent" ? "10" : "5.00"}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Utilisations max (total)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Max par utilisateur</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.maxUsesPerUser}
                  onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })}
                  placeholder="0 = illimité"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Commande minimum (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                placeholder="0 = aucun minimum"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Début (optionnel)</Label>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Expiration (optionnel)</Label>
                <Input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">Réservé à un utilisateur (ID, optionnel)</Label>
              <Input
                type="number"
                min="1"
                value={form.restrictedToUserId}
                onChange={(e) => setForm({ ...form, restrictedToUserId: e.target.value })}
                placeholder="Vide = tous les utilisateurs"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border border-border/40 bg-muted/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <Power className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm cursor-pointer" htmlFor="active-switch">Actif</Label>
              </div>
              <Switch
                id="active-switch"
                checked={form.isActive}
                onCheckedChange={(v) => setForm({ ...form, isActive: v })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="flex-1">
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {editing ? "Mettre à jour" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
