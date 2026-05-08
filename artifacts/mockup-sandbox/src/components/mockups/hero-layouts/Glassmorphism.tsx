import { Shield, Zap, Headphones, ShoppingBag, Users, Star } from "lucide-react";

const reviews = [
  { name: "Mehdi", rating: 5, product: "Netflix Premium", comment: "Produit reçu sans problème, merci !" },
  { name: "Da", rating: 5, product: "DarkGPT", comment: "Bonne expérience, livraison sans souci." },
  { name: "Nathan", rating: 4, product: "Spotify", comment: "Service rapide, correspond bien." },
  { name: "Léa", rating: 5, product: "Adobe CC", comment: "Impeccable, je recommande !" },
  { name: "Yassine", rating: 5, product: "Disney+", comment: "Livraison instantanée, parfait." },
  { name: "Sofia", rating: 5, product: "ChatGPT Plus", comment: "Parfait comme d'habitude !" },
];

function Stars({ n }: { n: number }) {
  return <span style={{ color: "#fbbf24", fontSize: 11 }}>{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

const stats = [
  { icon: ShoppingBag, val: "250+", label: "Commandes", color: "#a855f7" },
  { icon: Users,       val: "120+", label: "Clients",   color: "#06b6d4" },
  { icon: Star,        val: "4.9/5", label: "Satisfaction", color: "#fbbf24" },
];

const badges = [
  { icon: Shield,      label: "Paiement sécurisé" },
  { icon: Zap,         label: "Livraison automatique" },
  { icon: Headphones,  label: "Support rapide" },
];

export function Glassmorphism() {
  return (
    <div style={{ background: "linear-gradient(135deg, #0a0015 0%, #06060f 50%, #000a14 100%)", minHeight: "100vh", fontFamily: "'Inter', sans-serif", padding: 24, position: "relative", overflow: "hidden" }}>
      {/* Background blobs */}
      <div style={{ position: "absolute", top: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(168,85,247,0.18)", filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -60, right: -60, width: 250, height: 250, borderRadius: "50%", background: "rgba(6,182,212,0.14)", filter: "blur(60px)", pointerEvents: "none" }} />

      {/* Main glass card */}
      <div style={{ position: "relative", borderRadius: 24, padding: "28px 28px 20px", background: "rgba(168,85,247,0.06)", backdropFilter: "blur(20px)", border: "1px solid rgba(168,85,247,0.22)", boxShadow: "0 8px 32px rgba(168,85,247,0.12), inset 0 1px 0 rgba(255,255,255,0.06)" }}>

        {/* Badge row */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {badges.map(({ icon: Icon, label }) => (
            <div key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 100, padding: "5px 12px", fontSize: 11, fontWeight: 600, color: "#c084fc" }}>
              <Icon size={12} strokeWidth={2.5} />
              {label}
            </div>
          ))}
        </div>

        {/* Title */}
        <h2 style={{ fontSize: 28, fontWeight: 900, color: "#f0eaff", marginBottom: 6, letterSpacing: "-0.02em" }}>
          Bienvenue sur{" "}
          <span style={{ background: "linear-gradient(90deg, #a855f7, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NexoShop</span>
        </h2>
        <p style={{ color: "#8b7ea8", fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
          Une plateforme rapide, sécurisée et automatisée pour accéder à tes services préférés.
        </p>

        {/* Stats — glass pills with lucide icons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 22 }}>
          {stats.map(({ icon: Icon, val, label, color }) => (
            <div key={label} style={{ flex: 1, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                <Icon size={20} color={color} strokeWidth={2} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#e2d9f3", lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, color: "#7a6d9a", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Horizontal scrolling reviews */}
        <div style={{ position: "relative", margin: "0 -28px", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 40, background: "linear-gradient(to right, rgba(10,0,21,0.95), transparent)", zIndex: 2 }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 40, background: "linear-gradient(to left, rgba(10,0,21,0.95), transparent)", zIndex: 2 }} />
          <div style={{ display: "flex", gap: 10, animation: "marquee 22s linear infinite", width: "max-content", padding: "4px 28px" }}>
            {[...reviews, ...reviews].map((r, i) => (
              <div key={i} style={{ width: 240, flexShrink: 0, background: "rgba(168,85,247,0.07)", backdropFilter: "blur(10px)", border: "1px solid rgba(168,85,247,0.16)", borderRadius: 14, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, rgba(168,85,247,0.4), rgba(6,182,212,0.4))", border: "1px solid rgba(168,85,247,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#e2d9f3", flexShrink: 0 }}>{r.name[0]}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#e2d9f3" }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: "#7a6d9a" }}>sur {r.product}</div>
                  </div>
                  <Stars n={r.rating} />
                </div>
                <p style={{ fontSize: 12, color: "#c0b8d8", lineHeight: 1.4 }}>« {r.comment} »</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}
