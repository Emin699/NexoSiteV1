import { ShoppingCart, Zap, Star, CheckCircle2 } from "lucide-react";
import { MOCK_PRODUCT } from "./_mock";

export function PremiumGlass() {
  const p = MOCK_PRODUCT;
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#0a0a14] relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.25),transparent_55%),radial-gradient(circle_at_70%_80%,rgba(236,72,153,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(0,0,0,0.4))]" />

      <div className="relative w-full max-w-[340px]">
        {/* Glow halo */}
        <div className="absolute -inset-2 bg-gradient-to-br from-violet-500/40 via-fuchsia-500/30 to-cyan-500/40 rounded-[28px] blur-2xl opacity-70" />

        {/* Glass card */}
        <div className="relative rounded-[24px] overflow-hidden bg-white/[0.04] backdrop-blur-2xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_30px_60px_-15px_rgba(0,0,0,0.7)]">
          {/* Image with overlay */}
          <div className="relative h-44 overflow-hidden">
            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-wider text-white">
              {p.category}
            </div>
            <div className="absolute top-3 right-3 px-2 py-1 rounded-full bg-emerald-500/90 backdrop-blur text-[10px] font-bold text-white flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              En stock
            </div>
            <div className="absolute bottom-3 left-3 right-3">
              <h3 className="font-bold text-xl text-white leading-tight drop-shadow">{p.name}</h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-white">{p.rating}</span>
                <span className="text-[10px] text-white/70">· {p.sold.toLocaleString("fr")} ventes</span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-4">
            <p className="text-xs text-white/60 leading-relaxed line-clamp-2">{p.description}</p>

            {/* Price + buttons */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40">Prix</p>
                <p className="font-mono font-black text-3xl bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent leading-none">
                  {p.price.toFixed(2)}€
                </p>
              </div>
              <div className="flex gap-2">
                <button className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/80 transition">
                  <ShoppingCart className="w-4 h-4" />
                </button>
                <button className="h-10 px-4 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 shadow-lg shadow-violet-500/40 text-white font-bold text-sm flex items-center gap-1.5 transition">
                  <Zap className="w-4 h-4" />
                  Acheter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
