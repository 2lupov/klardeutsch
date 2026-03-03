import { useMemo } from "react";

interface AuthKlarLogoProps {
  /** 0–1 fill progress */
  progress: number;
}

const AuthKlarLogo = ({ progress }: AuthKlarLogoProps) => {
  const letters = ["K", "L", "A", "R"];

  return (
    <h1 className="text-4xl font-display font-bold tracking-tight flex items-center justify-center gap-[2px] select-none">
      {letters.map((letter, i) => {
        const letterStart = i * 0.25;
        const letterEnd = letterStart + 0.25;
        const fill = progress >= letterEnd ? 1 : progress <= letterStart ? 0 : (progress - letterStart) / 0.25;
        const isFull = fill >= 1;

        return (
          <span key={letter} className="relative" style={{ lineHeight: 1 }}>
            {/* Ghost / outline */}
            <span
              className="relative z-10 transition-all duration-500"
              style={{
                WebkitTextStroke: isFull ? "0px" : "1.5px hsl(var(--muted-foreground) / 0.35)",
                color: "transparent",
              }}
            >
              {letter}
            </span>

            {/* Fill from bottom */}
            <span
              className="absolute inset-0 z-20 overflow-hidden transition-all duration-500"
              style={{ clipPath: `inset(${(1 - fill) * 100}% 0 0 0)` }}
            >
              <span
                className="font-display font-bold text-4xl tracking-tight"
                style={{
                  backgroundImage: "linear-gradient(135deg, hsl(var(--yellow-glow)), hsl(var(--yellow-soft)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1,
                  filter: isFull ? "drop-shadow(0 0 10px hsl(var(--yellow-glow) / 0.5))" : "none",
                  transition: "filter 0.5s ease",
                }}
              >
                {letter}
              </span>
            </span>
          </span>
        );
      })}
    </h1>
  );
};

export default AuthKlarLogo;
