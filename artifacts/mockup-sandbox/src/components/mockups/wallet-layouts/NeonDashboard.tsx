import { Wallet, Coins, ArrowUpRight, ArrowDownLeft, Zap, TrendingUp, ChevronRight } from "lucide-react";
import { LitecoinLogo, PaypalLogo, SumUpLogo } from "./logos";

const transactions = [
  { label: "Netflix Premium", type: "out", amount: 14.99, date: "Auj." },
  { label: "Recharge LTC", type: "in", amount: 20.00, date: "Hier" },
  { label: "ChatGPT Plus", type: "out", amount: 19.99, date: "12/05" },
  { label: "Recharge SumUp", type: "in", amount: 50.00, date: "10/05" },
];

const methods = [
  { logo: <LitecoinLogo size={28} />, name: "Litecoin", sub: "+5% bonus", color: "#BFBBBB", active: true },
  { logo: <PaypalLogo size={28} />,   name: "PayPal",   sub: "Maintenance", color: "#003087", active: false },
  { logo: <SumUpLogo size={28} />,    name: "SumUp",    sub: "Visa / Mastercard", color: "#00D4AA", active: true },
];

export function NeonDashboard() {
  return (
    <div style={{ background: "#07050f", minHeight: "100vh", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Top neon bar */}
      <div style={{ height: 3, background: "linear-gradient(90deg, #7c3aed, #a855f7 40%, #06b6d4 70%, #a855f7)" }} />

      {/* Balance section */}
      <div style={{ padding: "22px 20px 18px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -60, left: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(168,85,247,0.15)", filter: "blur(50px)", pointerEvents: "none" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Wallet size={14} color="#a855f7" />
            <span style={{ fontSize: 11, color: "#7a6d9a", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Portefeuille</span>
          </div>
          <div style={{ fontSize: 10, color: "#5a4d7a", display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
            Connecté
          </div>
        </div>
        <div style={{ fontSize: 46, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, fontFamily: "monospace" }}>
          6<span style={{ color: "#a855f7" }}>.</span>00
          <span style={{ fontSize: 20, color: "#a855f7", marginLeft: 4 }}>EUR</span>
        </div>

        {/* Quick stats */}
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 10, padding: "8px 10px" }}>
            <Coins size={13} color="#06b6d4" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#06b6d4" }}>181</div>
              <div style={{ fontSize: 9, color: "#5a4d7a" }}>points</div>
            </div>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, background: "rgba(168,85,247,0.07)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 10, padding: "8px 10px" }}>
            <TrendingUp size={13} color="#a855f7" />
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#a855f7" }}>5.00€</div>
              <div style={{ fontSize: 9, color: "#5a4d7a" }}>rechargé</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", margin: "0 20px", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.15)", borderRadius: 12, padding: 4 }}>
        <div style={{ flex: 1, textAlign: "center", padding: "8px 0", borderRadius: 9, background: "rgba(168,85,247,0.2)", fontSize: 12, fontWeight: 700, color: "#a855f7" }}>Recharger</div>
        <div style={{ flex: 1, textAlign: "center", padding: "8px 0", fontSize: 12, fontWeight: 500, color: "#5a4d7a" }}>Historique</div>
      </div>

      {/* Payment methods — horizontal scroll chips */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ fontSize: 11, color: "#5a4d7a", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>Méthode de paiement</div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {methods.map((m, i) => (
            <div key={i} style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 16px", background: i === 0 ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.03)", border: i === 0 ? "1px solid rgba(168,85,247,0.35)" : "1px solid rgba(255,255,255,0.06)", borderRadius: 14, opacity: m.active ? 1 : 0.5, cursor: m.active ? "pointer" : "default", minWidth: 90 }}>
              {m.logo}
              <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#e2d9f3" : "#7a6d9a" }}>{m.name}</div>
              <div style={{ fontSize: 9, color: i === 0 ? "#a855f7" : "#5a4d7a", textAlign: "center" }}>{m.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected method detail — Litecoin */}
      <div style={{ margin: "14px 20px 0", background: "rgba(168,85,247,0.06)", border: "1px solid rgba(168,85,247,0.2)", borderRadius: 16, padding: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <Zap size={12} color="#22c55e" />
          <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 600 }}>+5% bonus • +10% au-dessus de 100€</span>
        </div>
        <button style={{ width: "100%", padding: "13px 0", borderRadius: 12, background: "linear-gradient(90deg, #a855f7, #06b6d4)", border: "none", fontSize: 14, fontWeight: 700, color: "#fff", cursor: "pointer", letterSpacing: "0.02em" }}>
          Générer un lien LTC
        </button>
      </div>

      {/* Recent transactions */}
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: "#5a4d7a", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Transactions</div>
          <div style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 11, color: "#a855f7", cursor: "pointer" }}>Voir tout <ChevronRight size={11} /></div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {transactions.map((t, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < transactions.length - 1 ? "1px solid rgba(168,85,247,0.07)" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: t.type === "in" ? "rgba(34,197,94,0.1)" : "rgba(168,85,247,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {t.type === "in"
                  ? <ArrowDownLeft size={14} color="#22c55e" />
                  : <ArrowUpRight size={14} color="#a855f7" />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#e2d9f3" }}>{t.label}</div>
                <div style={{ fontSize: 10, color: "#5a4d7a" }}>{t.date}</div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.type === "in" ? "#22c55e" : "#e2d9f3" }}>
                {t.type === "in" ? "+" : "-"}{t.amount.toFixed(2)}€
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
