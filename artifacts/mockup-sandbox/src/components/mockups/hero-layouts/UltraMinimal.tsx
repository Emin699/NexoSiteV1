const reviews = [
  { name: "Mehdi", rating: 5, comment: "Produit reçu sans problème." },
  { name: "Da", rating: 5, comment: "Livraison instantanée." },
  { name: "Léa", rating: 5, comment: "Impeccable, je recommande !" },
  { name: "Yassine", rating: 5, comment: "Parfait comme d'habitude." },
  { name: "Sofia", rating: 5, comment: "Très bonne expérience." },
  { name: "Kevin", rating: 4, comment: "Bon rapport qualité-prix." },
];

export function UltraMinimal() {
  return (
    <div style={{ background: "#06060f", minHeight: "100vh", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Ultra-thin top bar */}
      <div style={{ height: 2, background: "linear-gradient(90deg, transparent, #a855f7, #06b6d4, #a855f7, transparent)" }} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "32px 36px", maxWidth: 700, margin: "0 auto", width: "100%" }}>
        {/* Eyebrow */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a855f7", boxShadow: "0 0 8px #a855f7" }} />
          <span style={{ fontSize: 11, color: "#7a6d9a", letterSpacing: "0.15em", textTransform: "uppercase", fontWeight: 600 }}>
            Livraison instantanée · 24h/24
          </span>
        </div>

        {/* Title — very large, bold */}
        <h2 style={{ fontSize: 48, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.04em", color: "#f0eaff", marginBottom: 12 }}>
          Bienvenue sur<br />
          <span style={{ WebkitTextStroke: "1px rgba(168,85,247,0.6)", WebkitTextFillColor: "transparent" }}>NexoShop</span>
        </h2>

        <p style={{ fontSize: 14, color: "#5a4d7a", marginBottom: 32, lineHeight: 1.6 }}>
          Abonnements, clés &amp; outils IA livrés en quelques secondes.
        </p>

        {/* Stats — inline minimalist */}
        <div style={{ display: "flex", gap: 24, marginBottom: 36, borderBottom: "1px solid rgba(168,85,247,0.12)", paddingBottom: 28 }}>
          {[["23", "commandes", "#a855f7"], ["60", "utilisateurs", "#06b6d4"], ["5.0", "note / 5", "#fbbf24"]].map(([v, l, c]) => (
            <div key={l}>
              <div style={{ fontSize: 28, fontWeight: 900, color: c as string, lineHeight: 1 }}>{v}</div>
              <div style={{ fontSize: 11, color: "#3d3560", marginTop: 3, letterSpacing: "0.05em" }}>{l}</div>
            </div>
          ))}
          <div style={{ width: 1, background: "rgba(168,85,247,0.1)", alignSelf: "stretch" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "#fbbf24", fontSize: 16 }}>★★★★★</span>
            <span style={{ fontSize: 11, color: "#5a4d7a" }}>15 avis clients</span>
          </div>
        </div>

        {/* Reviews — minimal list */}
        <div style={{ fontSize: 11, color: "#5a4d7a", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 12, fontWeight: 700 }}>Derniers avis</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {reviews.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(168,85,247,0.07)" }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#c084fc", flexShrink: 0 }}>{r.name[0]}</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#e2d9f3", minWidth: 56 }}>{r.name}</span>
              <span style={{ color: "#fbbf24", fontSize: 9, letterSpacing: 1 }}>{"★".repeat(r.rating)}</span>
              <span style={{ fontSize: 12, color: "#7a6d9a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.comment}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
