export function LuxeMinimal() {
  const products = [
    { name: "Netflix Premium", price: "4.99", category: "Streaming", badge: "Populaire" },
    { name: "Spotify Duo", price: "2.49", category: "Musique", badge: "Nouveau" },
    { name: "Adobe CC", price: "12.99", category: "Créatif", badge: null },
    { name: "Disney+", price: "3.49", category: "Streaming", badge: "Solde" },
  ];
  return (
    <div style={{ background: "#fafaf8", minHeight: "100vh", fontFamily: "'Inter', sans-serif", color: "#1a1a1a" }}>
      {/* Header */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e0d8", padding: "0 48px", height: 70, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#1a1a1a", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#c9a84c" }}>N</div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.02em", color: "#1a1a1a" }}>NEXOSHOP</span>
        </div>
        <nav style={{ display: "flex", gap: 40, fontSize: 13, fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
          {["Boutique", "Tarifs", "Avis", "Support"].map(n => (
            <span key={n} style={{ color: "#6b6b6b", cursor: "pointer" }}>{n}</span>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 12 }}>
          <button style={{ padding: "9px 22px", borderRadius: 4, border: "1px solid #1a1a1a", background: "transparent", color: "#1a1a1a", fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", cursor: "pointer" }}>Connexion</button>
          <button style={{ padding: "9px 22px", borderRadius: 4, border: "none", background: "#1a1a1a", color: "#c9a84c", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer" }}>S'inscrire</button>
        </div>
      </header>

      {/* Hero */}
      <section style={{ padding: "100px 48px 80px", display: "flex", alignItems: "center", gap: 80, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
            <div style={{ width: 32, height: 1, background: "#c9a84c" }} />
            <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#c9a84c" }}>Accès Premium</span>
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: "-0.03em", color: "#1a1a1a" }}>
            Les Meilleures<br />
            <span style={{ color: "#c9a84c" }}>Plateformes</span><br />
            au Meilleur Prix
          </h1>
          <p style={{ color: "#6b6b6b", fontSize: 16, lineHeight: 1.7, marginBottom: 40, maxWidth: 420 }}>
            Accédez aux comptes premium que vous aimez, livrés instantanément, à des tarifs imbattables.
          </p>
          <div style={{ display: "flex", gap: 16 }}>
            <button style={{ padding: "14px 32px", borderRadius: 4, border: "none", background: "#1a1a1a", color: "#c9a84c", fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", cursor: "pointer" }}>EXPLORER</button>
            <button style={{ padding: "14px 32px", borderRadius: 4, border: "1px solid #d4d0c8", background: "transparent", color: "#1a1a1a", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>En savoir plus</button>
          </div>
        </div>
        <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[{ emoji: "🎬", name: "Netflix" }, { emoji: "🎵", name: "Spotify" }, { emoji: "🎨", name: "Adobe" }, { emoji: "🏰", name: "Disney+" }].map(i => (
            <div key={i.name} style={{ background: "#fff", border: "1px solid #e5e0d8", borderRadius: 8, padding: 20, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontSize: 28 }}>{i.emoji}</div>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{i.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Divider */}
      <div style={{ display: "flex", justifyContent: "center", gap: 80, padding: "36px 48px", background: "#1a1a1a", color: "#fafaf8" }}>
        {[["2 400+", "Clients"], ["99.9%", "Disponibilité"], ["< 2 min", "Livraison"], ["4.9 / 5", "Satisfaction"]].map(([v, l]) => (
          <div key={l} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#c9a84c" }}>{v}</div>
            <div style={{ fontSize: 12, color: "#a0998a", marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Products */}
      <section style={{ padding: "72px 48px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 40 }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <div style={{ width: 24, height: 1, background: "#c9a84c" }} />
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", color: "#c9a84c" }}>Sélection</span>
            </div>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: "#1a1a1a", letterSpacing: "-0.02em" }}>Nos produits phares</h2>
          </div>
          <span style={{ color: "#c9a84c", fontSize: 13, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", cursor: "pointer" }}>Tout voir →</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {products.map(p => (
            <div key={p.name} style={{ background: "#fff", border: "1px solid #e5e0d8", borderRadius: 8, padding: 28, position: "relative" }}>
              {p.badge && (
                <div style={{ position: "absolute", top: 16, right: 16, background: p.badge === "Populaire" ? "#1a1a1a" : p.badge === "Nouveau" ? "#c9a84c" : "#c9a84c", borderRadius: 3, padding: "3px 10px", fontSize: 10, fontWeight: 700, color: p.badge === "Populaire" ? "#c9a84c" : "#1a1a1a", letterSpacing: "0.1em", textTransform: "uppercase" }}>{p.badge}</div>
              )}
              <div style={{ fontSize: 11, color: "#9a8f80", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>{p.category}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: "#1a1a1a", marginBottom: 20, letterSpacing: "-0.01em" }}>{p.name}</div>
              <div style={{ borderTop: "1px solid #e5e0d8", paddingTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: "#1a1a1a" }}>{p.price}<span style={{ fontSize: 14, fontWeight: 500, color: "#9a8f80" }}>€</span></span>
                <button style={{ padding: "8px 18px", borderRadius: 4, border: "none", background: "#1a1a1a", color: "#c9a84c", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}>ACHETER</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid #e5e0d8", padding: "32px 48px", textAlign: "center", color: "#9a8f80", fontSize: 12, letterSpacing: "0.05em" }}>
        © 2026 NEXOSHOP · TOUS DROITS RÉSERVÉS · PAIEMENTS SÉCURISÉS
      </footer>
    </div>
  );
}
