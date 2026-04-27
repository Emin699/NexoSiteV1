import { useState } from "react";
import {
  useAdminGetProducts,
  useAdminDeleteProduct,
  getAdminGetProductsQueryKey,
  useGetMe,
  useGetCategories,
} from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminLogs } from "@/components/admin-logs";
import { AdminUsers } from "@/components/admin-users";
import { AdminOrders } from "@/components/admin-orders";
import { AdminTickets } from "@/components/admin-tickets";
import { AdminProductModal } from "@/components/admin-product-modal";
import { AdminCategoriesManager } from "@/components/admin-categories-manager";
import { AdminCoupons } from "@/components/admin-coupons";
import type { Product } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  ShieldCheck,
  Package,
  Image as ImageIcon,
} from "lucide-react";


export default function Admin() {
  const qc = useQueryClient();
  const { data: me, isLoading: isLoadingMe } = useGetMe();
  const isAdmin = !!me?.isAdmin;

  const { data: products, isLoading } = useAdminGetProducts({
    query: { enabled: isAdmin, queryKey: getAdminGetProductsQueryKey() },
  });
  const { data: catList } = useGetCategories();
  const deleteProduct = useAdminDeleteProduct();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getAdminGetProductsQueryKey() });

  const openCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditingProduct(p);
    setDialogOpen(true);
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
        <TabsList className="grid grid-cols-7 w-full bg-card border border-border/50">
          <TabsTrigger value="products" className="text-[10px] px-1">Produits</TabsTrigger>
          <TabsTrigger value="categories" className="text-[10px] px-1">Catég.</TabsTrigger>
          <TabsTrigger value="coupons" className="text-[10px] px-1">Coupons</TabsTrigger>
          <TabsTrigger value="orders" className="text-[10px] px-1">Cmd.</TabsTrigger>
          <TabsTrigger value="tickets" className="text-[10px] px-1">Tickets</TabsTrigger>
          <TabsTrigger value="logs" className="text-[10px] px-1">Logs</TabsTrigger>
          <TabsTrigger value="users" className="text-[10px] px-1">Users</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4">
          <AdminCategoriesManager />
        </TabsContent>

        <TabsContent value="coupons" className="mt-4">
          <AdminCoupons />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <AdminOrders />
        </TabsContent>

        <TabsContent value="tickets" className="mt-4">
          <AdminTickets />
        </TabsContent>

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
          { label: "Catégories", value: catList?.length ?? 0, icon: Search },
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

      <AdminProductModal
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingProduct={editingProduct}
        onSaved={invalidate}
      />
    </div>
  );
}
