import { ArrowDownLeft, ArrowUpRight, Zap, Coins, TrendingUp, ChevronRight, Shield } from "lucide-react";

const amounts = [5, 10, 20, 30, 50];
const transactions = [
  { label: "Netflix Premium",  type: "out", amount: 14.99, date: "Aujourd'hui" },
  { label: "Recharge LTC",     type: "in",  amount: 20.00, date: "Hier" },
  { label: "ChatGPT Plus",     type: "out", amount: 19.99, date: "12 mai" },
  { label: "Recharge SumUp",   type: "in",  amount: 50.00, date: "10 mai" },
];

function LitecoinLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="10" fill="#345D9D" />
      <text x="4" y="15" fontFamily="serif" fontWeight="bold" fontSize="12" fill="white">Ł</text>
    </svg>
  );
}

function PaypalLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <rect width="20" height="20" rx="5" fill="#003087" />
      <text x="4" y="14" fontFamily="Arial" fontWeight="bold" fontSize="9" fill="white">P</text>
      <text x="9" y="14" fontFamily="Arial" fontWeight="bold" fontSize="9" fill="#009cde">P</text>
    </svg>
  );
}

function SumUpLogo() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20">
      <rect width="20" height="20" rx="5" fill="#3063E9" />
      <text x="4" y="14" fontFamily="Arial" fontWeight="bold" fontSize="11" fill="white">Σ</text>
    </svg>
  );
}

function VisaBadge() {
  return (
    <div style={{ background: "#1a1f71", borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 900, color: "white", fontStyle: "italic", letterSpacing: "0.05em" }}>VISA</div>
  );
}

function McBadge() {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#252525", borderRadius: 4, padding: "2px 4px", gap: -4 }}>
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#eb001b" }} />
      <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f79e1b", marginLeft: -5 }} />
    </div>
  );
}

export function CompactDark() {
  return (
    <div style={{ background: "#060510", minHeight: "100vh", fontFamily: "'Inter', sans-serif", overflowY: "auto" }}>
      {/* Compact top balance strip */}
      <div style={{ background: "linear-gradient(180deg, rgba(168,85,247,0.14) 0%, transparent 100%)", borderBottom: "1px solid rgba(168,85,247,0.12)", padding: "20px 18px 16px" }}>
        <div style={{ fontSize: 10, color: "#7a6d9a", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
          <Shield size={10} color="#a855f7" /> Mon portefeuille
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-0.03em", color: "#f0eaff", fontFamily: "monospace", lineHeight: 1 }}>
            6.00<span style={{ fontSize: 16, color: "#a855f7", marginLeft: 3 }}>€</span>
          </div>
          <div style={{ display: "flex", gap: 10, paddingBottom: 2 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#5a4d7a" }}>Points</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#06b6d4", display: "flex", alignItems: "center", gap: 3 }}><Coins size={10} />181</div>
            </div>
            <div style={{ width: 1, background: "rgba(168,85,247,0.15)", alignSelf: "stretch" }} />
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#5a4d7a" }}>Rechargé</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#a855f7", display: "flex", alignItems: "center", gap: 3 }}><TrendingUp size={10} />5.00€</div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment methods — compact list */}
      <div style={{ padding: "14px 18px 0" }}>
        <div style={{ fontSize: 10, color: "#5a4d7a", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, marginBottom: 10 }}>Recharger via</div>

        {/* LTC */}
        <div style={{ background: "rgba(52,93,157,0.1)", border: "1px solid rgba(52,93,157,0.25)", borderRadius: 14, padding: "12px 14px", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <LitecoinLogo />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2d9f3" }}>Litecoin (LTC)</div>
              <div style={{ fontSize: 10, color: "#5a4d7a" }}>Crypto sans frais</div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 100, padding: "2px 8px" }}>+5% bonus</div>
          </div>
          <button style={{ width: "100%", padding: "11px 0", borderRadius: 10, background: "linear-gradient(90deg, #a855f7, #06b6d4)", border: "none", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            Générer lien LTC
          </button>
        </div>

        {/* PayPal — maintenance */}
        <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: "12px 14px", marginBottom: 8, opacity: 0.55 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PaypalLogo />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7a6d9a" }}>PayPal</div>
              <div style={{ fontSize: 10, color: "#5a4d7a" }}>Temporairement indisponible</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)", borderRadius: 100, padding: "2px 7px" }}>maintenance</div>
          </div>
        </div>

        {/* SumUp */}
        <div style={{ background: "rgba(48,99,233,0.08)", border: "1px solid rgba(48,99,233,0.22)", borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <SumUpLogo />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e2d9f3" }}>Carte bancaire (SumUp)</div>
              <div style={{ fontSize: 10, color: "#5a4d7a" }}>Paiement sécurisé</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}><VisaBadge /><McBadge /></div>
          </div>

          {/* Amount selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 8 }}>
            {amounts.map((a, i) => (
              <button key={a} style={{ padding: "9px 0", borderRadius: 9, background: i === 1 ? "#a855f7" : "rgba(255,255,255,0.04)", border: i === 1 ? "1px solid #a855f7" : "1px solid rgba(255,255,255,0.08)", color: i === 1 ? "#fff" : "#7a6d9a", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                {a}€
              </button>
            ))}
            <button style={{ padding: "9px 0", borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#7a6d9a", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              Autre
            </button>
          </div>
          <button style={{ width: "100%", padding: "11px 0", borderRadius: 10, background: "#3063E9", border: "none", fontSize: 13, fontWeight: 700, color: "#fff", cursor: "pointer" }}>
            Continuer — 10.00€
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div style={{ padding: "16px 18px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: "#5a4d7a", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>Historique</div>
          <div style={{ fontSize: 11, color: "#a855f7", display: "flex", alignItems: "center", gap: 2, cursor: "pointer" }}>Voir tout <ChevronRight size={11} /></div>
        </div>
        {transactions.map((t, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < transactions.length - 1 ? "1px solid rgba(168,85,247,0.07)" : "none" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: t.type === "in" ? "rgba(34,197,94,0.1)" : "rgba(168,85,247,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {t.type === "in" ? <ArrowDownLeft size={13} color="#22c55e" /> : <ArrowUpRight size={13} color="#a855f7" />}
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
  );
}
