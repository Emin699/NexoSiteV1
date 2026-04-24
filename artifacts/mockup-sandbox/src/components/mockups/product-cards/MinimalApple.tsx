import { ShoppingBag, Star } from "lucide-react";
import { MOCK_PRODUCT } from "./_mock";

export function MinimalApple() {
  const p = MOCK_PRODUCT;
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-[#fafafa]">
      <div className="w-full max-w-[340px]">
        {/* Card */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] hover:shadow-[0_25px_80px_-15px_rgba(0,0,0,0.25)] transition-shadow duration-500">
          {/* Big image area with subtle bg */}
          <div className="relative h-56 bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-8">
            <img
              src={p.imageUrl}
              alt={p.name}
              className="w-full h-full object-contain rounded-2xl shadow-md"
            />
            <span className="absolute top-4 right-4 text-[10px] font-semibold text-zinc-400 uppercase tracking-[0.2em]">
              {p.category}
            </span>
          </div>

          {/* Content */}
          <div className="px-6 py-5 space-y-3">
            <div className="flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${i <= Math.round(p.rating) ? "fill-amber-400 text-amber-400" : "text-zinc-200"}`}
                />
              ))}
              <span className="text-[11px] text-zinc-400 ml-1">({p.sold.toLocaleString("fr")})</span>
            </div>

            <h3 className="font-semibold text-2xl text-zinc-900 leading-tight tracking-tight">
              {p.name}
            </h3>

            <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-2">
              {p.description}
            </p>

            <div className="flex items-center justify-between pt-3">
              <div>
                <span className="font-semibold text-2xl text-zinc-900 tracking-tight">
                  {p.price.toFixed(2)}
                </span>
                <span className="text-zinc-400 text-base ml-0.5">€</span>
              </div>
              <button className="h-11 px-5 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-medium flex items-center gap-2 transition active:scale-95">
                <ShoppingBag className="w-4 h-4" />
                Acheter
              </button>
            </div>
          </div>
        </div>

        {/* Subtle caption */}
        <p className="mt-4 text-center text-[11px] text-zinc-400">
          Livraison instantanée · Garantie 1 mois
        </p>
      </div>
    </div>
  );
}
