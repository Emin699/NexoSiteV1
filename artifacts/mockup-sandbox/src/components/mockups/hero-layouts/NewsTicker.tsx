const reviews = [
  { name: "Mehdi", rating: 5, product: "Netflix Premium", comment: "Produit reçu sans problème, merci !" },
  { name: "Da", rating: 5, product: "DarkGPT", comment: "Bonne expérience, livraison sans souci." },
  { name: "Nathan", rating: 4, product: "Spotify", comment: "Service rapide, correspond bien." },
  { name: "Léa", rating: 5, product: "Adobe CC", comment: "Impeccable, je recommande !" },
  { name: "Yassine", rating: 5, product: "Disney+", comment: "Livraison instantanée, parfait." },
  { name: "Sofia", rating: 5, product: "ChatGPT Plus", comment: "Parfait comme d'habitude !" },
];

export function NewsTicker() {
  const tickerItems = [...reviews, ...reviews];

  return (
    <div style={{ background: "#06060f", minHeight: "100vh", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* TOP TICKER BAR */}
      <div style={{ background: "#a855f7", padding: "0", overflow: "hidden", height: 36, display: "flex", alignItems: "center", position: "relative" }}>
        {/* "LIVE" badge */}
        <div style={{ background: "#06b6d4", padding: "0 14px", height: "100%", display: "flex", alignItems: "center", gap: 6, flexShrink: 0, zIndex: 2 }}>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", animation: "blink 1s step-end infinite" }} />
          <span style={{ fontSize: 11, fontWeight: 900, color: "#fff", letterSpacing: "0.12em" }}>LIVE</span>
        </div>
        {/* Scrolling ticker */}
        <div style={{ overflow: "hidden", flex: 1 }}>
          <div style={{ display: "flex", animation: "ticker 20s linear infinite", width: "max-content" }}>
            {tickerItems.map((r, i) => (
              <span key={i} style={{ fontSize: 12, color: "#fff", fontWeight: 600, whiteSpace: "nowrap", padding: "0 28px" }}>
                <span style={{ opacity: 0.7 }}>★{r.rating}</span> {r.name} sur {r.product} — « {r.comment} »
                <span style={{ opacity: 0.4, margin: "0 12px" }}>//</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN HERO */}
      <div style={{ flex: 1, padding: "40px 32px 32px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 20% 60%, rgba(168,85,247,0.1) 0%, transparent 60%)", pointerEvents: "none" }} />

        {/* Tag */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
          <div style={{ padding: "3px 10px", background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 4, fontSize: 10, fontWeight: 800, color: "#a855f7", letterSpacing: "0.1em", textTransform: "uppercase" }}>⚡ Livraison instantanée</div>
          <div style={{ padding: "3px 10px", background: "rgba(6,182,212,0.1)", border: "1px solid rgba(6,182,212,0.25)", borderRadius: 4, fontSize: 10, fontWeight: 700, color: "#06b6d4", letterSpacing: "0.1em" }}>Disponible 24h/24</div>
        </div>

        {/* Big title */}
        <h2 style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", marginBottom: 14 }}>
          <span style={{ color: "#f0eaff" }}>Bienvenue sur </span>
          <span style={{ background: "linear-gradient(90deg, #a855f7, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NexoShop</span>
        </h2>
        <p style={{ fontSize: 14, color: "#7a6d9a", marginBottom: 32, lineHeight: 1.6, maxWidth: 480 }}>
          Abonnements, clés &amp; outils IA livrés en quelques secondes. Rejoins nos milliers de clients satisfaits.
        </p>

        {/* Stats in a news-card style */}
        <div style={{ display: "flex", gap: 12 }}>
          {[
            { val: "23", label: "Commandes", icon: "📦", accent: "#a855f7" },
            { val: "60", label: "Utilisateurs", icon: "👤", accent: "#06b6d4" },
            { val: "15", label: "Avis · 5.0★", icon: "⭐", accent: "#fbbf24" },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: "14px", background: "rgba(255,255,255,0.025)", border: `1px solid ${s.accent}28`, borderTop: `3px solid ${s.accent}`, borderRadius: "0 0 10px 10px" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: s.accent, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "#5a4d7a", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
