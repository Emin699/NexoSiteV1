import { ShoppingCart, Sparkles, Tv2, Music2, BrainCircuit, Trophy, Cpu, LayoutGrid } from "lucide-react";
import type { Product } from "@workspace/api-client-react";

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  Streaming: Tv2,
  Musique: Music2,
  IA: BrainCircuit,
  Sport: Trophy,
  Tech: Cpu,
  Spécial: Sparkles,
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  Streaming: "from-blue-600 via-blue-800 to-zinc-900",
  Musique: "from-orange-500 via-orange-700 to-zinc-900",
  IA: "from-sky-500 via-blue-700 to-zinc-900",
  Sport: "from-orange-400 via-amber-600 to-zinc-900",
  Tech: "from-blue-500 via-indigo-700 to-zinc-900",
  Spécial: "from-orange-500 via-blue-700 to-zinc-900",
};

interface Props {
  product: Product;
  onOpen: () => void;
  onAddToCart: () => void;
  onBuy: () => void;
  busy?: boolean;
}

export function ProductCardHolo({ product, onOpen, onAddToCart, onBuy, busy }: Props) {
  const Icon = CATEGORY_ICONS[product.category] ?? LayoutGrid;
  const gradient = CATEGORY_GRADIENTS[product.category] ?? "from-primary via-secondary to-zinc-900";

  // Variantes : prix mini affiché si variantes actives, sinon prix de base
  const activeVariants = product.variants?.filter((v) => v.isActive) ?? [];
  const hasVariants = activeVariants.length > 0;
  const minPrice = hasVariants
    ? Math.min(...activeVariants.map((v) => v.price))
    : product.price;
  const totalStock = hasVariants
    ? activeVariants.reduce((sum, v) => sum + (v.stockCount ?? 0), 0)
    : 0;

  // Stock label dynamique
  const inStock = product.inStock;
  const stockLabel = !inStock
    ? "Plus de stock"
    : product.deliveryType === "auto" && hasVariants
      ? `${totalStock} en stock`
      : "En stock";
  const stockColor = !inStock
    ? "text-red-500"
    : product.deliveryType === "auto" && hasVariants && totalStock <= 5
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div
      className="group relative w-full"
      style={{ perspective: "1000px" }}
    >
      {/* Halo holographique aux couleurs du logo */}
      <div
        className="absolute -inset-2 rounded-[28px] opacity-30 blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-60"
        style={{
          background:
            "conic-gradient(from 0deg, #1E90FF, #FF8C00, #1E90FF, #FF8C00, #1E90FF)",
        }}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        aria-label={`Voir le produit ${product.name}`}
        className="relative rounded-[24px] overflow-hidden bg-zinc-900/90 backdrop-blur-xl border border-white/10 cursor-pointer hover:-translate-y-1 transition-transform duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
        style={{
          boxShadow:
            "0 20px 40px -10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Reflet holographique */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20 mix-blend-screen"
          style={{
            background:
              "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%), linear-gradient(45deg, rgba(255,110,196,0.2), rgba(120,115,245,0.2), rgba(74,222,128,0.2))",
          }}
        />

        {/* Image / Visuel */}
        <div className="relative h-44 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div
              className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
            >
              <Icon className="w-20 h-20 text-white/80 drop-shadow-lg" />
            </div>
          )}
          {/* Fade vers le bas */}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />
        </div>

        {/* Contenu */}
        <div className="relative p-4 space-y-3">
          <div>
            <h3 className="font-bold text-lg text-white leading-tight line-clamp-1">
              {product.name}
            </h3>
            {hasVariants && (
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] font-bold text-secondary/80">
                {activeVariants.length} variante{activeVariants.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Stock indicator */}
          <div className="flex items-center gap-2 text-[11px]">
            <span className={`${stockColor} font-semibold`}>● {stockLabel}</span>
          </div>

          {/* Description */}
          <p className="text-[13px] text-zinc-300 leading-relaxed line-clamp-3 min-h-[54px]">
            {product.description}
          </p>

          {/* Prix */}
          <div className="pt-1">
            <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              {hasVariants ? "À partir de" : "Prix"}
            </p>
            <p
              className="font-black text-3xl leading-none"
              style={{
                backgroundImage: "linear-gradient(135deg, #ff6ec4, #7873f5, #4ade80)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              {minPrice.toFixed(2)}€
            </p>
          </div>

          {/* CTA */}
          <div className="grid grid-cols-[auto_1fr] gap-2 pt-1">
            <button
              type="button"
              disabled={!inStock || busy}
              onClick={(e) => {
                e.stopPropagation();
                if (hasVariants) {
                  // Avec variantes : on doit ouvrir la page produit pour choisir
                  onOpen();
                } else {
                  onAddToCart();
                }
              }}
              className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label={hasVariants ? "Choisir une variante" : "Ajouter au panier"}
              title={hasVariants ? "Choisir une variante" : "Ajouter au panier"}
            >
              <ShoppingCart className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!inStock || busy}
              onClick={(e) => {
                e.stopPropagation();
                if (hasVariants) {
                  onOpen();
                } else {
                  onBuy();
                }
              }}
              className="h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              style={{
                backgroundImage: inStock
                  ? "linear-gradient(135deg, #ff6ec4, #7873f5)"
                  : "linear-gradient(135deg, #555, #333)",
                boxShadow: inStock ? "0 10px 30px -5px rgba(120,115,245,0.5)" : "none",
              }}
            >
              <Sparkles className="w-4 h-4" />
              {!inStock
                ? "Plus de stock"
                : hasVariants
                  ? "Choisir"
                  : "Acheter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
