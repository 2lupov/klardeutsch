import { useEffect, useRef, useState } from "react";

const LETTERS = [
  { t: "der", x: 62, y: 210 },
  { t: "die", x: 118, y: 188 },
  { t: "das", x: 92, y: 246 },
  { t: "ä", x: 150, y: 232 },
  { t: "sein", x: 60, y: 272 },
  { t: "ö", x: 140, y: 276 },
  { t: "und", x: 100, y: 300 },
  { t: "ü", x: 58, y: 316 },
  { t: "B1", x: 140, y: 320 },
];

/** SVG "Wortschatz" jar — the lid lifts as the block scrolls into view. */
const WortschatzJar = () => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries[0]?.isIntersecting && setOpen(true),
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className="mx-auto w-full max-w-[300px] select-none">
      <svg viewBox="0 0 220 400" className="w-full h-auto" role="img" aria-label="Банка Wortschatz зі словами">
        <defs>
          <linearGradient id="klar-glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary) / 0.18)" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.04)" />
          </linearGradient>
        </defs>

        {/* lid */}
        <g
          className="transition-transform duration-[1200ms] ease-out"
          style={{ transform: open ? "translateY(-26px) rotate(-7deg)" : "none", transformOrigin: "110px 120px" }}
        >
          <rect x="52" y="104" width="116" height="26" rx="9" fill="hsl(var(--accent) / 0.9)" />
          <rect x="66" y="94" width="88" height="14" rx="7" fill="hsl(var(--accent) / 0.6)" />
        </g>

        {/* jar body */}
        <path
          d="M62 138 h96 a16 16 0 0 1 16 16 v182 a24 24 0 0 1 -24 24 h-80 a24 24 0 0 1 -24 -24 v-182 a16 16 0 0 1 16 -16 z"
          fill="url(#klar-glass)"
          stroke="hsl(var(--primary) / 0.45)"
          strokeWidth="1.5"
        />
        <rect x="46" y="134" width="128" height="10" rx="5" fill="hsl(var(--primary) / 0.35)" />

        {/* words inside */}
        <g fontFamily="Sora, system-ui, sans-serif" fontSize="22" fill="hsl(var(--foreground) / 0.75)">
          {LETTERS.map((l, i) => (
            <text
              key={l.t + i}
              x={l.x}
              y={l.y}
              textAnchor="middle"
              className="transition-all duration-700"
              style={{
                opacity: open ? 1 : 0,
                transform: open ? "none" : "translateY(14px)",
                transitionDelay: `${300 + i * 90}ms`,
              }}
            >
              {l.t}
            </text>
          ))}
        </g>

        {/* label */}
        <rect x="58" y="330" width="104" height="34" rx="8" fill="hsl(var(--foreground) / 0.92)" />
        <text
          x="110"
          y="353"
          textAnchor="middle"
          fontFamily="Sora, system-ui, sans-serif"
          fontSize="19"
          letterSpacing="1"
          fill="hsl(var(--background))"
        >
          Wortschatz
        </text>
      </svg>
    </div>
  );
};

export default WortschatzJar;
