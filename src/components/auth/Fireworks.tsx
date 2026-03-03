import { useEffect, useState, useMemo } from "react";

interface Confetti {
  id: number;
  x: number;
  delay: number;
  duration: number;
  size: number;
  color: string;
  rotation: number;
  drift: number;
  shape: "rect" | "circle" | "strip";
}

interface Sparkle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
  delay: number;
}

const COLORS = [
  "hsl(45, 92%, 52%)",
  "hsl(45, 80%, 65%)",
  "hsl(30, 90%, 55%)",
  "hsl(60, 85%, 60%)",
  "hsl(15, 85%, 55%)",
  "hsl(50, 95%, 70%)",
  "hsl(0, 85%, 60%)",
  "hsl(200, 80%, 60%)",
  "hsl(280, 70%, 65%)",
  "hsl(140, 70%, 55%)",
];

const triggerHaptic = () => {
  // Telegram WebApp haptic
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred("heavy");
      setTimeout(() => tg.HapticFeedback.impactOccurred("medium"), 200);
      setTimeout(() => tg.HapticFeedback.impactOccurred("light"), 400);
    }
  } catch {}
  // Standard Vibration API
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 80, 50, 60]);
  }
};

const Fireworks = ({ onComplete }: { onComplete: () => void }) => {
  // Confetti pieces shooting upward from bottom
  const confetti = useMemo<Confetti[]>(() => {
    const arr: Confetti[] = [];
    for (let i = 0; i < 80; i++) {
      arr.push({
        id: i,
        x: 10 + Math.random() * 80,
        delay: Math.random() * 600,
        duration: 1800 + Math.random() * 1200,
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        drift: (Math.random() - 0.5) * 120,
        shape: (["rect", "circle", "strip"] as const)[Math.floor(Math.random() * 3)],
      });
    }
    return arr;
  }, []);

  // Burst sparkles from center
  const sparkles = useMemo<Sparkle[]>(() => {
    const arr: Sparkle[] = [];
    const origins = [
      { x: 50, y: 45 },
      { x: 30, y: 40 },
      { x: 70, y: 40 },
    ];
    origins.forEach((origin, oi) => {
      for (let i = 0; i < 16; i++) {
        arr.push({
          id: oi * 100 + i,
          x: origin.x,
          y: origin.y,
          angle: (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.4,
          speed: 40 + Math.random() * 80,
          size: 3 + Math.random() * 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: oi * 150 + Math.random() * 100,
        });
      }
    });
    return arr;
  }, []);

  useEffect(() => {
    triggerHaptic();
    const t = setTimeout(onComplete, 3000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Flash */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, hsl(45 92% 52% / 0.35), transparent 60%)",
          animation: "fw-flash 0.8s ease-out forwards",
        }}
      />

      {/* Burst sparkles */}
      {sparkles.map((s) => (
        <div
          key={`s-${s.id}`}
          className="absolute rounded-full"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            backgroundColor: s.color,
            boxShadow: `0 0 ${s.size * 3}px ${s.color}`,
            animation: `fw-particle 1.2s ease-out ${s.delay}ms forwards`,
            "--fw-tx": `${Math.cos(s.angle) * s.speed}px`,
            "--fw-ty": `${Math.sin(s.angle) * s.speed}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* Confetti shooting up */}
      {confetti.map((c) => (
        <div
          key={`c-${c.id}`}
          className="absolute"
          style={{
            left: `${c.x}%`,
            bottom: "-20px",
            animation: `fw-confetti-up ${c.duration}ms cubic-bezier(0.2, 0.8, 0.3, 1) ${c.delay}ms forwards`,
            "--fw-drift": `${c.drift}px`,
            "--fw-rot": `${c.rotation + 720}deg`,
          } as React.CSSProperties}
        >
          {c.shape === "rect" ? (
            <div style={{ width: c.size, height: c.size * 0.6, backgroundColor: c.color, borderRadius: 1 }} />
          ) : c.shape === "strip" ? (
            <div style={{ width: c.size * 0.3, height: c.size * 1.5, backgroundColor: c.color, borderRadius: c.size }} />
          ) : (
            <div style={{ width: c.size, height: c.size, backgroundColor: c.color, borderRadius: "50%" }} />
          )}
        </div>
      ))}
    </div>
  );
};

export default Fireworks;
