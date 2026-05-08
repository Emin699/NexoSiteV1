const reviews = [
  { name: "Mehdi", rating: 5, product: "Netflix Premium", comment: "Produit reçu sans problème, merci !" },
  { name: "Da", rating: 5, product: "DarkGPT", comment: "Bonne expérience, livraison sans souci." },
  { name: "Nathan", rating: 4, product: "Spotify", comment: "Service rapide, correspond bien." },
  { name: "Léa", rating: 5, product: "Adobe CC", comment: "Impeccable, je recommande !" },
  { name: "Yassine", rating: 5, product: "Disney+", comment: "Livraison instantanée, parfait." },
];

export function TerminalHacker() {
  return (
    <div style={{ background: "#050508", minHeight: "100vh", fontFamily: "'Space Mono', 'Courier New', monospace", padding: 20, color: "#a855f7" }}>
      {/* Terminal window chrome */}
      <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 0 40px rgba(168,85,247,0.12)" }}>
        {/* Title bar */}
        <div style={{ background: "rgba(168,85,247,0.1)", borderBottom: "1px solid rgba(168,85,247,0.2)", padding: "10px 16px", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840" }} />
          </div>
          <span style={{ fontSize: 12, color: "#7a6d9a", marginLeft: 8 }}>nexoshop@terminal — bash</span>
        </div>

        {/* Terminal body */}
        <div style={{ background: "#07050f", padding: "20px 20px 24px" }}>
          {/* Boot lines */}
          <div style={{ fontSize: 11, lineHeight: 1.8, marginBottom: 16, color: "#5a4d7a" }}>
            <div><span style={{ color: "#a855f7" }}>$</span> ./nexoshop --start</div>
            <div style={{ color: "#06b6d4" }}>✓ Système chargé · v2.6.1</div>
            <div style={{ color: "#06b6d4" }}>✓ Connexion sécurisée établie</div>
          </div>

          {/* ASCII Logo */}
          <pre style={{ fontSize: 9, lineHeight: 1.3, marginBottom: 16, color: "#a855f7", textShadow: "0 0 10px rgba(168,85,247,0.4)" }}>{`
  ███╗   ██╗███████╗██╗  ██╗ ██████╗
  ████╗  ██║██╔════╝╚██╗██╔╝██╔═══██╗
  ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║
  ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║
  ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝
  ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝  SHOP`}</pre>

          {/* Stats */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, color: "#5a4d7a", marginBottom: 8 }}><span style={{ color: "#a855f7" }}>$</span> status --live</div>
            <div style={{ display: "flex", gap: 16 }}>
              {[["CMD", "23", "commandes"], ["USR", "60", "utilisateurs"], ["RTG", "5.0", "note /5 (15 avis)"]].map(([key, val, label]) => (
                <div key={key}>
                  <span style={{ color: "#5a4d7a" }}>{key}=</span>
                  <span style={{ color: "#06b6d4", fontWeight: 700 }}>{val}</span>
                  <span style={{ color: "#3d3560", fontSize: 10 }}> // {label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews as log entries */}
          <div style={{ fontSize: 11, color: "#5a4d7a", marginBottom: 10 }}><span style={{ color: "#a855f7" }}>$</span> tail -f reviews.log</div>
          <div style={{ borderLeft: "2px solid rgba(168,85,247,0.2)", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {reviews.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ color: "#3d3560", fontSize: 10, whiteSpace: "nowrap", marginTop: 1 }}>[OK]</span>
                <span style={{ color: "#06b6d4", fontWeight: 700 }}>{r.name}</span>
                <span style={{ color: "#5a4d7a" }}>→</span>
                <span style={{ color: "#a855f7" }}>{r.product}</span>
                <span style={{ color: "#fbbf24", fontSize: 10 }}>{"★".repeat(r.rating)}</span>
                <span style={{ color: "#8b7ea8", fontSize: 11, fontStyle: "italic" }}>"{r.comment}"</span>
              </div>
            ))}
            <div style={{ display: "flex", gap: 6 }}>
              <span style={{ color: "#a855f7", animation: "blink 1s step-end infinite" }}>█</span>
              <span style={{ color: "#3d3560", fontSize: 11 }}>En attente de nouveaux avis...</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes blink { 50% { opacity: 0; } }`}</style>
    </div>
  );
}
