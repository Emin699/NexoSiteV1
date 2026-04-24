import { ShoppingCart, Zap, Flame, Shield } from "lucide-react";
import { MOCK_PRODUCT } from "./_mock";

export function NeonGaming() {
  const p = MOCK_PRODUCT;
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-black relative overflow-hidden">
      {/* Grid background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(rgba(168,85,247,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.15) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent,black_70%)]" />

      <div className="relative w-full max-w-[340px]">
        {/* Outer neon glow */}
        <div className="absolute -inset-[2px] bg-gradient-to-br from-cyan-400 via-fuchsia-500 to-violet-500 rounded-[20px] animate-pulse" style={{ animationDuration: "3s" }} />

        <div className="relative rounded-[18px] bg-zinc-950 overflow-hidden">
          {/* Top stripe */}
          <div className="h-1 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-violet-500" />

          {/* Image with cyber overlay */}
          <div className="relative h-40 overflow-hidden bg-zinc-900">
            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal hover:opacity-100 transition" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/40 to-transparent" />
            {/* Scan line */}
            <div className="absolute inset-x-0 top-1/3 h-px bg-cyan-400/50 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />

            <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded bg-black/80 border border-fuchsia-500/50 text-[10px] font-mono font-bold text-fuchsia-400 uppercase tracking-[0.2em]">
              <Flame className="w-3 h-3" />
              HOT
            </div>
            <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/80 border border-cyan-500/50 text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
              {p.category}
            </div>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            <div>
              <h3 className="font-black text-xl text-white leading-tight uppercase tracking-tight">
                {p.name}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-400 uppercase">
                <span className="text-cyan-400">★ {p.rating}</span>
                <span>·</span>
                <span>{p.sold.toLocaleString("fr")} ventes</span>
                <span>·</span>
                <span className="text-emerald-400 flex items-center gap-1"><Shield className="w-2.5 h-2.5" />GARANTI</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">{p.description}</p>

            {/* Price block */}
            <div className="flex items-end justify-between pt-1 border-t border-zinc-800">
              <div className="pt-2">
                <p className="text-[9px] uppercase font-mono tracking-[0.2em] text-zinc-500">PRICE</p>
                <p className="font-mono font-black text-3xl text-cyan-400 leading-none drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]">
                  {p.price.toFixed(2)}<span className="text-fuchsia-400">€</span>
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button className="h-10 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition shadow-[inset_0_0_15px_rgba(34,211,238,0.1)]">
                <ShoppingCart className="w-3.5 h-3.5" /> Panier
              </button>
              <button className="h-10 rounded-md bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(217,70,239,0.5)] transition">
                <Zap className="w-3.5 h-3.5" /> Buy
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
