export function MidnightBlue() {
  const products = [
    { name: "Netflix Premium", price: "4.99", category: "Streaming", badge: "Populaire" },
    { name: "Spotify Duo", price: "2.49", category: "Musique", badge: "Nouveau" },
    { name: "Adobe CC", price: "12.99", category: "Créatif", badge: null },
    { name: "Disney+", price: "3.49", category: "Streaming", badge: "Solde" },
  ];
  return (
    <div style={{ background: "#0a1628", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#e8edf5" }}>
      {/* Header */}
      <header style={{ background: "rgba(10,22,40,0.98)", borderBottom: "1px solid rgba(245,158,11,0.2)", padding: "0 40px", height: 68, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, backdropFilter: "blur(8px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #1e3a5f, #2d5a87)", border: "2px solid rgba(245,158,11,0.4)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: "#f59e0b" }}>N</div>
          <span style={{ fontWeight: 800, fontSize: 20, color: "#e8edf5", letterSpacing: "-0.01em" }}>Nexo<span style={{ color: "#f59e0b" }}>Shop</span></span>
        </div>
        <nav style={{ display: "flex", gap: 36, fontSize: 14, fontWeight: 500 }}>
          {["Boutique", "Tarifs", "Avis", "Support"].map(n => (
            <span key={n} style={{ color: "#8fa4bf", cursor: "pointer" }}>{n}</span>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ padding: "9px 22px", borderRadius: 8, border: "1px solid rgba(245,158,11,0.3)", background: "transparent", color: "#f59e0b", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Connexion</button>
          <button style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#0a1628", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>S'inscrire</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "90px 40px 70px", maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "absolute", right: 40, top: 60, width: 480, height: 480, background: "radial-gradient(ellipse, rgba(30,58,95,0.8) 0%, transparent 70%)", borderRadius: "50%", border: "1px solid rgba(245,158,11,0.1)" }} />
        <div style={{ maxWidth: 620, position: "relative", zIndex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", borderRadius: 100, padding: "6px 16px", marginBottom: 28, fontSize: 13, color: "#f59e0b", fontWeight: 600 }}>
            ✦ Livraison instantanée garantie
          </div>
          <h1 style={{ fontSize: 54, fontWeight: 900, lineHeight: 1.1, marginBottom: 22, letterSpacing: "-0.02em" }}>
            Accès Premium<br />
            <span style={{ color: "#f59e0b" }}>Sans Compromis</span>
          </h1>
          <p style={{ color: "#8fa4bf", fontSize: 17, lineHeight: 1.7, marginBottom: 40 }}>
            Profitez des meilleures plateformes numériques à des prix imbattables. Livraison en moins de 2 minutes, 24h/24.
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <button style={{ padding: "15px 36px", borderRadius: 10, border: "none", background: "#f59e0b", color: "#0a1628", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(245,158,11,0.3)" }}>Explorer la boutique</button>
            <button style={{ padding: "15px 36px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "#e8edf5", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Voir les tarifs</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div style={{ background: "#0f1f3a", borderTop: "1px solid rgba(245,158,11,0.12)", borderBottom: "1px solid rgba(245,158,11,0.12)", padding: "28px 40px", display: "flex", justifyContent: "center", gap: 80 }}>
        {[["2 400+", "Clients satisfaits"], ["99.9%", "Disponibilité"], ["< 2 min", "Livraison"], ["4.9/5", "Note clients"]].map(([v, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#f59e0b" }}>{v}</div>
            <div style={{ fontSize: 13, color: "#5a7a9a", marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Products */}
      <section style={{ padding: "64px 40px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#e8edf5" }}>Produits en vedette</h2>
            <div style={{ width: 48, height: 3, background: "#f59e0b", borderRadius: 2, marginTop: 8 }} />
          </div>
          <span style={{ color: "#f59e0b", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Voir tout →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {products.map(p => (
            <div key={p.name} style={{ background: "#0f1f3a", border: "1px solid rgba(245,158,11,0.15)", borderRadius: 14, padding: 24, position: "relative" }}>
              {p.badge && (
                <div style={{ position: "absolute", top: 14, right: 14, background: p.badge === "Populaire" ? "#f59e0b" : p.badge === "Nouveau" ? "#3b82f6" : "#ef4444", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: p.badge === "Populaire" ? "#0a1628" : "#fff" }}>{p.badge}</div>
              )}
              <div style={{ width: 48, height: 48, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 12, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎬</div>
              <div style={{ fontSize: 11, color: "#5a7a9a", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{p.category}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#e8edf5", marginBottom: 16 }}>{p.name}</div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{p.price}€</span>
                <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#0a1628", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Acheter</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(245,158,11,0.12)", padding: "28px", textAlign: "center", color: "#3d5a7a", fontSize: 13 }}>
        © 2026 NexoShop · Tous droits réservés · Paiements sécurisés
      </footer>
    </div>
  );
}
