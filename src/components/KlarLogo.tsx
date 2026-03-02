import { useEffect, useState } from "react";

interface KlarLogoProps {
  /** 0–100 */
  progress: number;
  /** Level fully completed — triggers celebration */
  completed?: boolean;
}

/**
 * SVG KLAR logo with letters that fill from bottom-to-top
 * based on learning progress. Each letter lights up at 25% intervals,
 * with smooth gradient transitions.
 */
const KlarLogo = ({ progress, completed = false }: KlarLogoProps) => {
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (completed) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2000);
      return () => clearTimeout(t);
    }
  }, [completed]);

  // Each letter fills at: K=0-25, L=25-50, A=50-75, R=75-100
  const getLetterFill = (index: number) => {
    const start = index * 25;
    const end = start + 25;
    if (progress >= end) return 1;
    if (progress <= start) return 0;
    return (progress - start) / 25;
  };

  const letters = ["K", "L", "A", "R"];

  return (
    <div
      className={`relative inline-flex items-center gap-0.5 select-none ${
        celebrate ? "animate-klar-celebrate" : ""
      }`}
    >
      {letters.map((letter, i) => {
        const fill = getLetterFill(i);
        const isFull = fill >= 1;

        return (
          <span
            key={letter}
            className="relative font-display font-bold text-5xl tracking-tight"
            style={{ lineHeight: 1 }}
          >
            {/* Outline layer — always visible */}
            <span
              className="relative z-10 transition-all duration-700"
              style={{
                WebkitTextStroke: isFull ? "0px" : "1.5px hsl(var(--muted-foreground) / 0.4)",
                color: "transparent",
              }}
            >
              {letter}
            </span>

            {/* Fill layer — clips from bottom to top */}
            <span
              className="absolute inset-0 z-20 overflow-hidden transition-all duration-700"
              style={{
                clipPath: `inset(${(1 - fill) * 100}% 0 0 0)`,
              }}
            >
              <span
                className="font-display font-bold text-5xl tracking-tight"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, hsl(var(--yellow-glow)), hsl(var(--yellow-soft)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1,
                  filter: isFull ? "drop-shadow(0 0 12px hsl(var(--yellow-glow) / 0.5))" : "none",
                  transition: "filter 0.7s ease",
                }}
              >
                {letter}
              </span>
            </span>
          </span>
        );
      })}

      {/* Glow halo behind when celebrating */}
      {celebrate && (
        <div
          className="absolute inset-0 -inset-x-4 -inset-y-2 rounded-2xl animate-pulse pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, hsl(var(--yellow-glow) / 0.25) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
};

export default KlarLogo;
