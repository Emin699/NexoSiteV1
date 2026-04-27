import { useMemo, useState } from "react";
import { useGetProducts, useAddToCart, useBuyProduct, useGetCategories } from "@workspace/api-client-react";
import { ReviewModal } from "@/components/review-modal";
import { ThankYouModal } from "@/components/thank-you-modal";
import { ProductCardHolo } from "@/components/product-card-holo";
import { WelcomeHero } from "@/components/welcome-hero";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
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
import { useRequireAuth } from "@/hooks/use-auth";

const CATEGORIES_FALLBACK = [
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

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Tout");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [pendingReview, setPendingReview] = useState<{ productId: number; productName: string } | null>(null);
  const [thankYou, setThankYou] = useState<{ productId: number; productName: string } | null>(null);

  const { data: productsRaw, isLoading } = useGetProducts({
    category: activeCategory === "Tout" ? undefined : activeCategory,
  });
  const products = Array.isArray(productsRaw) ? productsRaw : [];
  const { data: dynamicCategories } = useGetCategories();
  const addToCart = useAddToCart();
  const buyProduct = useBuyProduct();
  const requireAuth = useRequireAuth();

  const CATEGORIES = useMemo(() => {
    if (Array.isArray(dynamicCategories) && dynamicCategories.length > 0) {
      return [
        { value: "Tout", label: "Toutes les catégories" },
        ...dynamicCategories.map((c) => ({ value: c.name, label: c.name })),
      ];
    }
    return CATEGORIES_FALLBACK;
  }, [dynamicCategories]);

  const handleAddToCart = async (productId: number) => {
    if (!requireAuth("Connecte-toi pour ajouter au panier")) return;
    try {
      await addToCart.mutateAsync({ data: { productId, quantity: 1 } });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast.success("Ajouté au panier");
    } catch {
      toast.error("Erreur lors de l'ajout au panier");
    }
  };

  const handleBuyNow = async (productId: number, productName: string) => {
    if (!requireAuth("Connecte-toi pour acheter ce produit")) return;
    try {
      await buyProduct.mutateAsync({ data: { productId } });
      toast.success("Achat réussi !");
      setThankYou({ productId, productName });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : undefined;
      toast.error(msg || "Solde insuffisant ou erreur lors de l'achat");
    }
  };

  const selectedLabel =
    CATEGORIES.find((c) => c.value === activeCategory)?.label ?? "Toutes les catégories";

  return (
    <div className="flex flex-col gap-6 p-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Hero Banner with rotating reviews */}
      <WelcomeHero />

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-[480px] animate-pulse bg-muted/20 border-border/50" />
          ))
        ) : products?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card/50 rounded-xl border border-dashed border-border">
            Aucun produit dans cette catégorie.
          </div>
        ) : (
          products?.map((product) => (
            <ProductCardHolo
              key={product.id}
              product={product}
              onOpen={() => setLocation(`/product/${product.id}`)}
              onAddToCart={() => handleAddToCart(product.id)}
              onBuy={() => handleBuyNow(product.id, product.name)}
              busy={addToCart.isPending || buyProduct.isPending}
            />
          ))
        )}
      </div>

      {/* MERCI animation */}
      <ThankYouModal
        open={!!thankYou}
        onClose={() => {
          setThankYou(null);
          setLocation("/orders");
        }}
        onLeaveReview={() => {
          if (thankYou) setPendingReview(thankYou);
          setThankYou(null);
        }}
        productName={thankYou?.productName}
      />

      {pendingReview && (
        <ReviewModal
          open={true}
          onClose={() => {
            setPendingReview(null);
            setLocation("/orders");
          }}
          productId={pendingReview.productId}
          productName={pendingReview.productName}
          onSubmitted={() => {
            setPendingReview(null);
            setLocation("/orders");
          }}
        />
      )}
    </div>
  );
}
