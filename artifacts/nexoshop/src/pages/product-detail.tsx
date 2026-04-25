import { useMemo, useState } from "react";
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
import { Markdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

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
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [pendingReview, setPendingReview] = useState<{ productId: number; productName: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const activeVariants = useMemo(
    () => (product?.variants ?? []).filter((v) => v.isActive),
    [product]
  );
  const hasVariants = activeVariants.length > 0;
  const unlimited = !!product?.unlimitedStock;

  const selectedVariant = useMemo(
    () => activeVariants.find((v) => v.id === selectedVariantId) ?? null,
    [activeVariants, selectedVariantId]
  );

  const unitPrice = selectedVariant ? selectedVariant.price : (product?.price ?? 0);
  const totalCharged = (unitPrice * quantity).toFixed(2);

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

  const variantStock = selectedVariant?.stockCount ?? 0;
  const stockBlocking =
    hasVariants &&
    !unlimited &&
    product.deliveryType === "auto" &&
    selectedVariant != null &&
    variantStock < quantity;

  const mustPickVariant = hasVariants && selectedVariant == null;

  const handleAddToCart = async () => {
    if (busy) return;
    if (mustPickVariant) {
      toast.error("Choisissez une variante");
      return;
    }
    if (stockBlocking) {
      toast.error(`Stock insuffisant (${variantStock} disponible${variantStock > 1 ? "s" : ""})`);
      return;
    }
    setBusy(true);
    try {
      await addToCart.mutateAsync({
        data: { productId, quantity, variantId: selectedVariant?.id ?? null },
      });
      qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
      const label = selectedVariant ? `${product.name} — ${selectedVariant.name}` : product.name;
      toast.success(`${quantity} × ${label} ajouté au panier`);
    } catch {
      toast.error("Erreur lors de l'ajout au panier");
    } finally {
      setBusy(false);
    }
  };

  const handleBuyNow = async () => {
    if (busy) return;
    if (mustPickVariant) {
      toast.error("Choisissez une variante");
      return;
    }
    if (stockBlocking) {
      toast.error(`Stock insuffisant (${variantStock} disponible${variantStock > 1 ? "s" : ""})`);
      return;
    }
    // Si variante : passe par le panier puis checkout (la route /buy ne gère pas variantId).
    if (selectedVariant) {
      setBusy(true);
      try {
        await addToCart.mutateAsync({
          data: { productId, quantity, variantId: selectedVariant.id },
        });
        qc.invalidateQueries({ queryKey: getGetCartQueryKey() });
        toast.success("Ajouté au panier — finalisez votre commande");
        setLocation("/cart");
      } catch {
        toast.error("Erreur lors de l'ajout au panier");
      } finally {
        setBusy(false);
      }
      return;
    }
    // Pas de variante : achat direct
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
              {unitPrice.toFixed(2)}€
            </span>
            <span className="text-xs text-muted-foreground">par unité</span>
          </div>
        </div>

        {/* Variantes */}
        {hasVariants && (
          <Card className="bg-card/50 border-border/40">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Choisir une variante
                </h3>
                {mustPickVariant && (
                  <span className="text-[10px] text-amber-400 font-semibold">Requis</span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2">
                {activeVariants.map((v) => {
                  const isSelected = selectedVariantId === v.id;
                  const stock = v.stockCount ?? 0;
                  const out =
                    !unlimited &&
                    product.deliveryType === "auto" &&
                    stock <= 0;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={out}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={cn(
                        "w-full text-left rounded-xl border px-3 py-3 transition flex items-center justify-between gap-3",
                        isSelected
                          ? "border-primary/60 bg-primary/10"
                          : "border-border/50 bg-card hover:border-primary/40",
                        out && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div>
                        <div className="font-semibold text-foreground text-sm">{v.name}</div>
                        {v.durationDays != null && (
                          <div className="text-[11px] text-muted-foreground">
                            {v.durationDays} jour{v.durationDays > 1 ? "s" : ""}
                          </div>
                        )}
                        {!unlimited && product.deliveryType === "auto" && (
                          <div
                            className={cn(
                              "text-[11px] mt-0.5 font-medium",
                              out ? "text-rose-400" : stock <= 5 ? "text-amber-400" : "text-emerald-400"
                            )}
                          >
                            {out ? "Épuisé" : `${stock} en stock`}
                          </div>
                        )}
                      </div>
                      <div className="font-mono font-bold text-primary text-sm">
                        {v.price.toFixed(2)}€
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Description avec markdown */}
        <Card className="bg-card/50 border-border/40">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Description
            </h3>
            {product.description ? (
              <Markdown
                source={product.description}
                className="text-sm text-foreground/90"
              />
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Aucune description disponible.
              </p>
            )}
            <div className="flex items-center gap-2 pt-2 border-t border-border/40 mt-2">
              {product.inStock ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-green-400 font-medium">
                    {unlimited ? "Disponible (stock illimité)" : "En stock"}
                  </span>
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
                Total : <span className="font-mono font-bold text-primary">{totalCharged}€</span>
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
            Acheter {totalCharged}€
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
