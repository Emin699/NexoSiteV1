const reviews = [
  { name: "Mehdi", rating: 5, product: "Netflix", comment: "Reçu en 2 min !" },
  { name: "Da", rating: 5, product: "DarkGPT", comment: "Livraison sans souci." },
  { name: "Léa", rating: 5, product: "Adobe", comment: "Je recommande !" },
  { name: "Yassine", rating: 5, product: "Disney+", comment: "Instantané !" },
  { name: "Sofia", rating: 5, product: "ChatGPT", comment: "Parfait toujours." },
  { name: "Kevin", rating: 4, product: "Xbox GP", comment: "Très bon rapport qualité-prix." },
];

function Stars({ n }: { n: number }) {
  return <span style={{ color: "#fbbf24", fontSize: 10 }}>{"★".repeat(n)}</span>;
}

const positions = [
  { top: "12%", left: "2%" },
  { top: "5%", left: "36%" },
  { top: "18%", left: "66%" },
  { top: "54%", left: "8%" },
  { top: "60%", left: "42%" },
  { top: "50%", left: "72%" },
];

export function FloatingCards() {
  return (
    <div style={{ background: "radial-gradient(ellipse at 50% 40%, #0e0520 0%, #06060f 70%)", minHeight: "100vh", fontFamily: "'Inter', sans-serif", position: "relative", overflow: "hidden" }}>
      {/* Large neon rings */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", border: "1px solid rgba(168,85,247,0.08)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 360, height: 360, borderRadius: "50%", border: "1px solid rgba(6,182,212,0.06)", pointerEvents: "none" }} />

      {/* Center title */}
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", textAlign: "center", zIndex: 2 }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", color: "#a855f7", textTransform: "uppercase", marginBottom: 10, textShadow: "0 0 20px rgba(168,85,247,0.6)" }}>⚡ 24H/24 · LIVRAISON INSTANTANÉE</div>
        <h2 style={{ fontSize: 34, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em", color: "#f0eaff", whiteSpace: "nowrap", textShadow: "0 0 40px rgba(168,85,247,0.2)" }}>
          <span style={{ background: "linear-gradient(135deg, #a855f7, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NexoShop</span>
        </h2>
        <p style={{ fontSize: 12, color: "#7a6d9a", marginTop: 8 }}>Abonnements & outils IA</p>

        {/* Stats pills */}
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
          {[["23", "commandes"], ["60", "users"], ["5.0★", "15 avis"]].map(([v, l]) => (
            <div key={l} style={{ padding: "6px 12px", borderRadius: 100, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.22)", fontSize: 11, color: "#e2d9f3", fontWeight: 700 }}>
              <span style={{ color: "#a855f7" }}>{v}</span> <span style={{ color: "#5a4d7a", fontWeight: 400 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Floating review cards */}
      {reviews.map((r, i) => (
        <div key={i} style={{ position: "absolute", ...positions[i], zIndex: 3, width: 170, background: "rgba(168,85,247,0.08)", backdropFilter: "blur(14px)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 14, padding: "10px 12px", boxShadow: "0 8px 24px rgba(168,85,247,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, rgba(168,85,247,0.5), rgba(6,182,212,0.3))", border: "1px solid rgba(168,85,247,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#e2d9f3", flexShrink: 0 }}>{r.name[0]}</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#e2d9f3", lineHeight: 1 }}>{r.name}</div>
              <div style={{ fontSize: 9, color: "#7a6d9a" }}>{r.product}</div>
            </div>
            <Stars n={r.rating} />
          </div>
          <p style={{ fontSize: 11, color: "#c0b8d8", lineHeight: 1.35, margin: 0 }}>« {r.comment} »</p>
        </div>
      ))}
    </div>
  );
}
