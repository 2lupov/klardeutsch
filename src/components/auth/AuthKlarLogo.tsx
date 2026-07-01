import pandaReading from "@/assets/panda-reading.png";


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
            {/* Panda sitting on the bottom horizontal bar of the L */}
            {letter === "L" && (
              <img
                src={pandaReading}
                alt=""
                aria-hidden="true"
                className="absolute pointer-events-none select-none z-30 drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)]"
                style={{ bottom: "0.05rem", left: "0.15rem", width: "1.9rem", height: "1.9rem", objectFit: "contain" }}
              />
            )}
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
