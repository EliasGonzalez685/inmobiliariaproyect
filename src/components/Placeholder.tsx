const PALETAS: [string, string][] = [
  ['#38bdf8', '#818cf8'], ['#34d399', '#22d3ee'], ['#fbbf24', '#fb7185'],
  ['#fb923c', '#f43f5e'], ['#a78bfa', '#f472b6'], ['#22d3ee', '#6366f1'],
];

function paleta(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETAS[h % PALETAS.length];
}

// Ilustración que se muestra cuando la propiedad todavía no tiene fotos.
export default function Placeholder({ seed }: { seed: string }) {
  const [a, b] = paleta(seed);
  const id = `g${seed.replace(/[^a-z0-9]/gi, '').slice(0, 8)}`;
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#${id})`} />
      <circle cx="330" cy="60" r="34" fill="#fff" opacity=".35" /><circle cx="330" cy="60" r="20" fill="#fff" opacity=".55" />
      <path d="M0 190 Q100 165 200 185 T400 178 V240 H0Z" fill="#000" opacity=".12" />
      <polygon points="200,58 292,128 108,128" fill="#fff" opacity=".95" />
      <rect x="122" y="128" width="156" height="72" fill="#fff" opacity=".95" />
      <rect x="186" y="150" width="28" height="50" rx="3" fill={a} />
      <rect x="138" y="146" width="30" height="26" rx="3" fill={b} opacity=".55" />
      <rect x="232" y="146" width="30" height="26" rx="3" fill={b} opacity=".55" />
      <rect x="0" y="198" width="400" height="42" fill="#000" opacity=".16" />
    </svg>
  );
}
