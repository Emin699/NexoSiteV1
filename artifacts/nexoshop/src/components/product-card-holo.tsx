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
  Streaming: "from-violet-600 via-purple-800 to-[#06060f]",
  Musique: "from-cyan-500 via-cyan-700 to-[#06060f]",
  IA: "from-purple-500 via-violet-700 to-[#06060f]",
  Sport: "from-fuchsia-500 via-purple-700 to-[#06060f]",
  Tech: "from-cyan-500 via-indigo-700 to-[#06060f]",
  Spécial: "from-violet-500 via-cyan-700 to-[#06060f]",
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
  const gradient = CATEGORY_GRADIENTS[product.category] ?? "from-violet-600 via-purple-800 to-[#06060f]";

  const activeVariants = product.variants?.filter((v) => v.isActive) ?? [];
  const hasVariants = activeVariants.length > 0;
  const minPrice = hasVariants
    ? Math.min(...activeVariants.map((v) => v.price))
    : product.price;
  const totalStock = hasVariants
    ? activeVariants.reduce((sum, v) => sum + (v.stockCount ?? 0), 0)
    : 0;

  const inStock = product.inStock;
  const stockLabel = !inStock
    ? "Plus de stock"
    : product.deliveryType === "auto" && hasVariants
      ? `${totalStock} en stock`
      : "En stock";
  const stockColor = !inStock
    ? "text-red-400"
    : product.deliveryType === "auto" && hasVariants && totalStock <= 5
      ? "text-amber-400"
      : "text-emerald-400";

  return (
    <div className="group relative w-full" style={{ perspective: "1000px" }}>
      {/* Halo néon cyberpunk */}
      <div
        className="absolute -inset-2 rounded-[28px] opacity-25 blur-2xl pointer-events-none transition-opacity duration-300 group-hover:opacity-50"
        style={{
          background: "conic-gradient(from 0deg, #a855f7, #06b6d4, #a855f7, #7c3aed, #a855f7)",
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
        className="relative rounded-[24px] overflow-hidden cursor-pointer hover:-translate-y-1 transition-transform duration-300 focus:outline-none"
        style={{
          background: "rgba(10,6,20,0.92)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(168,85,247,0.22)",
          boxShadow: "0 20px 40px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(168,85,247,0.12)",
        }}
      >
        {/* Reflet holographique */}
        <div
          className="absolute inset-0 pointer-events-none opacity-15 mix-blend-screen"
          style={{
            background:
              "linear-gradient(135deg, transparent 30%, rgba(168,85,247,0.4) 50%, transparent 70%), linear-gradient(45deg, rgba(168,85,247,0.15), rgba(6,182,212,0.15), rgba(168,85,247,0.15))",
          }}
        />

        {/* Image / Visuel */}
        <div className="relative h-52 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
              <Icon className="w-20 h-20 text-white/70 drop-shadow-lg" />
            </div>
          )}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(10,6,20,1) 0%, transparent 60%)" }}
          />
        </div>

        {/* Contenu */}
        <div className="relative p-4 space-y-3">
          <div>
            <h3 className="font-bold text-lg text-white leading-tight line-clamp-2">{product.name}</h3>
            {hasVariants && (
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] font-bold" style={{ color: "#06b6d4" }}>
                {activeVariants.length} variante{activeVariants.length > 1 ? "s" : ""}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <span className={`${stockColor} font-semibold`}>● {stockLabel}</span>
          </div>

          <p className="text-[13px] text-zinc-300 leading-relaxed line-clamp-3 min-h-[54px]">
            {product.description}
          </p>

          <div className="pt-1">
            <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              {hasVariants ? "À partir de" : "Prix"}
            </p>
            <p
              className="font-black text-3xl leading-none"
              style={{
                backgroundImage: "linear-gradient(135deg, #a855f7, #06b6d4)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                textShadow: "none",
                filter: "drop-shadow(0 0 8px rgba(168,85,247,0.5))",
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
                  onOpen();
                } else {
                  onAddToCart();
                }
              }}
              className="w-11 h-11 rounded-xl flex items-center justify-center text-white transition disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "rgba(168,85,247,0.12)",
                border: "1px solid rgba(168,85,247,0.3)",
              }}
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
              className="h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              style={{
                backgroundImage: inStock
                  ? "linear-gradient(135deg, #a855f7, #7c3aed)"
                  : "linear-gradient(135deg, #555, #333)",
                boxShadow: inStock ? "0 0 24px rgba(168,85,247,0.45)" : "none",
              }}
            >
              <Sparkles className="w-4 h-4" />
              {!inStock ? "Plus de stock" : hasVariants ? "Choisir" : "Acheter"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
