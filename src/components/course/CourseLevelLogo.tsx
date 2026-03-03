import { useEffect, useState } from "react";

interface CourseLevelLogoProps {
  level: string;
  progress: number;
  completed?: boolean;
}

const CourseLevelLogo = ({ level, progress, completed = false }: CourseLevelLogoProps) => {
  const [celebrate, setCelebrate] = useState(false);

  useEffect(() => {
    if (completed) {
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2000);
      return () => clearTimeout(t);
    }
  }, [completed]);

  const chars = level.split("");
  const perChar = 100 / chars.length;

  const getCharFill = (index: number) => {
    const start = index * perChar;
    const end = start + perChar;
    if (progress >= end) return 1;
    if (progress <= start) return 0;
    return (progress - start) / perChar;
  };

  return (
    <div className={`relative inline-flex items-center gap-0.5 select-none ${celebrate ? "animate-klar-celebrate" : ""}`}>
      {chars.map((char, i) => {
        const fill = getCharFill(i);
        const isFull = fill >= 1;
        return (
          <span key={i} className="relative font-display font-bold text-5xl tracking-tight" style={{ lineHeight: 1 }}>
            <span
              className="relative z-10 transition-all duration-700"
              style={{
                WebkitTextStroke: isFull ? "0px" : "1.5px hsl(var(--muted-foreground) / 0.4)",
                color: "transparent",
              }}
            >
              {char}
            </span>
            <span
              className="absolute inset-0 z-20 overflow-hidden transition-all duration-700"
              style={{ clipPath: `inset(${(1 - fill) * 100}% 0 0 0)` }}
            >
              <span
                className="font-display font-bold text-5xl tracking-tight"
                style={{
                  backgroundImage: "linear-gradient(135deg, hsl(var(--yellow-glow)), hsl(var(--yellow-soft)))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1,
                  filter: isFull ? "drop-shadow(0 0 12px hsl(var(--yellow-glow) / 0.5))" : "none",
                  transition: "filter 0.7s ease",
                }}
              >
                {char}
              </span>
            </span>
          </span>
        );
      })}
      {celebrate && (
        <div
          className="absolute inset-0 -inset-x-4 -inset-y-2 rounded-2xl animate-pulse pointer-events-none"
          style={{ background: "radial-gradient(ellipse, hsl(var(--yellow-glow) / 0.25) 0%, transparent 70%)" }}
        />
      )}
    </div>
  );
};

export default CourseLevelLogo;
