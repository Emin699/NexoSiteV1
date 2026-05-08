export function LitecoinLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="18" fill="#BFBBBB" />
      <circle cx="18" cy="18" r="16" fill="#A6A9AA" />
      <circle cx="18" cy="18" r="14" fill="#BFBBBB" />
      <text x="8" y="25" fontFamily="Georgia, serif" fontWeight="bold" fontSize="20" fill="#4D4D4D">Ł</text>
    </svg>
  );
}

export function PaypalLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" fill="none">
      <rect width="50" height="50" rx="10" fill="#f5f5f5" />
      {/* Dark blue P */}
      <path d="M14 10h10c5.5 0 9 3 9 8 0 6-4.5 10-11 10H18l-1.5 8H10L14 10z" fill="#003087" />
      {/* Light blue P (offset) */}
      <path d="M18 14h8c5.5 0 8.5 2.5 8.5 7.5 0 5.5-4 9-10 9h-3.5l-1.5 7H13.5L17 14h1z" fill="#009cde" />
      {/* Third P highlight */}
      <path d="M21 18h6c4 0 6 2 6 5.5C33 28 30 31 25.5 31H23l-1 5.5H17L20.5 18H21z" fill="#012169" />
    </svg>
  );
}

export function SumUpLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <rect width="36" height="36" rx="8" fill="#1E2E4A" />
      {/* SumUp logo - stylized S curve */}
      <rect x="8" y="10" width="20" height="4" rx="2" fill="#00D4AA" />
      <rect x="8" y="16" width="20" height="4" rx="2" fill="#ffffff" opacity="0.85" />
      <rect x="8" y="22" width="20" height="4" rx="2" fill="#00D4AA" />
    </svg>
  );
}

export function CardLogo({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.65} viewBox="0 0 54 35" fill="none">
      <rect width="54" height="35" rx="5" fill="#1a1a2e" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      <rect y="8" width="54" height="8" fill="rgba(255,255,255,0.08)" />
      <rect x="4" y="22" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.15)" />
      {/* Chip */}
      <rect x="4" y="4" width="10" height="7" rx="1.5" fill="#D4AF37" opacity="0.9" />
    </svg>
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
