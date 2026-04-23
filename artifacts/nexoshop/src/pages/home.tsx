import { useState } from "react";
import { useGetProducts, useAddToCart, useBuyProduct } from "@workspace/api-client-react";
import { ReviewModal } from "@/components/review-modal";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShoppingCart,
  Zap,
  Tv2,
  Music2,
  BrainCircuit,
  Trophy,
  Cpu,
  Sparkles,
  LayoutGrid,
} from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

const CATEGORIES = [
  { value: "Tout", label: "Toutes les catégories" },
  { value: "Streaming", label: "Streaming" },
  { value: "Musique", label: "Musique" },
  { value: "IA", label: "Intelligence Artificielle" },
  { value: "Sport", label: "Sport" },
  { value: "Tech", label: "Tech" },
  { value: "Spécial", label: "Spécial" },
];

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Streaming: Tv2,
  Musique: Music2,
  IA: BrainCircuit,
  Sport: Trophy,
  Tech: Cpu,
  Spécial: Sparkles,
};

const CATEGORY_COLORS: Record<string, string> = {
  Streaming: "from-red-500/20 to-rose-500/10 text-red-400",
  Musique: "from-purple-500/20 to-violet-500/10 text-purple-400",
  IA: "from-cyan-500/20 to-blue-500/10 text-cyan-400",
  Sport: "from-green-500/20 to-emerald-500/10 text-green-400",
  Tech: "from-blue-500/20 to-indigo-500/10 text-blue-400",
  Spécial: "from-amber-500/20 to-yellow-500/10 text-amber-400",
};

function ProductIcon({ category, imageUrl }: { category: string; imageUrl?: string | null }) {
  const Icon = CATEGORY_ICONS[category] ?? LayoutGrid;
  const colors = CATEGORY_COLORS[category] ?? "from-primary/20 to-secondary/10 text-primary";
  if (imageUrl) {
    return (
      <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shrink-0">
        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors} flex items-center justify-center shadow-inner border border-white/5 shrink-0`}>
      <Icon className="w-6 h-6" />
    </div>
  );
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Tout");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [pendingReview, setPendingReview] = useState<{ productId: number; productName: string } | null>(null);

  const { data: products, isLoading } = useGetProducts({
    category: activeCategory === "Tout" ? undefined : activeCategory,
  });
  const addToCart = useAddToCart();
  const buyProduct = useBuyProduct();

  const handleAddToCart = async (productId: number) => {
    try {
      await addToCart.mutateAsync({ data: { productId, quantity: 1 } });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast.success("Ajouté au panier");
    } catch {
      toast.error("Erreur lors de l'ajout au panier");
    }
  };

  const handleBuyNow = async (productId: number, productName: string) => {
    try {
      await buyProduct.mutateAsync({ data: { productId } });
      toast.success("Achat réussi !");
      setPendingReview({ productId, productName });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined;
      toast.error(msg || "Solde insuffisant ou erreur lors de l'achat");
    }
  };

  const selectedLabel =
    CATEGORIES.find((c) => c.value === activeCategory)?.label ?? "Toutes les catégories";

  return (
    <div className="flex flex-col gap-6 p-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-secondary/20 border border-primary/20 p-6 shadow-lg">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-secondary/30 rounded-full blur-3xl" />
        <h2 className="text-2xl font-bold mb-2 relative z-10">
          Digital Goods<br />
          <span className="text-primary">Instant Delivery</span>
        </h2>
        <p className="text-sm text-muted-foreground relative z-10 max-w-[80%]">
          Achetez des abonnements, clés et outils IA au meilleur prix.
        </p>
      </div>

      {/* Category Dropdown */}
      <div className="flex items-center gap-3">
        <LayoutGrid className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={activeCategory} onValueChange={setActiveCategory}>
          <SelectTrigger className="flex-1 bg-card border-border/60 hover:border-primary/50 transition-colors h-10 text-sm font-medium">
            <SelectValue>{selectedLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-card border-border z-[100]">
            {CATEGORIES.map((cat) => {
              const Icon = cat.value === "Tout" ? LayoutGrid : (CATEGORY_ICONS[cat.value] ?? LayoutGrid);
              return (
                <SelectItem
                  key={cat.value}
                  value={cat.value}
                  className="cursor-pointer focus:bg-primary/10 focus:text-primary"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{cat.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-[220px] animate-pulse bg-muted/20 border-border/50" />
          ))
        ) : products?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card/50 rounded-xl border border-dashed border-border">
            Aucun produit dans cette catégorie.
          </div>
        ) : (
          products?.map((product) => (
            <Card
              key={product.id}
              className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors"
            >
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <ProductIcon category={product.category} imageUrl={product.imageUrl} />
                  <div>
                    <h3 className="font-bold text-base leading-tight">{product.name}</h3>
                    <Badge
                      variant="outline"
                      className="mt-1 text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary/80"
                    >
                      {product.category}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-lg text-primary">
                    {product.price.toFixed(2)}€
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-2 pb-2">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                  {product.description}
                </p>
              </CardContent>

              <CardFooter className="p-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-card hover:bg-primary/10 hover:text-primary border-border"
                  onClick={() => handleAddToCart(product.id)}
                  disabled={!product.inStock}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Panier
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md shadow-primary/20 border-none"
                  onClick={() => handleBuyNow(product.id, product.name)}
                  disabled={!product.inStock}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Acheter
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {pendingReview && (
        <ReviewModal
          open={true}
          onClose={() => setPendingReview(null)}
          productId={pendingReview.productId}
          productName={pendingReview.productName}
        />
      )}
    </div>
  );
}
