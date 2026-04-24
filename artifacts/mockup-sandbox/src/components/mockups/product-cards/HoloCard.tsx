import { ShoppingCart, Sparkles, TrendingUp } from "lucide-react";
import { MOCK_PRODUCT } from "./_mock";

export function HoloCard() {
  const p = MOCK_PRODUCT;
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-950 via-purple-950 to-zinc-950">
      <div className="relative w-full max-w-[340px]" style={{ perspective: "1000px" }}>
        {/* Holographic shimmer halo */}
        <div
          className="absolute -inset-3 rounded-[28px] opacity-60 blur-2xl"
          style={{
            background:
              "conic-gradient(from 0deg, #ff6ec4, #7873f5, #4ade80, #facc15, #ff6ec4)",
          }}
        />

        {/* Card with 3D tilt feel */}
        <div
          className="relative rounded-[24px] overflow-hidden bg-zinc-900/90 backdrop-blur-xl border border-white/10"
          style={{
            boxShadow:
              "0 30px 60px -10px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
            transform: "rotateX(2deg)",
          }}
        >
          {/* Holographic shine overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-30 mix-blend-screen"
            style={{
              background:
                "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%), linear-gradient(45deg, rgba(255,110,196,0.2), rgba(120,115,245,0.2), rgba(74,222,128,0.2))",
            }}
          />

          {/* Image */}
          <div className="relative h-44 overflow-hidden">
            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent" />

            {/* Trending badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-lg">
              <TrendingUp className="w-3 h-3" />
              Top vente
            </div>

            {/* Rarity tag */}
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur border border-white/20 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-transparent bg-clip-text"
              style={{ backgroundImage: "linear-gradient(90deg, #ff6ec4, #7873f5, #4ade80)", WebkitBackgroundClip: "text" }}>
              ✦ PREMIUM
            </div>
          </div>

          {/* Content */}
          <div className="relative p-4 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] font-bold text-purple-300/80">
                {p.category}
              </p>
              <h3 className="mt-0.5 font-bold text-xl text-white leading-tight">
                {p.name}
              </h3>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-[11px]">
              <div className="flex items-center gap-1 text-amber-300">
                <Sparkles className="w-3 h-3 fill-amber-300" />
                <span className="font-bold">{p.rating}</span>
              </div>
              <div className="text-zinc-400">
                {p.sold.toLocaleString("fr")} ventes
              </div>
              <div className="ml-auto text-emerald-400 font-semibold">● Stock</div>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
              {p.description}
            </p>

            {/* Price + CTA */}
            <div className="flex items-end justify-between pt-2">
              <div>
                <p className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">À partir de</p>
                <p className="font-black text-3xl leading-none"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #ff6ec4, #7873f5, #4ade80)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                  {p.price.toFixed(2)}€
                </p>
              </div>
            </div>

            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button className="w-11 h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white transition">
                <ShoppingCart className="w-4 h-4" />
              </button>
              <button
                className="h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg"
                style={{
                  backgroundImage: "linear-gradient(135deg, #ff6ec4, #7873f5)",
                  boxShadow: "0 10px 30px -5px rgba(120,115,245,0.6)",
                }}
              >
                <Sparkles className="w-4 h-4" />
                Acheter maintenant
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
