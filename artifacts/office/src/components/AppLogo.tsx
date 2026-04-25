export function AppLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-label="plumb level and Squared logo"
    >
      <rect x="3" y="3" width="7" height="42" rx="1.5" fill="#1e293b" />
      <rect x="3" y="38" width="36" height="7" rx="1.5" fill="#1e293b" />

      <rect x="11" y="4" width="34" height="10" rx="5" fill="#334155" />
      <line x1="24" y1="5" x2="24" y2="13" stroke="#475569" strokeWidth="1.2" />
      <line x1="35" y1="5" x2="35" y2="13" stroke="#475569" strokeWidth="1.2" />
      <circle cx="29.5" cy="9" r="3.5" fill="#f97316" />

      <line x1="22" y1="14" x2="22" y2="17" stroke="#94a3b8" strokeWidth="1.2" />
      <polygon points="22,17 27,26 22,37 17,26" fill="#f97316" />
      <circle cx="22" cy="14" r="1.5" fill="#64748b" />
    </svg>
  );
}
