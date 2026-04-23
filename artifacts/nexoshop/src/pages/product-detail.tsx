import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import {
  useGetProduct,
  useAddToCart,
  useBuyProduct,
  getGetCartQueryKey,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Minus,
  Plus,
  ShoppingCart,
  Zap,
  Tv2,
  Music2,
  BrainCircuit,
  Dumbbell,
  Cpu,
  Sparkles,
  Package,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ReviewModal } from "@/components/review-modal";

const CATEGORY_ICON: Record<string, React.ElementType> = {
  Streaming: Tv2,
  Musique: Music2,
  IA: BrainCircuit,
  Sport: Dumbbell,
  Tech: Cpu,
  Spécial: Sparkles,
};

export default function ProductDetail() {
  const params = useParams<{ id: string }>();
  const productId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { data: product, isLoading } = useGetProduct(productId);
  const addToCart = useAddToCart();
  const buyProduct = useBuyProduct();

  const [quantity, setQuantity] = useState(1);
  const [pendingReview, setPendingReview] = useState<{ productId: number; productName: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background p-4">
        <div className="h-8 w-32 bg-muted/30 rounded animate-pulse mb-4" />
        <div className="h-64 bg-muted/30 rounded-2xl animate-pulse mb-4" />
        <div className="h-6 w-2/3 bg-muted/30 rounded animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-[100dvh] bg-background items-center justify-center p-6 text-center">
        <Package className="w-12 h-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">Produit introuvable</p>
        <Link href="/">
          <Button>Retour à la boutique</Button>
        </Link>
      </div>
    );
  }

  const Icon = CATEGORY_ICON[product.category] ?? Package;
  const total = (product.price * quantity).toFixed(2);

  const handleAddToCart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await addToCart.mutateAsync({ data: { productId, quantity } });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      toast.success(`${quantity} × ${product.name} ajouté au panier`);
    } catch {
      toast.error("Erreur lors de l'ajout au panier");
    } finally {
      setBusy(false);
    }
  };

  const handleBuyNow = async () => {
    if (busy) return;
    setBusy(true);
    try {
      for (let i = 0; i < quantity; i++) {
        await buyProduct.mutateAsync({ data: { productId } });
      }
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast.success(`Achat réussi (×${quantity}) !`);
      setPendingReview({ productId, productName: product.name });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Solde insuffisant ou erreur";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/40 p-3 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => setLocation("/")}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-base font-bold truncate flex-1">{product.name}</h1>
      </div>

      {/* Image */}
      <div className="relative w-full aspect-square max-h-[380px] bg-gradient-to-br from-primary/10 via-card to-secondary/10 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className="w-32 h-32 text-primary/40" strokeWidth={1.2} />
        )}
        {!product.inStock && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Badge variant="destructive" className="text-base px-4 py-1.5">
              Rupture de stock
            </Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-4">
        <div>
          <Badge
            variant="outline"
            className="mb-2 border-primary/40 text-primary/90 text-xs"
          >
            <Icon className="w-3 h-3 mr-1" /> {product.category}
          </Badge>
          <h2 className="text-2xl font-black text-foreground leading-tight mb-1">
            {product.name}
          </h2>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary font-mono">
              {product.price.toFixed(2)}€
            </span>
            <span className="text-xs text-muted-foreground">par unité</span>
          </div>
        </div>

        <Card className="bg-card/50 border-border/40">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description
            </h3>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {product.description || "Aucune description disponible."}
            </p>
            <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-2">
              {product.inStock ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">En stock</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">Indisponible</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quantity Selector */}
        <Card className="bg-card/50 border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold">Quantité</span>
              <span className="text-xs text-muted-foreground">
                Total : <span className="font-mono font-bold text-primary">{total}€</span>
              </span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full bg-card border-border"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || busy}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="w-20 text-center">
                <span className="text-3xl font-black text-foreground font-mono">
                  {quantity}
                </span>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="w-12 h-12 rounded-full bg-card border-border"
                onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                disabled={quantity >= 99 || busy}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1 h-12 bg-card hover:bg-primary/10 hover:text-primary border-border"
            onClick={handleAddToCart}
            disabled={!product.inStock || busy}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Panier
          </Button>
          <Button
            className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-md shadow-primary/20 border-none font-bold"
            onClick={handleBuyNow}
            disabled={!product.inStock || busy}
          >
            <Zap className="w-4 h-4 mr-2" />
            Acheter {total}€
          </Button>
        </div>
      </div>

      {pendingReview && (
        <ReviewModal
          open={true}
          onClose={() => {
            setPendingReview(null);
            setLocation("/profile");
          }}
          productId={pendingReview.productId}
          productName={pendingReview.productName}
        />
      )}
    </div>
  );
}
