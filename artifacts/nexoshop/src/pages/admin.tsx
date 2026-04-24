import { useState, useRef } from "react";
import {
  useAdminGetProducts,
  useAdminCreateProduct,
  useAdminUpdateProduct,
  useAdminDeleteProduct,
  getAdminGetProductsQueryKey,
  useGetMe,
} from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminLogs } from "@/components/admin-logs";
import { AdminUsers } from "@/components/admin-users";
import type { Product } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Link as LinkIcon,
  ShieldCheck,
  Package,
  Image as ImageIcon,
  X,
} from "lucide-react";

const CATEGORIES = ["Streaming", "Musique", "IA", "Sport", "Tech", "Spécial"];

type FormState = {
  name: string;
  category: string;
  description: string;
  price: string;
  deliveryType: "auto" | "manual";
  inStock: boolean;
  imageUrl: string;
};

const DEFAULT_FORM: FormState = {
  name: "",
  category: "Streaming",
  description: "",
  price: "",
  deliveryType: "manual",
  inStock: true,
  imageUrl: "",
};

export default function Admin() {
  const qc = useQueryClient();
  const { data: me, isLoading: isLoadingMe } = useGetMe();
  const isAdmin = !!me?.isAdmin;

  const { data: products, isLoading } = useAdminGetProducts({
    query: { enabled: isAdmin, queryKey: getAdminGetProductsQueryKey() },
  });
  const createProduct = useAdminCreateProduct();
  const updateProduct = useAdminUpdateProduct();
  const deleteProduct = useAdminDeleteProduct();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getAdminGetProductsQueryKey() });

  const openCreate = () => {
    setEditingProduct(null);
    setForm(DEFAULT_FORM);
    setImagePreview(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      category: p.category,
      description: p.description,
      price: String(p.price),
      deliveryType: p.deliveryType as "auto" | "manual",
      inStock: p.inStock,
      imageUrl: p.imageUrl ?? "",
    });
    setImagePreview(p.imageUrl ?? null);
    setDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const userId = localStorage.getItem("nexoshop_user_id");
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        headers: userId ? { "X-User-Id": userId } : {},
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

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.category) {
      toast.error("Nom, catégorie et prix sont obligatoires");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price <= 0) {
      toast.error("Prix invalide");
      return;
    }

    const payload = {
      name: form.name,
      category: form.category,
      description: form.description,
      price,
      deliveryType: form.deliveryType,
      inStock: form.inStock,
      imageUrl: form.imageUrl || null,
    };

    try {
      if (editingProduct) {
        await updateProduct.mutateAsync({ id: editingProduct.id, data: payload });
        toast.success("Produit mis à jour !");
      } else {
        await createProduct.mutateAsync({ data: payload });
        toast.success("Produit créé !");
      }
      invalidate();
      setDialogOpen(false);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleDelete = async (p: Product) => {
    if (!confirm(`Supprimer "${p.name}" ?`)) return;
    try {
      await deleteProduct.mutateAsync({ id: p.id });
      toast.success("Produit supprimé");
      invalidate();
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  const filtered = (products ?? []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoadingMe) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm">
        Chargement...
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-destructive/15 flex items-center justify-center text-destructive">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <div>
          <h2 className="text-lg font-bold">Accès refusé</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">
            Cette zone est réservée aux administrateurs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Panel Admin</h2>
          <p className="text-xs text-muted-foreground">Boutique · Logs · Utilisateurs</p>
        </div>
      </div>

      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid grid-cols-3 w-full bg-card border border-border/50">
          <TabsTrigger value="products" className="text-xs">Produits</TabsTrigger>
          <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
          <TabsTrigger value="users" className="text-xs">Utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="mt-4">
          <AdminLogs />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <AdminUsers />
        </TabsContent>

        <TabsContent value="products" className="mt-4 flex flex-col gap-4">
          <Button size="sm" onClick={openCreate} className="w-full bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" />
            Nouveau produit
          </Button>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un produit..."
          className="pl-9 bg-card border-border/60"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Produits", value: products?.length ?? 0, icon: Package },
          { label: "En stock", value: products?.filter((p) => p.inStock).length ?? 0, icon: ShieldCheck },
          { label: "Catégories", value: CATEGORIES.length, icon: Search },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-card/50 border-border/50">
            <CardContent className="p-3 flex flex-col items-center gap-1">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xl font-bold">{value}</span>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Product List */}
      {isLoading ? (
        Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-muted/20 animate-pulse border border-border/30" />
        ))
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground border border-dashed border-border rounded-xl">
          Aucun produit trouvé.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((product) => (
            <Card key={product.id} className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-3 flex items-center gap-3">
                {/* Image/Icon */}
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-muted/20 flex items-center justify-center">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{product.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/30 text-primary/70">
                      {product.category}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {product.price.toFixed(2)}€
                    </span>
                    <span className={`text-[9px] font-medium ${product.inStock ? "text-green-400" : "text-red-400"}`}>
                      {product.inStock ? "● En stock" : "● Épuisé"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 hover:bg-primary/10 hover:text-primary"
                    onClick={() => openEdit(product)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => handleDelete(product)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

        </TabsContent>
      </Tabs>

      {/* Edit / Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-card border-border max-w-sm max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            {/* Image Section */}
            <div className="flex flex-col gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Image</Label>

              {/* Preview */}
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

              {/* Mode switch */}
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
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
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
              <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wider">Nom *</Label>
              <Input
                id="name"
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
                <SelectTrigger className="bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="desc" className="text-xs text-muted-foreground uppercase tracking-wider">Description</Label>
              <Input
                id="desc"
                placeholder="Description courte..."
                value={form.description}
                className="bg-background border-border/60"
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            {/* Price */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="price" className="text-xs text-muted-foreground uppercase tracking-wider">Prix (€) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="9.99"
                value={form.price}
                className="bg-background border-border/60"
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </div>

            {/* Delivery Type */}
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Livraison</Label>
              <Select
                value={form.deliveryType}
                onValueChange={(v) => setForm((f) => ({ ...f, deliveryType: v as "auto" | "manual" }))}
              >
                <SelectTrigger className="bg-background border-border/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="auto">Automatique</SelectItem>
                  <SelectItem value="manual">Manuelle</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* In Stock */}
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">En stock</Label>
              <Switch
                checked={form.inStock}
                onCheckedChange={(v) => setForm((f) => ({ ...f, inStock: v }))}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" className="flex-1 border-border" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={createProduct.isPending || updateProduct.isPending}
            >
              {editingProduct ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
