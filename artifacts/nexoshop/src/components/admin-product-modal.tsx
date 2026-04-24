import { useEffect, useRef, useState } from "react";
import {
  useAdminCreateProduct,
  useAdminUpdateProduct,
  useAdminListVariants,
  useAdminCreateVariant,
  useAdminUpdateVariant,
  useAdminDeleteVariant,
  useAdminListStock,
  useAdminAddStockBulk,
  useAdminDeleteStockItem,
  getAdminListVariantsQueryKey,
  getAdminListStockQueryKey,
  getAdminGetProductsQueryKey,
} from "@workspace/api-client-react";
import type { Product, ProductVariant } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  Link as LinkIcon,
  Package,
  X,
  Plus,
  Trash2,
  Pencil,
  ClipboardPaste,
  Layers,
  Box,
  Info,
} from "lucide-react";

const CATEGORIES = ["Streaming", "Musique", "IA", "Sport", "Tech", "Spécial"];

const DURATION_PRESETS: Array<{ label: string; days: number; defaultName: string }> = [
  { label: "1 mois", days: 30, defaultName: "1 mois" },
  { label: "3 mois", days: 90, defaultName: "3 mois" },
  { label: "6 mois", days: 180, defaultName: "6 mois" },
  { label: "1 an", days: 365, defaultName: "1 an" },
];

type FormState = {
  name: string;
  category: string;
  description: string;
  price: string;
  deliveryType: "auto" | "manual";
  inStock: boolean;
  imageUrl: string;
  digitalContent: string;
  digitalImageUrl: string;
  requiresCustomerInfo: boolean;
  customerInfoFieldsText: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  category: "Streaming",
  description: "",
  price: "",
  deliveryType: "manual",
  inStock: true,
  imageUrl: "",
  digitalContent: "",
  digitalImageUrl: "",
  requiresCustomerInfo: false,
  customerInfoFieldsText: "",
};

function parseFieldLines(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: Product | null;
  onSaved: () => void;
};

