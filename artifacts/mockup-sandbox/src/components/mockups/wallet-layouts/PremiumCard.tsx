import { Shield, Zap, TrendingUp, Coins, CreditCard, ChevronRight } from "lucide-react";
import { LitecoinLogo, PaypalLogo, SumUpLogo, VisaBadge, MastercardBadge } from "./logos";

const transactions = [
  { label: "Netflix Premium", amount: -14.99, date: "Aujourd'hui" },
  { label: "Recharge LTC", amount: +20.00, date: "Hier" },
  { label: "ChatGPT Plus", amount: -19.99, date: "12 mai" },
  { label: "Recharge SumUp", amount: +50.00, date: "10 mai" },
];

const methods = [
  {
    id: "ltc",
    logo: <LitecoinLogo />,
    name: "Litecoin",
    tag: "+5% bonus",
    tagColor: "#22c55e",
    desc: "Crypto — sans frais",
    accent: "#345D9D",
  },
  {
    id: "paypal",
    logo: <PaypalLogo />,
    name: "PayPal",
    tag: "maintenance",
    tagColor: "#f59e0b",
    desc: "Temporairement indisponible",
    accent: "#003087",
    disabled: true,
  },
  {
    id: "sumup",
    logo: <SumUpLogo />,
    name: "Carte bancaire",
    tag: "Visa / MC",
    tagColor: "#06b6d4",
    desc: "Via SumUp — sécurisé",
    accent: "#3063E9",
  },
];

export function PremiumCard() {
  return (
    <div style={{ background: "#06060f", minHeight: "100vh", fontFamily: "'Inter', sans-serif", overflowY: "auto", paddingBottom: 24 }}>
      {/* Header */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, color: "#5a4d7a", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>Mon portefeuille</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <Shield size={14} color="#a855f7" />
          <span style={{ fontSize: 11, color: "#a855f7", fontWeight: 600 }}>Sécurisé</span>
        </div>
      </div>

      {/* Premium balance card */}
      <div style={{ margin: "16px 20px 0", borderRadius: 24, overflow: "hidden", position: "relative" }}>
        <div style={{ background: "linear-gradient(135deg, #1a0533 0%, #0d1a3a 60%, #001a20 100%)", padding: "28px 24px 24px", position: "relative" }}>
          {/* Neon glows */}
          <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(168,85,247,0.25)", filter: "blur(50px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -30, left: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(6,182,212,0.2)", filter: "blur(40px)", pointerEvents: "none" }} />
          {/* Shiny top border */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(6,182,212,0.6), transparent)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
              <Zap size={11} color="#a855f7" /> Solde disponible
            </div>
            <div style={{ fontSize: 44, fontWeight: 900, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 20, fontFamily: "'Space Mono', monospace" }}>
              6.00<span style={{ fontSize: 24, verticalAlign: "super", color: "#a855f7" }}>€</span>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px", border: "1px solid rgba(168,85,247,0.15)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <Coins size={9} /> Points fidélité
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#06b6d4" }}>181</div>
              </div>
              <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px", border: "1px solid rgba(168,85,247,0.15)" }}>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                  <TrendingUp size={9} /> Total rechargé
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#a855f7" }}>5.00€</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ fontSize: 11, color: "#5a4d7a", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Recharger</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {methods.map(m => (
            <div key={m.id} style={{ background: m.disabled ? "rgba(255,255,255,0.02)" : "rgba(168,85,247,0.05)", border: `1px solid ${m.disabled ? "rgba(255,255,255,0.06)" : "rgba(168,85,247,0.18)"}`, borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, opacity: m.disabled ? 0.55 : 1, cursor: m.disabled ? "default" : "pointer" }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: `${m.accent}18`, border: `1px solid ${m.accent}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {m.logo}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: m.disabled ? "#5a4d7a" : "#e2d9f3" }}>{m.name}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: m.tagColor, background: `${m.tagColor}18`, padding: "2px 7px", borderRadius: 100, border: `1px solid ${m.tagColor}30` }}>{m.tag}</span>
                </div>
                <div style={{ fontSize: 12, color: "#5a4d7a", marginTop: 2 }}>{m.desc}</div>
              </div>
              {!m.disabled && <ChevronRight size={16} color="#a855f7" />}
            </div>
          ))}
        </div>
      </div>

      {/* Recent transactions */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ fontSize: 11, color: "#5a4d7a", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>Historique récent</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {transactions.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid rgba(168,85,247,0.08)" }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: t.amount > 0 ? "rgba(34,197,94,0.1)" : "rgba(168,85,247,0.1)", border: `1px solid ${t.amount > 0 ? "rgba(34,197,94,0.2)" : "rgba(168,85,247,0.2)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {t.amount > 0 ? <TrendingUp size={14} color="#22c55e" /> : <CreditCard size={14} color="#a855f7" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#e2d9f3" }}>{t.label}</div>
                <div style={{ fontSize: 10, color: "#5a4d7a" }}>{t.date}</div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.amount > 0 ? "#22c55e" : "#e2d9f3" }}>
                {t.amount > 0 ? "+" : ""}{t.amount.toFixed(2)}€
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
