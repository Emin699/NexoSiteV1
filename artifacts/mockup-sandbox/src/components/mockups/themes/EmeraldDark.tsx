export function EmeraldDark() {
  const products = [
    { name: "Netflix Premium", price: "4.99", category: "Streaming", badge: "Populaire" },
    { name: "Spotify Duo", price: "2.49", category: "Musique", badge: "Nouveau" },
    { name: "Adobe CC", price: "12.99", category: "Créatif", badge: null },
    { name: "Disney+", price: "3.49", category: "Streaming", badge: "Solde" },
  ];
  return (
    <div style={{ background: "#080f0c", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#d1fae5" }}>
      {/* Header */}
      <header style={{ background: "rgba(8,15,12,0.96)", borderBottom: "1px solid rgba(16,185,129,0.2)", padding: "0 40px", height: 66, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, backdropFilter: "blur(10px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #059669, #10b981)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 18, color: "#fff", boxShadow: "0 0 20px rgba(16,185,129,0.3)" }}>N</div>
          <span style={{ fontWeight: 800, fontSize: 20, color: "#ecfdf5", letterSpacing: "-0.01em" }}>NexoShop</span>
        </div>
        <nav style={{ display: "flex", gap: 36, fontSize: 14, fontWeight: 500 }}>
          {["Boutique", "Tarifs", "Avis", "Support"].map(n => (
            <span key={n} style={{ color: "#6ee7b7", cursor: "pointer" }}>{n}</span>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ padding: "9px 22px", borderRadius: 8, border: "1px solid rgba(16,185,129,0.3)", background: "transparent", color: "#10b981", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Connexion</button>
          <button style={{ padding: "9px 22px", borderRadius: 8, border: "none", background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(16,185,129,0.35)" }}>S'inscrire</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "90px 40px 70px", maxWidth: 1200, margin: "0 auto", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse, rgba(16,185,129,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto", position: "relative" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 100, padding: "6px 18px", marginBottom: 28, fontSize: 13, color: "#6ee7b7", fontWeight: 600 }}>
            🌿 Transactions rapides, prix justes
          </div>
          <h1 style={{ fontSize: 54, fontWeight: 900, lineHeight: 1.1, marginBottom: 22, letterSpacing: "-0.02em" }}>
            <span style={{ color: "#d1fae5" }}>Des comptes premium</span><br />
            <span style={{ background: "linear-gradient(90deg, #10b981, #34d399, #6ee7b7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>à prix vert</span>
          </h1>
          <p style={{ color: "#6ee7b7", opacity: 0.7, fontSize: 17, lineHeight: 1.7, marginBottom: 40 }}>
            Streaming, musique, créativité — tous les accès premium que tu aimes, livrés en quelques minutes.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
            <button style={{ padding: "15px 36px", borderRadius: 12, border: "none", background: "linear-gradient(135deg, #059669, #10b981)", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", boxShadow: "0 8px 24px rgba(16,185,129,0.35)" }}>Explorer la boutique</button>
            <button style={{ padding: "15px 36px", borderRadius: 12, border: "1px solid rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.06)", color: "#6ee7b7", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Voir les prix</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div style={{ background: "rgba(16,185,129,0.05)", borderTop: "1px solid rgba(16,185,129,0.12)", borderBottom: "1px solid rgba(16,185,129,0.12)", padding: "28px 40px", display: "flex", justifyContent: "center", gap: 80 }}>
        {[["2 400+", "Clients satisfaits"], ["99.9%", "Disponibilité"], ["< 2 min", "Livraison"], ["4.9/5", "Note clients"]].map(([v, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#10b981" }}>{v}</div>
            <div style={{ fontSize: 13, color: "#4b7a63", marginTop: 4 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Products */}
      <section style={{ padding: "64px 40px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#d1fae5" }}>Produits en vedette</h2>
          <span style={{ color: "#10b981", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Voir tout →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {products.map(p => (
            <div key={p.name} style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.18)", borderRadius: 16, padding: 24, position: "relative" }}>
              {p.badge && (
                <div style={{ position: "absolute", top: 14, right: 14, background: p.badge === "Populaire" ? "#10b981" : p.badge === "Nouveau" ? "#0d9488" : "#065f46", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700, color: "#fff" }}>{p.badge}</div>
              )}
              <div style={{ width: 48, height: 48, background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🎬</div>
              <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>{p.category}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#d1fae5", marginBottom: 16 }}>{p.name}</div>
              <div style={{ borderTop: "1px solid rgba(16,185,129,0.12)", paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: "#10b981" }}>{p.price}€</span>
                <button style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: "rgba(16,185,129,0.2)", color: "#6ee7b7", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Acheter</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid rgba(16,185,129,0.1)", padding: "28px", textAlign: "center", color: "#2d6b50", fontSize: 13 }}>
        © 2026 NexoShop · Tous droits réservés · Paiements sécurisés
      </footer>
    </div>
  );
}
