export function LitecoinLogo({ size = 44 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: "#ffffff",
      overflow: "hidden", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: size * 0.06,
      boxShadow: "0 2px 8px rgba(52,93,157,0.35)",
    }}>
      <img
        src="/__mockup/logos/litecoin.png"
        width={size * 0.88}
        height={size * 0.88}
        style={{ objectFit: "contain", display: "block", borderRadius: "50%" }}
        alt="Litecoin"
      />
    </div>
  );
}

export function PaypalLogo({ size = 44 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: "#ffffff",
      overflow: "hidden", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: size * 0.1,
      boxShadow: "0 2px 8px rgba(0,48,135,0.3)",
    }}>
      <img
        src="/__mockup/logos/paypal.png"
        width={size * 0.8}
        height={size * 0.8}
        style={{ objectFit: "contain", display: "block" }}
        alt="PayPal"
      />
    </div>
  );
}

export function SumUpLogo({ size = 44 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: "#000000",
      overflow: "hidden", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
    }}>
      <img
        src="/__mockup/logos/sumup.png"
        width={size * 0.72}
        height={size * 0.72}
        style={{ objectFit: "contain", display: "block" }}
        alt="SumUp"
      />
    </div>
  );
}

export function VisaBadge() {
  return (
    <svg width="34" height="20" viewBox="0 0 34 20" fill="none">
      <rect width="34" height="20" rx="3" fill="#1a1f71" />
      <text x="4" y="14" fontFamily="Arial" fontWeight="900" fontSize="11" fill="white" fontStyle="italic" letterSpacing="0.5">VISA</text>
    </svg>
  );
}

export function MastercardBadge() {
  return (
    <svg width="28" height="20" viewBox="0 0 28 20" fill="none">
      <rect width="28" height="20" rx="3" fill="#252525" />
      <circle cx="10" cy="10" r="7" fill="#eb001b" />
      <circle cx="18" cy="10" r="7" fill="#f79e1b" />
      <path d="M14 4.5a7 7 0 0 1 0 11 7 7 0 0 1 0-11z" fill="#ff5f00" />
    </svg>
  );
}