export function AdminProductModal({ open, onOpenChange, editingProduct, onSaved }: Props) {
  const qc = useQueryClient();
  const createProduct = useAdminCreateProduct();
  const updateProduct = useAdminUpdateProduct();

  const [tab, setTab] = useState<"infos" | "variantes" | "stock">("infos");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [digitalImagePreview, setDigitalImagePreview] = useState<string | null>(null);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const digitalFileRef = useRef<HTMLInputElement>(null);

  // Track local product id (for "create then add variants" flow)
  const [localProductId, setLocalProductId] = useState<number | null>(null);
  const productId = editingProduct?.id ?? localProductId;

  useEffect(() => {
    if (!open) return;
    setTab("infos");
    if (editingProduct) {
      setForm({
        name: editingProduct.name,
        category: editingProduct.category,
        description: editingProduct.description,
        price: String(editingProduct.price),
        deliveryType: editingProduct.deliveryType as "auto" | "manual",
        inStock: editingProduct.inStock,
        imageUrl: editingProduct.imageUrl ?? "",
        digitalContent: editingProduct.digitalContent ?? "",
        digitalImageUrl: editingProduct.digitalImageUrl ?? "",
        requiresCustomerInfo: editingProduct.requiresCustomerInfo ?? false,
        customerInfoFieldsText: (editingProduct.customerInfoFields ?? []).join("\n"),
      });
      setImagePreview(editingProduct.imageUrl ?? null);
      setDigitalImagePreview(editingProduct.digitalImageUrl ?? null);
      setLocalProductId(editingProduct.id);
    } else {
      setForm(DEFAULT_FORM);
      setImagePreview(null);
      setDigitalImagePreview(null);
      setLocalProductId(null);
    }
  }, [open, editingProduct]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("nexoshop_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setForm((f) => ({ ...f, imageUrl: url }));
      setImagePreview(url);
      toast.success("Image téléversée !");
    } catch {
      toast.error("Erreur lors du téléversement");
    } finally {
      setUploading(false);
    }
  };

  const handleDigitalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDigital(true);
    try {
      const token = localStorage.getItem("nexoshop_token");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setForm((f) => ({ ...f, digitalImageUrl: url }));
      setDigitalImagePreview(url);
      toast.success("Image de livraison téléversée !");
    } catch {
      toast.error("Erreur lors du téléversement");
    } finally {
      setUploadingDigital(false);
    }
  };

  const buildPayload = () => {
    const price = parseFloat(form.price);
    const fields = parseFieldLines(form.customerInfoFieldsText);
    return {
      name: form.name,
      category: form.category,
      description: form.description,
      price,
      deliveryType: form.deliveryType,
      inStock: form.inStock,
      imageUrl: form.imageUrl || null,
      digitalContent: form.deliveryType === "auto" ? (form.digitalContent || null) : null,
      digitalImageUrl: form.deliveryType === "auto" ? (form.digitalImageUrl || null) : null,
      requiresCustomerInfo: form.requiresCustomerInfo,
      customerInfoFields: form.requiresCustomerInfo ? fields : [],
    };
  };

  const validateInfos = () => {
    if (!form.name || !form.price || !form.category) {
      toast.error("Nom, catégorie et prix sont obligatoires");
      return false;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Prix invalide");
      return false;
    }
    if (form.requiresCustomerInfo && parseFieldLines(form.customerInfoFieldsText).length === 0) {
      toast.error("Ajoutez au moins un champ d'info client");
      return false;
    }
    return true;
  };

  const handleSaveInfos = async (closeAfter: boolean) => {
    if (!validateInfos()) return;
    const payload = buildPayload();
    try {
      if (productId) {
        await updateProduct.mutateAsync({ id: productId, data: payload });
        toast.success("Produit mis à jour !");
      } else {
        const created = await createProduct.mutateAsync({ data: payload });
        setLocalProductId(created.id);
        toast.success("Produit créé ! Ajoute des variantes.");
      }
      qc.invalidateQueries({ queryKey: getAdminGetProductsQueryKey() });
      onSaved();
      if (closeAfter) onOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-md max-h-[92dvh] overflow-y-auto p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle>
            {editingProduct ? "Modifier le produit" : "Nouveau produit"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "infos" | "variantes" | "stock")} className="w-full">
          <div className="px-4 pb-2">
            <TabsList className="w-full grid grid-cols-3 bg-muted/30 h-9">
              <TabsTrigger value="infos" className="text-xs gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Infos
              </TabsTrigger>
              <TabsTrigger value="variantes" className="text-xs gap-1.5" disabled={!productId}>
                <Layers className="w-3.5 h-3.5" />
                Variantes
              </TabsTrigger>
              <TabsTrigger value="stock" className="text-xs gap-1.5" disabled={!productId}>
                <Box className="w-3.5 h-3.5" />
                Stock
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ============ INFOS TAB ============ */}
          <TabsContent value="infos" className="px-4 pb-4 mt-0">
            <div className="flex flex-col gap-4 py-2">
              {/* Image */}
              <div className="flex flex-col gap-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Image</Label>
                {imagePreview && (
                  <div className="relative w-full h-32 rounded-xl overflow-hidden border border-border/50 bg-muted/20">
                    <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setForm((f) => ({ ...f, imageUrl: "" }));
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImageMode("url")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      imageMode === "url" ? "bg-primary/10 border-primary/40 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <LinkIcon className="w-3 h-3" />
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("file")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      imageMode === "file" ? "bg-primary/10 border-primary/40 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted/30"
                    }`}
                  >
                    <Upload className="w-3 h-3" />
                    Fichier
                  </button>
                </div>
                {imageMode === "url" ? (
                  <Input
                    placeholder="https://example.com/image.jpg"
                    value={form.imageUrl}
                    className="bg-background border-border/60 text-sm"
                    onChange={(e) => {
                      setForm((f) => ({ ...f, imageUrl: e.target.value }));
                      setImagePreview(e.target.value || null);
                    }}
                  />
                ) : (
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-border/60 text-sm"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {uploading ? "Téléversement..." : "Choisir une image"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Nom *</Label>
                <Input
                  placeholder="Netflix Premium"
                  value={form.name}
                  className="bg-background border-border/60"
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* Category */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Catégorie *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger className="bg-background border-border/60"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
                <Input
                  placeholder="Description courte..."
                  value={form.description}
                  className="bg-background border-border/60"
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Price */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Prix de base (€) *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="9.99"
                  value={form.price}
                  className="bg-background border-border/60"
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">
                  Prix par défaut. Si tu ajoutes des variantes, c'est leur prix qui sera utilisé.
                </p>
              </div>

              {/* Delivery Type */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Livraison</Label>
                <Select
                  value={form.deliveryType}
                  onValueChange={(v) => setForm((f) => ({ ...f, deliveryType: v as "auto" | "manual" }))}
                >
                  <SelectTrigger className="bg-background border-border/60"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="auto">Automatique</SelectItem>
                    <SelectItem value="manual">Manuelle</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  {form.deliveryType === "auto"
                    ? "Le client reçoit automatiquement un code du pool de stock à chaque achat."
                    : "Tu enverras la commande manuellement depuis l'onglet « Commandes »."}
                </p>
              </div>

              {/* Auto delivery fallback content */}
              {form.deliveryType === "auto" && (
                <div className="flex flex-col gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                      Contenu de secours (sans variante)
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Utilisé seulement pour les anciennes commandes sans variante. Pour les nouveaux produits, utilise les pools de codes via l'onglet Stock.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Texte affiché au client</Label>
                    <Textarea
                      placeholder="Identifiants, lien, code..."
                      value={form.digitalContent}
                      className="bg-background border-border/60 min-h-[80px] text-sm"
                      onChange={(e) => setForm((f) => ({ ...f, digitalContent: e.target.value }))}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Image (optionnel)</Label>
                    {digitalImagePreview && (
                      <div className="relative w-full h-24 rounded-lg overflow-hidden border border-border/50 bg-muted/20">
                        <img src={digitalImagePreview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setDigitalImagePreview(null);
                            setForm((f) => ({ ...f, digitalImageUrl: "" }));
                          }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )}
                    <input ref={digitalFileRef} type="file" accept="image/*" className="hidden" onChange={handleDigitalFileChange} />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-border/60 text-sm"
                      disabled={uploadingDigital}
                      onClick={() => digitalFileRef.current?.click()}
                    >
                      <Upload className="w-3.5 h-3.5 mr-2" />
                      {uploadingDigital ? "Téléversement..." : digitalImagePreview ? "Changer l'image" : "Ajouter une image"}
                    </Button>
                  </div>
                </div>
              )}

              {/* Customer info */}
              <div className="flex flex-col gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">Demander des infos client</Label>
                  <Switch
                    checked={form.requiresCustomerInfo}
                    onCheckedChange={(v) => setForm((f) => ({ ...f, requiresCustomerInfo: v }))}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Le client paiera d'abord, puis pourra remplir ces champs depuis sa commande.
                </p>
                {form.requiresCustomerInfo && (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs text-muted-foreground">Champs (un par ligne)</Label>
                    <Textarea
                      placeholder={"Nom\nEmail\nDate de naissance"}
                      value={form.customerInfoFieldsText}
                      className="bg-background border-border/60 min-h-[80px] text-sm"
                      onChange={(e) => setForm((f) => ({ ...f, customerInfoFieldsText: e.target.value }))}
                    />
                  </div>
                )}
              </div>

              {/* In stock toggle (legacy) */}
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label className="text-sm">Visible / actif</Label>
                  <p className="text-[10px] text-muted-foreground">Désactive pour cacher le produit du shop.</p>
                </div>
                <Switch
                  checked={form.inStock}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, inStock: v }))}
                />
              </div>
            </div>
          </TabsContent>

          {/* ============ VARIANTES TAB ============ */}
          <TabsContent value="variantes" className="px-4 pb-4 mt-0">
            {productId ? (
              <VariantsManager productId={productId} />
            ) : (
              <EmptyTabHint label="Sauvegarde d'abord les infos pour ajouter des variantes." />
            )}
          </TabsContent>

          {/* ============ STOCK TAB ============ */}
          <TabsContent value="stock" className="px-4 pb-4 mt-0">
            {productId ? (
              <StockManager productId={productId} />
            ) : (
              <EmptyTabHint label="Sauvegarde d'abord les infos pour gérer le stock." />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-4 pb-4 pt-2 gap-2 border-t border-border/50 bg-card sticky bottom-0">
          {tab === "infos" ? (
            <>
              <Button variant="outline" className="flex-1 border-border" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              {!productId ? (
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={() => handleSaveInfos(false)}
                  disabled={createProduct.isPending}
                >
                  {createProduct.isPending ? "Création..." : "Créer + variantes"}
                </Button>
              ) : (
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={() => handleSaveInfos(true)}
                  disabled={updateProduct.isPending}
                >
                  {updateProduct.isPending ? "Enregistrement..." : "Enregistrer"}
                </Button>
              )}
            </>
          ) : (
            <Button variant="outline" className="w-full border-border" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmptyTabHint({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
      <Info className="w-8 h-8 opacity-40" />
      <p>{label}</p>
    </div>
  );
}

// ===================== VARIANTS MANAGER =====================

function VariantsManager({ productId }: { productId: number }) {
  const qc = useQueryClient();
  const { data: variants, isLoading } = useAdminListVariants(productId, {
    query: { queryKey: getAdminListVariantsQueryKey(productId) },
  });
  const createVariant = useAdminCreateVariant();
  const updateVariant = useAdminUpdateVariant();
  const deleteVariant = useAdminDeleteVariant();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftDuration, setDraftDuration] = useState<string>("");

  const invalidate = () => qc.invalidateQueries({ queryKey: getAdminListVariantsQueryKey(productId) });

  const startEdit = (v: ProductVariant) => {
    setEditingId(v.id);
    setDraftName(v.name);
    setDraftPrice(String(v.price));
    setDraftDuration(v.durationDays != null ? String(v.durationDays) : "");
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraftName("");
    setDraftPrice("");
    setDraftDuration("");
  };
  const saveEdit = async (v: ProductVariant) => {
    const price = parseFloat(draftPrice);
    if (!draftName.trim() || isNaN(price) || price <= 0) {
      toast.error("Nom et prix valides requis");
      return;
    }
    const dur = draftDuration.trim() ? parseInt(draftDuration, 10) : null;
    try {
      await updateVariant.mutateAsync({
        id: productId,
        variantId: v.id,
        data: {
          name: draftName.trim(),
          price,
          durationDays: dur,
          sortOrder: v.sortOrder,
          isActive: v.isActive,
        },
      });
      toast.success("Variante mise à jour");
      cancelEdit();
      invalidate();
    } catch {
      toast.error("Erreur");
    }
  };

  const addPreset = async (preset: typeof DURATION_PRESETS[number]) => {
    const basePrice = variants && variants.length > 0 ? Number(variants[0].price) : 9.99;
    try {
      await createVariant.mutateAsync({
        id: productId,
        data: {
          name: preset.defaultName,
          durationDays: preset.days,
          price: basePrice,
          sortOrder: (variants?.length ?? 0) * 10,
          isActive: true,
        },
      });
      toast.success(`Variante "${preset.defaultName}" ajoutée`);
      invalidate();
    } catch {
      toast.error("Erreur");
    }
  };

  const addCustom = async () => {
    try {
      await createVariant.mutateAsync({
        id: productId,
        data: {
          name: "Nouvelle variante",
          durationDays: null,
          price: 9.99,
          sortOrder: (variants?.length ?? 0) * 10,
          isActive: true,
        },
      });
      toast.success("Variante ajoutée");
      invalidate();
    } catch {
      toast.error("Erreur");
    }
  };

  const toggleActive = async (v: ProductVariant) => {
    try {
      await updateVariant.mutateAsync({
        id: productId,
        variantId: v.id,
        data: {
          name: v.name,
          price: Number(v.price),
          durationDays: v.durationDays,
          sortOrder: v.sortOrder,
          isActive: !v.isActive,
        },
      });
      invalidate();
    } catch {
      toast.error("Erreur");
    }
  };

  const handleDelete = async (v: ProductVariant) => {
    if (!confirm(`Supprimer la variante "${v.name}" et tout son stock ?`)) return;
    try {
      await deleteVariant.mutateAsync({ id: productId, variantId: v.id });
      toast.success("Variante supprimée");
      invalidate();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Presets */}
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-muted/20 border border-border/50">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Ajout rapide</Label>
        <div className="grid grid-cols-2 gap-2">
          {DURATION_PRESETS.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs border-border/60"
              onClick={() => addPreset(p)}
              disabled={createVariant.isPending}
            >
              + {p.label}
            </Button>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 text-xs border-dashed border-primary/40 text-primary"
          onClick={addCustom}
          disabled={createVariant.isPending}
        >
          <Plus className="w-3 h-3 mr-1" />
          Variante personnalisée
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Chargement...</p>
      ) : !variants || variants.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">
          Aucune variante. Utilise les boutons ci-dessus pour en ajouter une.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {variants.map((v) => (
            <div
              key={v.id}
              className={`p-3 rounded-xl border ${v.isActive ? "border-border/60 bg-background/50" : "border-border/30 bg-muted/10 opacity-60"}`}
            >
              {editingId === v.id ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={draftName}
                    placeholder="Nom"
                    className="bg-background border-border/60 h-8 text-sm"
                    onChange={(e) => setDraftName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={draftPrice}
                      placeholder="Prix €"
                      className="bg-background border-border/60 h-8 text-sm"
                      onChange={(e) => setDraftPrice(e.target.value)}
                    />
                    <Input
                      type="number"
                      value={draftDuration}
                      placeholder="Jours (optionnel)"
                      className="bg-background border-border/60 h-8 text-sm"
                      onChange={(e) => setDraftDuration(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={cancelEdit}>
                      Annuler
                    </Button>
                    <Button size="sm" className="flex-1 h-7 text-xs bg-primary" onClick={() => saveEdit(v)}>
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{v.name}</p>
                      {v.durationDays && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5">
                          {v.durationDays}j
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-primary font-semibold">{Number(v.price).toFixed(2)}€</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className={`text-[10px] ${v.stockCount > 0 ? "text-green-400" : "text-red-400"}`}>
                        {v.stockCount} en stock
                      </span>
                    </div>
                  </div>
                  <Switch checked={v.isActive} onCheckedChange={() => toggleActive(v)} />
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(v)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-red-400 hover:text-red-300"
                    onClick={() => handleDelete(v)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ===================== STOCK MANAGER =====================

function StockManager({ productId }: { productId: number }) {
  const qc = useQueryClient();
  const { data: variants } = useAdminListVariants(productId, {
    query: { queryKey: getAdminListVariantsQueryKey(productId) },
  });
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  useEffect(() => {
    if (variants && variants.length > 0 && selectedVariantId == null) {
      setSelectedVariantId(variants[0].id);
    }
  }, [variants, selectedVariantId]);

  if (!variants || variants.length === 0) {
    return <EmptyTabHint label="Crée d'abord une variante dans l'onglet Variantes." />;
  }

  return (
    <div className="flex flex-col gap-3 py-2">
      {/* Variant selector */}
      <div className="flex flex-col gap-1.5">
        <Label className="text-xs text-muted-foreground uppercase tracking-wider">Variante</Label>
        <Select
          value={selectedVariantId != null ? String(selectedVariantId) : ""}
          onValueChange={(v) => setSelectedVariantId(parseInt(v, 10))}
        >
          <SelectTrigger className="bg-background border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {variants.map((v) => (
              <SelectItem key={v.id} value={String(v.id)}>
                {v.name} — {Number(v.price).toFixed(2)}€ ({v.stockCount} dispo)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedVariantId != null && (
        <StockPool
          productId={productId}
          variantId={selectedVariantId}
          onChanged={() => {
            qc.invalidateQueries({ queryKey: getAdminListVariantsQueryKey(productId) });
            qc.invalidateQueries({ queryKey: getAdminListStockQueryKey(productId, selectedVariantId) });
          }}
        />
      )}
    </div>
  );
}

function StockPool({
  productId,
  variantId,
  onChanged,
}: {
  productId: number;
  variantId: number;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const { data: items, isLoading } = useAdminListStock(productId, variantId, {
    query: { queryKey: getAdminListStockQueryKey(productId, variantId) },
  });
  const addBulk = useAdminAddStockBulk();
  const deleteItem = useAdminDeleteStockItem();

  const [paste, setPaste] = useState("");

  const available = items?.filter((i) => i.status === "available").length ?? 0;
  const sold = items?.filter((i) => i.status === "sold").length ?? 0;

  const handlePaste = async () => {
    const codes = paste.split("\n").map((s) => s.trim()).filter((s) => s.length > 0);
    if (codes.length === 0) {
      toast.error("Colle au moins une ligne");
      return;
    }
    try {
      const res = await addBulk.mutateAsync({
        id: productId,
        variantId,
        data: { codes },
      });
      const skippedMsg = res.skipped && res.skipped > 0 ? ` (${res.skipped} doublon${res.skipped > 1 ? "s" : ""} ignoré${res.skipped > 1 ? "s" : ""})` : "";
      toast.success(`${res.added} code${res.added > 1 ? "s" : ""} ajouté${res.added > 1 ? "s" : ""}${skippedMsg}. Total dispo : ${res.available}`);
      setPaste("");
      qc.invalidateQueries({ queryKey: getAdminListStockQueryKey(productId, variantId) });
      onChanged();
    } catch {
      toast.error("Erreur lors de l'ajout");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Supprimer ce code ?")) return;
    try {
      await deleteItem.mutateAsync({ id: productId, variantId, stockId: id });
      qc.invalidateQueries({ queryKey: getAdminListStockQueryKey(productId, variantId) });
      onChanged();
    } catch {
      toast.error("Erreur");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl border border-green-500/30 bg-green-500/5">
          <p className="text-[10px] uppercase text-green-400/80 font-semibold">Disponibles</p>
          <p className="text-2xl font-bold text-green-400">{available}</p>
        </div>
        <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold">Vendus</p>
          <p className="text-2xl font-bold">{sold}</p>
        </div>
      </div>

      {/* Bulk paste */}
      <div className="flex flex-col gap-2 p-3 rounded-xl bg-primary/5 border border-primary/20">
        <div className="flex items-center gap-2">
          <ClipboardPaste className="w-4 h-4 text-primary" />
          <Label className="text-xs font-semibold uppercase tracking-wider text-primary">
            Coller des codes
          </Label>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Un code/compte par ligne. Ils seront vendus dans l'ordre (FIFO).
        </p>
        <Textarea
          placeholder={"login1:pass1\nlogin2:pass2\nlogin3:pass3"}
          value={paste}
          className="bg-background border-border/60 min-h-[100px] text-xs font-mono"
          onChange={(e) => setPaste(e.target.value)}
        />
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90"
          onClick={handlePaste}
          disabled={addBulk.isPending}
        >
          {addBulk.isPending ? "Ajout..." : "Ajouter au stock"}
        </Button>
      </div>

      {/* Pool list */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-4">Chargement...</p>
      ) : !items || items.length === 0 ? (
        <div className="text-center py-4 text-xs text-muted-foreground">
          Pool vide. Colle des codes ci-dessus.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
          {items.map((it) => (
            <div
              key={it.id}
              className={`flex items-center gap-2 p-2 rounded-lg border ${
                it.status === "available"
                  ? "border-border/40 bg-background/50"
                  : "border-border/20 bg-muted/10 opacity-50"
              }`}
            >
              <Badge
                variant={it.status === "available" ? "default" : "secondary"}
                className={`text-[9px] h-4 px-1.5 ${
                  it.status === "available" ? "bg-green-500/20 text-green-400 border-green-500/30" : ""
                }`}
              >
                {it.status === "available" ? "Dispo" : "Vendu"}
              </Badge>
              <code className="flex-1 text-xs truncate font-mono">{it.content}</code>
              {it.status === "available" && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 text-red-400 hover:text-red-300"
                  onClick={() => handleDelete(it.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
