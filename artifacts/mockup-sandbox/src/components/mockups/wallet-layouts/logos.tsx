export function LitecoinLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/__mockup/logos/litecoin.png"
      width={size}
      height={size}
      style={{ borderRadius: "50%", objectFit: "cover" }}
      alt="Litecoin"
    />
  );
}

export function PaypalLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/__mockup/logos/paypal.png"
      width={size}
      height={size}
      style={{ objectFit: "contain" }}
      alt="PayPal"
    />
  );
}

export function SumUpLogo({ size = 36 }: { size?: number }) {
  return (
    <img
      src="/__mockup/logos/sumup.png"
      width={size}
      height={size}
      style={{ borderRadius: 8, objectFit: "cover" }}
      alt="SumUp"
    />
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
