const reviews = [
  { name: "Mehdi", rating: 5, product: "Netflix Premium", comment: "Reçu en 2 minutes, impeccable !" },
  { name: "Da", rating: 5, product: "DarkGPT", comment: "Livraison sans souci, parfait." },
  { name: "Léa", rating: 5, product: "Adobe CC", comment: "Je recommande vivement !" },
  { name: "Yassine", rating: 5, product: "Disney+", comment: "Instantané et fiable." },
];

function Stars({ n }: { n: number }) {
  return <span style={{ color: "#fbbf24", fontSize: 10, letterSpacing: 1 }}>{"★".repeat(n)}</span>;
}

export function SplitScreen() {
  return (
    <div style={{ background: "#06060f", minHeight: "100vh", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Top accent line */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #7c3aed, #a855f7, #06b6d4, #a855f7, #7c3aed)" }} />

      <div style={{ display: "flex", flex: 1, gap: 0 }}>
        {/* LEFT SIDE */}
        <div style={{ flex: "0 0 55%", padding: "36px 32px", display: "flex", flexDirection: "column", justifyContent: "center", position: "relative", borderRight: "1px solid rgba(168,85,247,0.15)" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "radial-gradient(ellipse at 30% 50%, rgba(168,85,247,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)", borderRadius: 6, padding: "4px 12px", fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "#c084fc", textTransform: "uppercase", marginBottom: 20, alignSelf: "flex-start" }}>
            ⚡ Livraison instantanée
          </div>

          <h2 style={{ fontSize: 32, fontWeight: 900, lineHeight: 1.1, color: "#f0eaff", marginBottom: 8, letterSpacing: "-0.02em" }}>
            Bienvenue sur<br />
            <span style={{ background: "linear-gradient(90deg, #a855f7 0%, #06b6d4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>NexoShop</span>
          </h2>
          <p style={{ fontSize: 13, color: "#7a6d9a", marginBottom: 28, lineHeight: 1.6 }}>
            Abonnements, clés & outils IA<br />livrés en quelques secondes.
          </p>

          {/* Vertical stats */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { icon: "📦", val: "23", label: "Commandes traitées", color: "#a855f7" },
              { icon: "👤", val: "60", label: "Utilisateurs inscrits", color: "#06b6d4" },
              { icon: "⭐", val: "5.0/5", label: "Note · 15 avis clients", color: "#fbbf24" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(168,85,247,0.12)", borderRadius: 10 }}>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: s.color, minWidth: 52 }}>{s.val}</span>
                <span style={{ fontSize: 12, color: "#5a4d7a" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div style={{ flex: 1, padding: "28px 20px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, background: "rgba(168,85,247,0.02)" }}>
          <div style={{ fontSize: 11, color: "#5a4d7a", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Avis récents</div>
          {reviews.map((r, i) => (
            <div key={i} style={{ background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.16)", borderRadius: 12, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: `linear-gradient(135deg, rgba(168,85,247,0.5), rgba(6,182,212,0.3))`, border: "1px solid rgba(168,85,247,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#e2d9f3", flexShrink: 0 }}>{r.name[0]}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#e2d9f3" }}>{r.name}</span>
                  <Stars n={r.rating} />
                </div>
                <div style={{ fontSize: 10, color: "#7a6d9a", marginBottom: 4 }}>sur {r.product}</div>
                <p style={{ fontSize: 12, color: "#c0b8d8", lineHeight: 1.4 }}>« {r.comment} »</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
