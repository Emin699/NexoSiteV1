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
  useGetCategories,
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
  Sparkles,
  CheckCircle2,
  ImageIcon,
  Tag,
  Euro,
  Truck,
  Users,
  Eye,
  EyeOff,
} from "lucide-react";

const CATEGORIES_FALLBACK = ["Streaming", "Musique", "IA", "Sport", "Tech", "Spécial"];

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
  unlimitedStock: boolean;
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
  deliveryType: "auto",
  inStock: true,
  unlimitedStock: false,
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

interface AdminProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProduct: Product | null;
}

export function AdminProductModal({ open, onOpenChange, editingProduct }: AdminProductModalProps) {
  const qc = useQueryClient();
  const createProduct = useAdminCreateProduct();
  const updateProduct = useAdminUpdateProduct();
  const { data: categoriesData } = useGetCategories();
  const categories =
    categoriesData && categoriesData.length > 0
      ? categoriesData.map((c) => c.name)
      : CATEGORIES_FALLBACK;

  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [digitalImagePreview, setDigitalImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingDigital, setUploadingDigital] = useState(false);
  const [productId, setProductId] = useState<number | null>(null);
  const [tab, setTab] = useState<"infos" | "variantes" | "stock">("infos");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const digitalFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      if (editingProduct) {
        setForm({
          name: editingProduct.name,
          category: editingProduct.category,
          description: editingProduct.description ?? "",
          price: String(editingProduct.price),
          deliveryType: editingProduct.deliveryType,
          inStock: editingProduct.inStock,
          unlimitedStock: !!editingProduct.unlimitedStock,
          imageUrl: editingProduct.imageUrl ?? "",
          digitalContent: editingProduct.digitalContent ?? "",
          digitalImageUrl: editingProduct.digitalImageUrl ?? "",
          requiresCustomerInfo: editingProduct.requiresCustomerInfo,
          customerInfoFieldsText: (editingProduct.customerInfoFields ?? []).join("\n"),
        });
        setImagePreview(editingProduct.imageUrl ?? null);
        setDigitalImagePreview(editingProduct.digitalImageUrl ?? null);
        setProductId(editingProduct.id);
      } else {
        setForm(DEFAULT_FORM);
        setImagePreview(null);
        setDigitalImagePreview(null);
        setProductId(null);
      }
      setTab("infos");
    }
  }, [open, editingProduct]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("nexoshop_token");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setForm((f) => ({ ...f, imageUrl: url }));
      setImagePreview(url);
      toast.success("Image téléversée");
    } catch {
      toast.error("Erreur d'upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDigitalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDigital(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const token = localStorage.getItem("nexoshop_token");
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setForm((f) => ({ ...f, digitalImageUrl: url }));
      setDigitalImagePreview(url);
      toast.success("Image téléversée");
    } catch {
      toast.error("Erreur d'upload");
    } finally {
      setUploadingDigital(false);
    }
  };

  const buildPayload = () => {
    const priceNum = parseFloat(form.price);
    return {
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      price: isNaN(priceNum) ? 0 : priceNum,
      deliveryType: form.deliveryType,
      inStock: form.inStock,
      unlimitedStock: form.unlimitedStock,
      imageUrl: form.imageUrl.trim() || null,
      digitalContent: form.digitalContent.trim() || null,
      digitalImageUrl: form.digitalImageUrl.trim() || null,
      requiresCustomerInfo: form.requiresCustomerInfo,
      customerInfoFields: form.requiresCustomerInfo ? parseFieldLines(form.customerInfoFieldsText) : [],
    };
  };

  const validateInfos = () => {
    if (!form.name.trim()) return "Nom requis";
    if (!form.category) return "Catégorie requise";
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum <= 0) return "Prix invalide";
    if (form.requiresCustomerInfo && parseFieldLines(form.customerInfoFieldsText).length === 0) {
      return "Liste des champs client vide";
    }
    return null;
  };

  const handleSaveInfos = async (closeAfter: boolean) => {
    const err = validateInfos();
    if (err) {
      toast.error(err);
      return;
    }
    const payload = buildPayload();
    try {
      if (editingProduct || productId) {
        const id = (editingProduct?.id ?? productId)!;
        await updateProduct.mutateAsync({ id, data: payload });
        toast.success("Produit mis à jour");
      } else {
        const created = await createProduct.mutateAsync({ data: payload });
        setProductId(created.id);
        toast.success("Produit créé — ajoute des variantes");
        setTab("variantes");
      }
      qc.invalidateQueries({ queryKey: getAdminGetProductsQueryKey() });
      if (closeAfter) onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la sauvegarde");
    }
  };

  const isEditing = Boolean(editingProduct || productId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-b from-card to-card/95 border-border/60 max-w-2xl max-h-[94dvh] overflow-y-auto p-0 shadow-2xl shadow-primary/10">
        {/* Header gradient */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/30">
              {isEditing ? (
                <Pencil className="w-5 h-5 text-white" />
              ) : (
                <Sparkles className="w-5 h-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-bold leading-tight">
                {isEditing ? "Modifier le produit" : "Nouveau produit"}
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEditing
                  ? `${editingProduct?.name ?? (form.name || "Produit")} · ${form.category}`
                  : "Configure les infos, puis ajoute variantes et stock"}
              </p>
            </div>
            {isEditing && (
              <Badge className="bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Sauvegardé
              </Badge>
            )}
          </div>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "infos" | "variantes" | "stock")} className="w-full">
          {/* Tabs en pill */}
          <div className="px-6 pt-4 pb-2">
            <TabsList className="w-full grid grid-cols-3 bg-muted/40 h-11 p-1 rounded-xl">
              <TabsTrigger
                value="infos"
                className="text-sm gap-2 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-primary/30"
              >
                <Info className="w-4 h-4" />
                <span className="hidden sm:inline">Infos</span>
              </TabsTrigger>
              <TabsTrigger
                value="variantes"
                disabled={!productId}
                className="text-sm gap-2 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-primary/30"
              >
                <Layers className="w-4 h-4" />
                <span className="hidden sm:inline">Variantes</span>
              </TabsTrigger>
              <TabsTrigger
                value="stock"
                disabled={!productId}
                className="text-sm gap-2 rounded-lg data-[state=active]:bg-gradient-to-br data-[state=active]:from-primary data-[state=active]:to-primary/80 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-primary/30"
              >
                <Box className="w-4 h-4" />
                <span className="hidden sm:inline">Stock</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ============ INFOS TAB ============ */}
          <TabsContent value="infos" className="px-6 pb-6 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 py-4">
              {/* === COL 1 : Image + Visibilité === */}
              <div className="flex flex-col gap-5">
                {/* Image */}
                <SectionCard icon={<ImageIcon className="w-3.5 h-3.5" />} title="Image principale">
                  {imagePreview && (
                    <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-border/50 bg-muted/20 mb-3">
                      <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setForm((f) => ({ ...f, imageUrl: "" }));
                        }}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur flex items-center justify-center hover:bg-black/90 transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => setImageMode("url")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                        imageMode === "url"
                          ? "bg-primary/15 border-primary/50 text-primary"
                          : "border-border/50 text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode("file")}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium border transition-all ${
                        imageMode === "file"
                          ? "bg-primary/15 border-primary/50 text-primary"
                          : "border-border/50 text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Fichier
                    </button>
                  </div>
                  {imageMode === "url" ? (
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={form.imageUrl}
                      className="bg-background border-border/60 text-sm h-9"
                      onChange={(e) => {
                        setForm((f) => ({ ...f, imageUrl: e.target.value }));
                        setImagePreview(e.target.value || null);
                      }}
                    />
                  ) : (
                    <>
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-border/60 h-9"
                        disabled={uploading}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? "Téléversement..." : "Choisir une image"}
                      </Button>
                    </>
                  )}
                </SectionCard>

                {/* Disponibilité (stock) */}
                <SectionCard
                  icon={form.inStock ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  title="Disponibilité"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${form.inStock ? "text-emerald-400" : "text-red-500"}`}>
                        {form.inStock ? "En stock" : "Plus de stock"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {form.inStock
                          ? "Le produit est visible et achetable par les clients."
                          : "Le produit reste visible mais affiche « Plus de stock » et l'achat est bloqué."}
                      </p>
                    </div>
                    <Switch
                      checked={form.inStock}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, inStock: v }))}
                    />
                  </div>
                </SectionCard>

                {/* Stock illimité */}
                <SectionCard icon={<Package className="w-3.5 h-3.5" />} title="Stock illimité" accent={form.unlimitedStock ? "primary" : undefined}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {form.unlimitedStock ? "Illimité — pas de pool" : "Stock géré par variantes"}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {form.unlimitedStock
                          ? "Le produit reste vendable même sans stock dans la table. Le contenu de secours sera livré."
                          : "Chaque vente consomme un code du pool de la variante (livraison automatique)."}
                      </p>
                    </div>
                    <Switch
                      checked={form.unlimitedStock}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, unlimitedStock: v }))}
                    />
                  </div>
                </SectionCard>
              </div>

              {/* === COL 2 : Infos + Prix === */}
              <div className="flex flex-col gap-5">
                {/* Infos générales */}
                <SectionCard icon={<Tag className="w-3.5 h-3.5" />} title="Identité">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Nom *</Label>
                      <Input
                        placeholder="Netflix Premium"
                        value={form.name}
                        className="bg-background border-border/60 h-9"
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Catégorie *</Label>
                      <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                        <SelectTrigger className="bg-background border-border/60 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                          {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        Gérer les catégories depuis la page Admin → onglet Catégories.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Description</Label>
                      <Textarea
                        placeholder={"Description du produit. Tu peux utiliser :\n**texte en gras**, *italique*, `code`\n\nNouveau paragraphe."}
                        value={form.description}
                        className="bg-background border-border/60 text-sm min-h-[140px] font-mono leading-relaxed"
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Mise en forme : <code className="text-primary">**gras**</code>{" "}
                        <code className="text-primary">*italique*</code>{" "}
                        <code className="text-primary">`code`</code> · Sauter une ligne pour un paragraphe.
                      </p>
                    </div>
                  </div>
                </SectionCard>

                {/* Prix + Livraison */}
                <SectionCard icon={<Euro className="w-3.5 h-3.5" />} title="Prix & livraison">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Prix de base (€) *</Label>
                      <div className="relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="9.99"
                          value={form.price}
                          className="bg-background border-border/60 h-9 pl-8 font-mono font-semibold"
                          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                        />
                        <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Si tu ajoutes des variantes, leur prix prend le dessus.
                      </p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Truck className="w-3 h-3" /> Livraison
                      </Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, deliveryType: "auto" }))}
                          className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                            form.deliveryType === "auto"
                              ? "bg-primary/15 border-primary/50 text-primary"
                              : "border-border/50 text-muted-foreground hover:bg-muted/30"
                          }`}
                        >
                          Automatique
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm((f) => ({ ...f, deliveryType: "manual" }))}
                          className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all ${
                            form.deliveryType === "manual"
                              ? "bg-primary/15 border-primary/50 text-primary"
                              : "border-border/50 text-muted-foreground hover:bg-muted/30"
                          }`}
                        >
                          Manuelle
                        </button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {form.deliveryType === "auto"
                          ? "Code envoyé instantanément depuis le pool de stock."
                          : "Tu envoies la commande à la main depuis l'admin."}
                      </p>
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* Section large : Customer info */}
              <div className="md:col-span-2">
                <SectionCard
                  icon={<Users className="w-3.5 h-3.5" />}
                  title="Infos client"
                  accent="amber"
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-[11px] text-muted-foreground flex-1">
                      Demande des informations au client après achat (nom, email, etc).
                    </p>
                    <Switch
                      checked={form.requiresCustomerInfo}
                      onCheckedChange={(v) => setForm((f) => ({ ...f, requiresCustomerInfo: v }))}
                    />
                  </div>
                  {form.requiresCustomerInfo && (
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Champs (un par ligne)</Label>
                      <Textarea
                        placeholder={"Nom\nEmail\nDate de naissance"}
                        value={form.customerInfoFieldsText}
                        className="bg-background border-border/60 min-h-[80px] text-sm"
                        onChange={(e) => setForm((f) => ({ ...f, customerInfoFieldsText: e.target.value }))}
                      />
                    </div>
                  )}
                </SectionCard>
              </div>

              {/* Section large : Auto delivery fallback */}
              {form.deliveryType === "auto" && (
                <div className="md:col-span-2">
                  <SectionCard
                    icon={<Package className="w-3.5 h-3.5" />}
                    title="Contenu de secours (sans variante)"
                    accent="primary"
                  >
                    <p className="text-[11px] text-muted-foreground mb-3">
                      Utilisé seulement pour les vieux produits sans variante. Les nouveaux passent par les pools de codes (onglet Stock).
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] text-muted-foreground">Texte affiché au client</Label>
                        <Textarea
                          placeholder="Identifiants, lien, code..."
                          value={form.digitalContent}
                          className="bg-background border-border/60 min-h-[90px] text-sm font-mono"
                          onChange={(e) => setForm((f) => ({ ...f, digitalContent: e.target.value }))}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[11px] text-muted-foreground">Image (optionnel)</Label>
                        {digitalImagePreview ? (
                          <div className="relative w-full h-[90px] rounded-lg overflow-hidden border border-border/50 bg-muted/20">
                            <img src={digitalImagePreview} alt="" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => {
                                setDigitalImagePreview(null);
                                setForm((f) => ({ ...f, digitalImageUrl: "" }));
                              }}
                              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center hover:bg-black/90"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <input ref={digitalFileRef} type="file" accept="image/*" className="hidden" onChange={handleDigitalFileChange} />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full border-border/60 h-[90px] border-dashed text-muted-foreground"
                              disabled={uploadingDigital}
                              onClick={() => digitalFileRef.current?.click()}
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              {uploadingDigital ? "Téléversement..." : "Ajouter une image"}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </SectionCard>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ============ VARIANTES TAB ============ */}
          <TabsContent value="variantes" className="px-6 pb-6 mt-0">
            {productId ? (
              <VariantsManager productId={productId} />
            ) : (
              <EmptyTabHint label="Sauvegarde d'abord les infos pour ajouter des variantes." />
            )}
          </TabsContent>

          {/* ============ STOCK TAB ============ */}
          <TabsContent value="stock" className="px-6 pb-6 mt-0">
            {productId ? (
              <StockManager productId={productId} />
            ) : (
              <EmptyTabHint label="Sauvegarde d'abord les infos pour gérer le stock." />
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="px-6 py-4 gap-2 border-t border-border/40 bg-card/95 backdrop-blur sticky bottom-0">
          {tab === "infos" ? (
            <>
              <Button
                variant="outline"
                className="flex-1 border-border h-10"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              {!isEditing ? (
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md shadow-primary/30 h-10 font-semibold"
                  onClick={() => handleSaveInfos(false)}
                  disabled={createProduct.isPending}
                >
                  {createProduct.isPending ? "Création..." : "Créer & continuer"}
                </Button>
              ) : (
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md shadow-primary/30 h-10 font-semibold"
                  onClick={() => handleSaveInfos(true)}
                  disabled={updateProduct.isPending}
                >
                  {updateProduct.isPending ? "Sauvegarde..." : "Enregistrer"}
                </Button>
              )}
            </>
          ) : (
            <Button
              variant="outline"
              className="flex-1 border-border h-10"
              onClick={() => onOpenChange(false)}
            >
              Fermer
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================== HELPERS =====================

function SectionCard({
  icon,
  title,
  accent,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: "primary" | "amber";
  children: React.ReactNode;
}) {
  const accentClass =
    accent === "primary"
      ? "border-primary/25 bg-primary/5"
      : accent === "amber"
        ? "border-amber-500/25 bg-amber-500/5"
        : "border-border/50 bg-background/40";
  const iconClass =
    accent === "primary"
      ? "text-primary bg-primary/15"
      : accent === "amber"
        ? "text-amber-400 bg-amber-500/15"
        : "text-muted-foreground bg-muted/40";

  return (
    <div className={`rounded-xl border ${accentClass} p-4`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center ${iconClass}`}>
          {icon}
        </div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function EmptyTabHint({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="w-14 h-14 rounded-full bg-muted/30 flex items-center justify-center">
        <Info className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground max-w-xs">{label}</p>
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

  const totalVariants = variants?.length ?? 0;
  const activeCount = variants?.filter((v) => v.isActive).length ?? 0;

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Stats header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-sm font-bold">Variantes du produit</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {totalVariants} variante{totalVariants > 1 ? "s" : ""} · {activeCount} active{activeCount > 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Quick add */}
      <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-primary/15 text-primary flex items-center justify-center">
            <Plus className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80">Ajout rapide</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {DURATION_PRESETS.map((p) => (
            <Button
              key={p.label}
              type="button"
              variant="outline"
              size="sm"
              className="h-10 text-xs border-border/60 bg-background/60 hover:bg-primary/10 hover:border-primary/50 hover:text-primary font-medium"
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
          className="w-full mt-2 h-10 text-xs border-dashed border-primary/40 text-primary hover:bg-primary/10"
          onClick={addCustom}
          disabled={createVariant.isPending}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Variante personnalisée
        </Button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground text-center py-6">Chargement...</p>
      ) : !variants || variants.length === 0 ? (
        <div className="text-center py-10 text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl">
          Aucune variante. Utilise les boutons ci-dessus pour en ajouter.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {variants.map((v) => (
            <div
              key={v.id}
              className={`group rounded-xl border transition-all ${
                v.isActive
                  ? "border-border/60 bg-background/60 hover:border-primary/40"
                  : "border-border/30 bg-muted/10 opacity-60"
              }`}
            >
              {editingId === v.id ? (
                <div className="p-3 flex flex-col gap-2">
                  <Input
                    value={draftName}
                    placeholder="Nom de la variante"
                    className="bg-background border-border/60 h-9 text-sm"
                    onChange={(e) => setDraftName(e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        value={draftPrice}
                        placeholder="Prix"
                        className="bg-background border-border/60 h-9 pl-7 text-sm font-mono"
                        onChange={(e) => setDraftPrice(e.target.value)}
                      />
                      <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <Input
                      type="number"
                      value={draftDuration}
                      placeholder="Jours (vide = illimité)"
                      className="bg-background border-border/60 h-9 text-sm"
                      onChange={(e) => setDraftDuration(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={cancelEdit}>
                      Annuler
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 h-8 text-xs bg-gradient-to-r from-primary to-secondary"
                      onClick={() => saveEdit(v)}
                    >
                      Sauvegarder
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="p-3 flex items-center gap-3">
                  {/* Icon coloré durée */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    v.durationDays
                      ? "bg-gradient-to-br from-primary/20 to-secondary/20 text-primary border border-primary/30"
                      : "bg-muted/40 text-muted-foreground border border-border/50"
                  }`}>
                    {v.durationDays ? `${Math.round(v.durationDays / 30)}M` : "∞"}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{v.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-primary font-mono font-bold">
                        {Number(v.price).toFixed(2)}€
                      </span>
                      <span className="text-muted-foreground text-xs">·</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1.5 border ${
                          v.stockCount > 5
                            ? "border-green-500/40 text-green-400 bg-green-500/10"
                            : v.stockCount > 0
                              ? "border-amber-500/40 text-amber-400 bg-amber-500/10"
                              : "border-red-500/40 text-red-400 bg-red-500/10"
                        }`}
                      >
                        <Box className="w-2.5 h-2.5 mr-1" />
                        {v.stockCount} en stock
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Switch checked={v.isActive} onCheckedChange={() => toggleActive(v)} />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                      onClick={() => startEdit(v)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDelete(v)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
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
    <div className="flex flex-col gap-4 py-4">
      {/* Variant selector — chips */}
      <div className="flex flex-col gap-2">
        <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Variante à gérer</Label>
        <div className="flex flex-wrap gap-1.5">
          {variants.map((v) => {
            const active = selectedVariantId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVariantId(v.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                  active
                    ? "bg-primary/15 border-primary/50 text-primary shadow-sm shadow-primary/20"
                    : "border-border/50 text-muted-foreground hover:bg-muted/30"
                }`}
              >
                <span>{v.name}</span>
                <Badge
                  variant="outline"
                  className={`text-[9px] h-4 px-1.5 ${
                    v.stockCount > 0
                      ? "border-green-500/40 text-green-400 bg-green-500/10"
                      : "border-red-500/40 text-red-400 bg-red-500/10"
                  }`}
                >
                  {v.stockCount}
                </Badge>
              </button>
            );
          })}
        </div>
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
  const total = available + sold;
  const soldPct = total > 0 ? Math.round((sold / total) * 100) : 0;

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
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl border border-green-500/30 bg-gradient-to-br from-green-500/10 to-green-500/5">
          <p className="text-[10px] uppercase text-green-400/80 font-bold tracking-wider">Disponibles</p>
          <p className="text-2xl font-extrabold text-green-400 mt-1 leading-none">{available}</p>
        </div>
        <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
          <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Vendus</p>
          <p className="text-2xl font-extrabold mt-1 leading-none">{sold}</p>
        </div>
        <div className="p-3 rounded-xl border border-border/50 bg-muted/20">
          <p className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">% Écoulé</p>
          <p className="text-2xl font-extrabold mt-1 leading-none">{soldPct}%</p>
        </div>
      </div>

      {/* Bulk paste */}
      <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-md bg-primary/15 text-primary flex items-center justify-center">
            <ClipboardPaste className="w-3.5 h-3.5" />
          </div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
            Coller des codes
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground mb-2">
          Un code/compte par ligne. Les doublons sont ignorés. Vendus en FIFO.
        </p>
        <Textarea
          placeholder={"login1:pass1\nlogin2:pass2\nlogin3:pass3"}
          value={paste}
          className="bg-background border-border/60 min-h-[110px] text-xs font-mono"
          onChange={(e) => setPaste(e.target.value)}
        />
        <Button
          size="sm"
          className="w-full mt-2 h-10 bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md shadow-primary/30 font-semibold"
          onClick={handlePaste}
          disabled={addBulk.isPending}
        >
          {addBulk.isPending
            ? "Ajout en cours..."
            : (() => {
                const n = paste.split("\n").filter((l) => l.trim()).length;
                return n > 0 ? `Ajouter ${n} code${n > 1 ? "s" : ""} au stock` : "Ajouter au stock";
              })()}
        </Button>
      </div>

      {/* Pool list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground/80">
            Pool ({items?.length ?? 0})
          </h4>
        </div>
        {isLoading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Chargement...</p>
        ) : !items || items.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl">
            Pool vide. Colle des codes ci-dessus pour commencer.
          </div>
        ) : (
          <div className="flex flex-col gap-1 max-h-72 overflow-y-auto pr-1">
            {items.map((it) => (
              <div
                key={it.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  it.status === "available"
                    ? "border-border/40 bg-background/60 hover:border-primary/30"
                    : "border-border/20 bg-muted/10 opacity-50"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                  it.status === "available" ? "bg-green-400" : "bg-muted-foreground"
                }`} />
                <code className="flex-1 text-xs truncate font-mono">{it.content}</code>
                {it.status === "sold" ? (
                  <Badge
                    variant="secondary"
                    className="text-[9px] h-4 px-1.5 bg-muted/40 text-muted-foreground"
                  >
                    Vendu
                  </Badge>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
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
    </div>
  );
}
