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
  ChevronUp,
  ChevronDown,
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
  Hand,
} from "lucide-react";
import { toast } from "sonner";
import { ReviewModal } from "@/components/review-modal";
import { ThankYouModal } from "@/components/thank-you-modal";
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
  const [thankYou, setThankYou] = useState<{ productId: number; productName: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [descOpen, setDescOpen] = useState(true);

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

  const unitPrice = selectedVariant
    ? selectedVariant.price
    : hasVariants
    ? Math.min(...activeVariants.map((v) => v.price))
    : (product?.price ?? 0);
  const totalCharged = (unitPrice * quantity).toFixed(2);

  // Stock total visible (somme des variantes ou stock du produit). Pour produits "manuel", on n'affiche pas.
  const totalStock = useMemo(() => {
    if (unlimited) return null;
    if (!product) return 0;
    if (product.deliveryType !== "auto") return null;
    if (hasVariants) {
      return activeVariants.reduce((sum, v) => sum + (v.stockCount ?? 0), 0);
    }
    return null;
  }, [product, unlimited, hasVariants, activeVariants]);

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
    setBusy(true);
    try {
      for (let i = 0; i < quantity; i++) {
        await buyProduct.mutateAsync({ data: { productId } });
      }
      qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
      toast.success(`Achat réussi (×${quantity}) !`);
      setThankYou({ productId, productName: product.name });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Solde insuffisant ou erreur";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  // Stock bar : si unlimited → 100%, sinon ratio sur 50 (cap visuel)
  const stockPct = unlimited
    ? 100
    : totalStock == null
    ? 100
    : Math.max(4, Math.min(100, Math.round((totalStock / 50) * 100)));

  const stockLabel = unlimited
    ? "Illimité"
    : totalStock == null
    ? product.inStock ? "Disponible" : "Indisponible"
    : `${totalStock} en stock`;

  return (
    <div className="flex flex-col min-h-[100dvh] bg-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/85 backdrop-blur-md border-b border-border/40 p-3 flex items-center gap-2">
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

      <div className="max-w-6xl mx-auto w-full px-3 lg:px-6 pt-4 lg:pt-6 space-y-4 lg:space-y-6">
        {/* TOP — Image + Info */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-4 lg:gap-6">
          {/* Image */}
          <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-gradient-to-br from-primary/10 via-card to-secondary/10 aspect-square lg:aspect-auto lg:min-h-[420px] flex items-center justify-center">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <Icon className="w-32 h-32 text-primary/40" strokeWidth={1.2} />
            )}
            {!product.inStock && !unlimited && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Badge variant="destructive" className="text-base px-4 py-1.5">
                  Rupture de stock
                </Badge>
              </div>
            )}
          </div>

          {/* Right info card */}
          <Card className="bg-card/60 border-border/50 backdrop-blur">
            <CardContent className="p-5 lg:p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Badge
                    variant="outline"
                    className="mb-2 border-primary/40 text-primary/90 text-[11px] px-2 py-0.5"
                  >
                    <Icon className="w-3 h-3 mr-1" /> {product.category}
                  </Badge>
                  <h2 className="text-2xl lg:text-3xl font-black text-foreground leading-tight">
                    {product.name}
                  </h2>
                </div>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-foreground font-mono">
                  {unitPrice.toFixed(2)}€
                </span>
                {hasVariants && !selectedVariant && (
                  <span className="text-xs text-muted-foreground">
                    à partir de
                  </span>
                )}
              </div>

              {/* Stock bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-wider">
                  <span className="text-muted-foreground font-semibold">Stock</span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-bold",
                      unlimited
                        ? "bg-secondary/15 text-secondary border border-secondary/30"
                        : (totalStock ?? 1) > 0 || product.inStock
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                        : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                    )}
                  >
                    {stockLabel}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      unlimited
                        ? "bg-gradient-to-r from-primary to-secondary"
                        : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                    )}
                    style={{ width: `${stockPct}%` }}
                  />
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Quantité
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Total :{" "}
                    <span className="font-mono font-bold text-foreground">
                      {totalCharged}€
                    </span>
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background/50 border border-border/50 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || busy}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-border/50 flex items-center justify-center text-foreground transition disabled:opacity-40"
                    aria-label="Diminuer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="text-2xl font-black text-foreground font-mono">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(99, q + 1))}
                    disabled={quantity >= 99 || busy}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-border/50 flex items-center justify-center text-foreground transition disabled:opacity-40"
                    aria-label="Augmenter"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Variantes (compact) */}
              {hasVariants && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Choisir une variante
                    </span>
                    {mustPickVariant && (
                      <span className="text-[10px] text-amber-400 font-semibold uppercase">
                        Requis
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
                            "rounded-xl border px-3 py-2.5 text-left transition flex flex-col gap-0.5",
                            isSelected
                              ? "border-primary/70 bg-primary/10 shadow-sm shadow-primary/20"
                              : "border-border/50 bg-background/40 hover:border-primary/40",
                            out && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                            {v.name}
                          </span>
                          <span className="font-mono font-black text-foreground text-base">
                            {v.price.toFixed(2)}€
                          </span>
                          {!unlimited && product.deliveryType === "auto" && (
                            <span
                              className={cn(
                                "text-[10px] font-medium",
                                out
                                  ? "text-rose-400"
                                  : stock <= 5
                                  ? "text-amber-400"
                                  : "text-emerald-400"
                              )}
                            >
                              {out ? "Épuisé" : `${stock} dispo`}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                  className="h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white border-none font-bold shadow-md shadow-primary/30"
                  onClick={handleAddToCart}
                  disabled={(!product.inStock && !unlimited) || busy}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Ajouter au panier
                </Button>
                <Button
                  variant="outline"
                  className="h-12 bg-background/60 hover:bg-primary/10 hover:text-primary border-border/60 font-bold"
                  onClick={handleBuyNow}
                  disabled={(!product.inStock && !unlimited) || busy}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Acheter maintenant
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DESCRIPTION CARD */}
        <Card className="bg-card/60 border-border/50 overflow-hidden">
          {/* Header bar collapsible */}
          <button
            type="button"
            onClick={() => setDescOpen((o) => !o)}
            className="w-full flex items-center justify-between gap-2 px-5 py-4 bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent border-b border-border/50 hover:bg-primary/15 transition"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🇫🇷</span>
              <span className="font-bold text-foreground text-sm uppercase tracking-wider">
                Description du produit
              </span>
            </div>
            {descOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {descOpen && (
            <CardContent className="p-5 space-y-5">
              {/* Tableau des variantes (si présentes) */}
              {hasVariants && (
                <div className="rounded-xl border border-border/50 overflow-hidden bg-background/40">
                  {activeVariants.map((v, idx) => {
                    const stock = v.stockCount ?? 0;
                    const out =
                      !unlimited &&
                      product.deliveryType === "auto" &&
                      stock <= 0;
                    const isSelected = selectedVariantId === v.id;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => !out && setSelectedVariantId(v.id)}
                        disabled={out}
                        className={cn(
                          "w-full grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3 text-left transition",
                          idx > 0 && "border-t border-border/40",
                          isSelected
                            ? "bg-primary/10"
                            : "hover:bg-white/[0.03]",
                          out && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-foreground text-sm uppercase tracking-wider truncate">
                            {v.name}
                          </span>
                          {v.durationDays != null && (
                            <span className="text-[11px] text-muted-foreground">
                              · {v.durationDays}j
                            </span>
                          )}
                          {!unlimited && product.deliveryType === "auto" && (
                            <span
                              className={cn(
                                "text-[10px] font-bold ml-2 px-1.5 py-0.5 rounded",
                                out
                                  ? "text-rose-300 bg-rose-500/10"
                                  : stock <= 5
                                  ? "text-amber-300 bg-amber-500/10"
                                  : "text-emerald-300 bg-emerald-500/10"
                              )}
                            >
                              {out ? "Épuisé" : `${stock}`}
                            </span>
                          )}
                        </div>
                        <span className="font-mono font-black text-emerald-400 text-base whitespace-nowrap">
                          {v.price.toFixed(2)}€
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Markdown body */}
              {product.description ? (
                <Markdown
                  source={product.description}
                  className="text-sm text-foreground/85"
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  Aucune description disponible.
                </p>
              )}
            </CardContent>
          )}
        </Card>
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
