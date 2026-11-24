export function ClinicIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 180" className={className} role="img" aria-label="Clinic building">
      <ellipse cx="160" cy="160" rx="150" ry="14" fill="#DCEBF7" />
      <rect x="88" y="52" width="144" height="104" rx="10" fill="#fff" stroke="#B9D6EE" strokeWidth="3" />
      <rect x="88" y="52" width="144" height="26" rx="10" fill="#3A86C8" />
      <rect x="88" y="68" width="144" height="10" fill="#3A86C8" />
      <circle cx="160" cy="32" r="22" fill="#fff" stroke="#3A86C8" strokeWidth="4" />
      <path d="M160 21v22M149 32h22" stroke="#2EC4B6" strokeWidth="6" strokeLinecap="round" />
      {[104, 188].map((x) => <g key={x}><rect x={x} y="92" width="28" height="22" rx="4" fill="#EFF6FC" stroke="#B9D6EE" strokeWidth="2" /><path d={`M${x + 14} 92v22M${x} 103h28`} stroke="#B9D6EE" strokeWidth="2" /></g>)}
      <rect x="141" y="112" width="38" height="44" rx="6" fill="#1E5D94" />
      <circle cx="171" cy="136" r="2.5" fill="#fff" />
      <g><circle cx="48" cy="120" r="22" fill="#2EC4B6" opacity=".85" /><rect x="45" y="136" width="6" height="22" fill="#1E5D94" /></g>
      <g><circle cx="276" cy="124" r="18" fill="#3A86C8" opacity=".8" /><rect x="273" y="138" width="6" height="20" fill="#1E5D94" /></g>
    </svg>
  );
}
