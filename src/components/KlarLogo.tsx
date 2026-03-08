import { useEffect, useState } from "react";

interface KlarLogoProps {
  /** 0–100 */
  progress: number;
  /** Level fully completed — triggers celebration */
  completed?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
}

/**
 * SVG KLAR logo with letters that fill from bottom-to-top
 * based on learning progress. Each letter lights up at 25% intervals.
 * Uses SVG masking to fill the letter shapes themselves (not rectangles).
 */
const KlarLogo = ({ progress, completed = false, size = "lg" }: KlarLogoProps) => {
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

  const sizeClasses = {
    sm: "h-6",
    md: "h-10",
    lg: "h-14",
  };

  const letters = [
    { char: "K", width: 44 },
    { char: "L", width: 36 },
    { char: "A", width: 46 },
    { char: "R", width: 44 },
  ];

  const totalWidth = letters.reduce((sum, l) => sum + l.width, 0) - 16; // tighter spacing
  const height = 64;

  return (
    <div
      className={`relative inline-flex items-center select-none ${sizeClasses[size]} ${
        celebrate ? "animate-klar-celebrate" : ""
      }`}
    >
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="h-full w-auto"
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Golden gradient for filled letters */}
          <linearGradient id="klar-gold" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="hsl(45, 92%, 52%)" />
            <stop offset="100%" stopColor="hsl(45, 80%, 65%)" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="klar-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {letters.map((letter, i) => {
          const fill = getLetterFill(i);
          const spacing = -2; // negative for tighter
          const isFull = fill >= 1;
          const x = letters.slice(0, i).reduce((sum, l) => sum + l.width + spacing, 0);
          const maskId = `mask-${letter.char}-${i}`;
          const fillY = height * (1 - fill);

          return (
            <g key={letter.char} transform={`translate(${x}, 0)`}>
              {/* Mask definition - the letter shape itself */}
              <defs>
                <mask id={maskId}>
                  <text
                    x="0"
                    y={height * 0.82}
                    fontFamily="'Space Grotesk', sans-serif"
                    fontWeight="700"
                    fontSize="56"
                    fill="white"
                    letterSpacing="-0.02em"
                  >
                    {letter.char}
                  </text>
                </mask>
                
                {/* Clip for progressive fill - letter-shaped */}
                <clipPath id={`clip-fill-${i}`}>
                  <text
                    x="0"
                    y={height * 0.82}
                    fontFamily="'Space Grotesk', sans-serif"
                    fontWeight="700"
                    fontSize="56"
                    letterSpacing="-0.02em"
                  >
                    {letter.char}
                  </text>
                </clipPath>
              </defs>

              {/* Outline layer - always visible */}
              <text
                x="0"
                y={height * 0.82}
                fontFamily="'Space Grotesk', sans-serif"
                fontWeight="700"
                fontSize="56"
                fill="none"
                stroke="hsl(215, 15%, 35%)"
                strokeWidth={isFull ? 0 : 1.5}
                opacity={isFull ? 0 : 0.5}
                letterSpacing="-0.02em"
                style={{ transition: "all 0.5s ease" }}
              >
                {letter.char}
              </text>

              {/* Fill layer - clipped to letter shape, fills from bottom */}
              <g clipPath={`url(#clip-fill-${i})`}>
                <rect
                  x="-5"
                  y={fillY}
                  width={letter.width + 10}
                  height={height}
                  fill="url(#klar-gold)"
                  filter={isFull ? "url(#klar-glow)" : undefined}
                  style={{ transition: "y 0.7s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
              </g>

              {/* Extra glow layer when full */}
              {isFull && (
                <text
                  x="0"
                  y={height * 0.82}
                  fontFamily="'Space Grotesk', sans-serif"
                  fontWeight="700"
                  fontSize="56"
                  fill="url(#klar-gold)"
                  filter="url(#klar-glow)"
                  opacity={0.6}
                  letterSpacing="-0.02em"
                  className="animate-pulse"
                >
                  {letter.char}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Glow halo behind when celebrating */}
      {celebrate && (
        <div
          className="absolute inset-0 -inset-x-4 -inset-y-2 rounded-2xl animate-pulse pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse, hsl(45, 92%, 52%, 0.3) 0%, transparent 70%)",
          }}
        />
      )}
    </div>
  );
};

export default KlarLogo;