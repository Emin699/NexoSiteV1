import { useState, useMemo, useRef } from "react";
import { useGetProducts, useAddToCart, useBuyProduct } from "@workspace/api-client-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ShoppingCart, Zap } from "lucide-react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCartQueryKey } from "@workspace/api-client-react";
import { toast } from "sonner";

const CATEGORIES = ["Tout", "Streaming", "Musique", "IA", "Sport", "Tech", "Spécial"];

export default function Home() {
  const [activeCategory, setActiveCategory] = useState("Tout");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useGetProducts({ 
    category: activeCategory === "Tout" ? undefined : activeCategory 
  });
  const addToCart = useAddToCart();
  const buyProduct = useBuyProduct();

  const handleAddToCart = async (productId: number) => {
    try {
      await addToCart.mutateAsync({ data: { productId, quantity: 1 } });
      queryClient.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast.success("Ajouté au panier", { icon: "🛒" });
    } catch (e) {
      toast.error("Erreur lors de l'ajout au panier");
    }
  };

  const handleBuyNow = async (productId: number) => {
    try {
      await buyProduct.mutateAsync({ data: { productId } });
      toast.success("Achat réussi !", { icon: "✨" });
      setLocation("/profile"); // Assuming orders are shown in profile or somewhere
    } catch (e: any) {
      toast.error(e.message || "Solde insuffisant ou erreur lors de l'achat");
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-card to-secondary/20 border border-primary/20 p-6 shadow-lg">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-secondary/30 rounded-full blur-3xl"></div>
        
        <h2 className="text-2xl font-bold mb-2 relative z-10">Digital Goods<br/><span className="text-primary">Instant Delivery</span></h2>
        <p className="text-sm text-muted-foreground relative z-10 max-w-[80%]">
          Achetez des abonnements, clés et outils IA au meilleur prix.
        </p>
      </div>

      {/* Category Filter */}
      <ScrollArea className="w-full whitespace-nowrap -mx-4 px-4 pb-2">
        <div className="flex w-max space-x-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border ${
                activeCategory === cat 
                  ? "bg-primary text-primary-foreground border-primary shadow-[0_0_15px_rgba(79,156,249,0.3)]" 
                  : "bg-card text-muted-foreground border-border hover:bg-muted"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-[220px] animate-pulse bg-muted/20 border-border/50"></Card>
          ))
        ) : products?.length === 0 ? (
          <div className="col-span-full py-12 text-center text-muted-foreground bg-card/50 rounded-xl border border-dashed border-border">
            Aucun produit dans cette catégorie.
          </div>
        ) : (
          products?.map((product) => (
            <Card key={product.id} className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/50 transition-colors">
              <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center text-2xl shadow-inner border border-white/5">
                    {product.emoji}
                  </div>
                  <div>
                    <h3 className="font-bold text-base leading-tight">{product.name}</h3>
                    <Badge variant="outline" className="mt-1 text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary/80">
                      {product.category}
                    </Badge>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-lg text-primary">{product.price.toFixed(2)}€</span>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2 pb-0">
                <p className="text-xs text-muted-foreground line-clamp-2 min-h-[32px]">
                  {product.description}
                </p>
                <div className="mt-3 mb-1">
                  <Badge variant="secondary" className={`text-[10px] uppercase tracking-wider ${
                    product.deliveryType === 'auto' ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'
                  }`}>
                    {product.deliveryType === 'auto' ? '⚡ Auto' : '⏳ Manuel'}
                  </Badge>
                </div>
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
                  onClick={() => handleBuyNow(product.id)}
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
    </div>
  );
}
