export function Cyberpunk() {
  const products = [
    { name: "Netflix Premium", price: "4.99", category: "Streaming", badge: "Populaire" },
    { name: "Spotify Duo", price: "2.49", category: "Musique", badge: "Nouveau" },
    { name: "Adobe CC", price: "12.99", category: "Créatif", badge: null },
    { name: "Disney+", price: "3.49", category: "Streaming", badge: "Solde" },
  ];
  return (
    <div style={{ background: "#06060f", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#e2e8f0" }}>
      {/* Header */}
      <header style={{ background: "rgba(10,10,20,0.95)", borderBottom: "1px solid rgba(168,85,247,0.3)", padding: "0 32px", height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #a855f7, #06b6d4)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, boxShadow: "0 0 20px rgba(168,85,247,0.5)" }}>N</div>
          <span style={{ fontWeight: 800, fontSize: 20, background: "linear-gradient(90deg, #a855f7, #06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NexoShop</span>
        </div>
        <nav style={{ display: "flex", gap: 32, fontSize: 14, fontWeight: 500 }}>
          {["Boutique", "Tarifs", "Avis", "Support"].map(n => (
            <span key={n} style={{ color: "#94a3b8", cursor: "pointer", transition: "color 0.2s" }}>{n}</span>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(168,85,247,0.5)", background: "transparent", color: "#a855f7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Connexion</button>
          <button style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", boxShadow: "0 0 20px rgba(168,85,247,0.4)" }}>S'inscrire</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "80px 32px 60px", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(168,85,247,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 100, padding: "6px 16px", fontSize: 13, color: "#c084fc", marginBottom: 24, fontWeight: 600 }}>
          ⚡ Livraison instantanée · Disponible 24h/24
        </div>
        <h1 style={{ fontSize: 56, fontWeight: 900, lineHeight: 1.1, marginBottom: 20, background: "linear-gradient(135deg, #ffffff 0%, #a855f7 50%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Comptes Premium<br />au Meilleur Prix
        </h1>
        <p style={{ color: "#94a3b8", fontSize: 18, maxWidth: 500, margin: "0 auto 36px", lineHeight: 1.6 }}>
          Accède aux meilleures plateformes numériques en quelques secondes.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
          <button style={{ padding: "14px 32px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #a855f7, #7c3aed)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 0 30px rgba(168,85,247,0.5)" }}>Explorer la boutique</button>
          <button style={{ padding: "14px 32px", borderRadius: 12, border: "1px solid rgba(6,182,212,0.4)", background: "rgba(6,182,212,0.05)", color: "#06b6d4", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Voir les prix</button>
        </div>
      </section>

      {/* Stats bar */}
      <div style={{ display: "flex", justifyContent: "center", gap: 60, padding: "24px 32px", borderTop: "1px solid rgba(168,85,247,0.1)", borderBottom: "1px solid rgba(168,85,247,0.1)", background: "rgba(168,85,247,0.03)" }}>
        {[["2,400+", "Clients satisfaits"], ["99.9%", "Uptime garanti"], ["< 2min", "Livraison moyenne"], ["4.9/5", "Note moyenne"]].map(([v, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#a855f7" }}>{v}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Products */}
      <section style={{ padding: "60px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#e2e8f0" }}>Produits en vedette</h2>
          <span style={{ color: "#a855f7", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Voir tout →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {products.map(p => (
            <div key={p.name} style={{ background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 16, padding: 24, position: "relative", transition: "all 0.2s" }}>
              {p.badge && (
                <div style={{ position: "absolute", top: 16, right: 16, background: p.badge === "Populaire" ? "#a855f7" : p.badge === "Nouveau" ? "#06b6d4" : "#f59e0b", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff" }}>{p.badge}</div>
              )}
              <div style={{ width: 48, height: 48, background: "linear-gradient(135deg, rgba(168,85,247,0.3), rgba(6,182,212,0.3))", borderRadius: 12, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎬</div>
              <div style={{ fontSize: 12, color: "#a855f7", fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.category}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#e2e8f0", marginBottom: 12 }}>{p.name}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#a855f7" }}>{p.price}€</span>
                <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "rgba(168,85,247,0.2)", color: "#c084fc", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Acheter</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer snippet */}
      <footer style={{ borderTop: "1px solid rgba(168,85,247,0.15)", padding: "32px", textAlign: "center", color: "#475569", fontSize: 13 }}>
        © 2026 NexoShop · Tous droits réservés · Paiements sécurisés
      </footer>
    </div>
  );
}
