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
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred("heavy");
      setTimeout(() => tg.HapticFeedback.impactOccurred("medium"), 200);
      setTimeout(() => tg.HapticFeedback.impactOccurred("light"), 400);
    }
  } catch {}
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 80, 50, 60]);
  }
};

interface FireworksProps {
  onComplete: () => void;
  /** Ref to the element the fireworks should originate from */
  originRef?: React.RefObject<HTMLElement>;
}

const Fireworks = ({ onComplete, originRef }: FireworksProps) => {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (originRef?.current) {
      const rect = originRef.current.getBoundingClientRect();
      setOrigin({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
  }, [originRef]);

  // Confetti pieces shooting upward from the KLAR logo position
  const confetti = useMemo<Confetti[]>(() => {
    const arr: Confetti[] = [];
    for (let i = 0; i < 80; i++) {
      arr.push({
        id: i,
        x: -40 + Math.random() * 80, // spread around origin
        delay: Math.random() * 600,
        duration: 1800 + Math.random() * 1200,
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() * 360,
        drift: (Math.random() - 0.5) * 200,
        shape: (["rect", "circle", "strip"] as const)[Math.floor(Math.random() * 3)],
      });
    }
    return arr;
  }, []);

  // Burst sparkles radiating out from origin
  const sparkles = useMemo<Sparkle[]>(() => {
    const arr: Sparkle[] = [];
    for (let wave = 0; wave < 3; wave++) {
      for (let i = 0; i < 18; i++) {
        arr.push({
          id: wave * 100 + i,
          angle: (Math.PI * 2 * i) / 18 + (Math.random() - 0.5) * 0.3,
          speed: 50 + Math.random() * 100 + wave * 20,
          size: 3 + Math.random() * 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: wave * 180 + Math.random() * 100,
        });
      }
    }
    return arr;
  }, []);

  useEffect(() => {
    triggerHaptic();
    const t = setTimeout(onComplete, 3000);
    return () => clearTimeout(t);
  }, [onComplete]);

  // Fallback to center of screen
  const ox = origin?.x ?? window.innerWidth / 2;
  const oy = origin?.y ?? window.innerHeight * 0.35;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Flash centered on origin */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${ox}px ${oy}px, hsl(45 92% 52% / 0.4), transparent 50%)`,
          animation: "fw-flash 0.8s ease-out forwards",
        }}
      />

      {/* Burst sparkles from KLAR */}
      {sparkles.map((s) => (
        <div
          key={`s-${s.id}`}
          className="absolute rounded-full"
          style={{
            left: ox,
            top: oy,
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

      {/* Confetti shooting up from KLAR */}
      {confetti.map((c) => (
        <div
          key={`c-${c.id}`}
          className="absolute"
          style={{
            left: ox + c.x,
            top: oy,
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
