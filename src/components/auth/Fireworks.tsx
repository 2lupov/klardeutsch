import { useEffect, useState, useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  type: "confetti" | "spark" | "letter-shard";
  rotation: number;
  drift: number;
  angle: number;
  speed: number;
  letter?: string;
}

const YELLOW_PALETTE = [
  "hsl(45, 92%, 52%)",
  "hsl(45, 80%, 65%)",
  "hsl(50, 90%, 58%)",
  "hsl(40, 85%, 50%)",
  "hsl(55, 95%, 60%)",
  "hsl(38, 90%, 55%)",
  "hsl(48, 88%, 70%)",
  "hsl(42, 95%, 45%)",
];

const randColor = () => YELLOW_PALETTE[Math.floor(Math.random() * YELLOW_PALETTE.length)];

const triggerHaptic = () => {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred("heavy");
      setTimeout(() => tg.HapticFeedback.impactOccurred("medium"), 200);
    }
  } catch {}
  if (navigator.vibrate) navigator.vibrate([100, 50, 80, 50, 60]);
};

interface FireworksProps {
  onComplete: () => void;
  originRef?: React.RefObject<HTMLElement>;
}

const Fireworks = ({ onComplete, originRef }: FireworksProps) => {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (originRef?.current) {
      const rect = originRef.current.getBoundingClientRect();
      setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
  }, [originRef]);

  useEffect(() => {
    triggerHaptic();
    const t = setTimeout(onComplete, 600);
    return () => clearTimeout(t);
  }, [onComplete]);

  const ox = origin?.x ?? window.innerWidth / 2;
  const oy = origin?.y ?? window.innerHeight * 0.3;

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    let id = 0;

    // Letter shards — fly outward immediately from logo position
    const letters = ["K", "L", "A", "R"];
    letters.forEach((letter, i) => {
      // Spread letters in different directions
      const baseAngle = -Math.PI + ((i + 0.5) / letters.length) * Math.PI * 2;
      arr.push({
        id: id++, x: 0, y: 0,
        size: 40, color: "hsl(45, 92%, 52%)",
        delay: 0, duration: 800,
        type: "letter-shard",
        rotation: (Math.random() > 0.5 ? 1 : -1) * (300 + Math.random() * 400),
        drift: 0,
        angle: baseAngle + (Math.random() - 0.5) * 0.4,
        speed: 180 + Math.random() * 100,
        letter,
      });
    });

    // Central burst sparks
    for (let i = 0; i < 50; i++) {
      const angle = (Math.PI * 2 * i) / 50 + (Math.random() - 0.5) * 0.3;
      arr.push({
        id: id++, x: 0, y: 0,
        size: 3 + Math.random() * 5,
        color: randColor(),
        delay: Math.random() * 80,
        duration: 500 + Math.random() * 300,
        type: "spark",
        rotation: 0, drift: 0,
        angle, speed: 60 + Math.random() * 140,
      });
    }

    // Yellow confetti shooting outward and falling
    for (let i = 0; i < 120; i++) {
      arr.push({
        id: id++,
        x: (Math.random() - 0.5) * 60,
        y: 0,
        size: 6 + Math.random() * 10,
        color: randColor(),
        delay: 50 + Math.random() * 300,
        duration: 1200 + Math.random() * 600,
        type: "confetti",
        rotation: Math.random() * 360,
        drift: (Math.random() - 0.5) * 350,
        angle: 0, speed: 0,
      });
    }

    return arr;
  }, []);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Flash from origin */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${ox}px ${oy}px, hsl(45 92% 52% / 0.7), transparent 50%)`,
          animation: "fw-flash 0.6s ease-out forwards",
        }}
      />

      {/* Shockwave ring */}
      <div
        className="absolute rounded-full"
        style={{
          left: ox, top: oy,
          width: 0, height: 0,
          border: "2px solid hsl(45 92% 52% / 0.6)",
          boxShadow: "0 0 30px hsl(45 92% 52% / 0.4)",
          transform: "translate(-50%, -50%)",
          animation: "klar-shockwave 0.8s ease-out forwards",
        }}
      />

      {particles.map((p) => {
        if (p.type === "letter-shard") {
          return (
            <div
              key={p.id}
              className="absolute font-display font-bold select-none"
              style={{
                left: ox, top: oy,
                fontSize: p.size,
                backgroundImage: "linear-gradient(135deg, hsl(45 92% 52%), hsl(50 90% 65%))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                filter: "drop-shadow(0 0 12px hsl(45 92% 52% / 0.5))",
                transform: "translate(-50%, -50%)",
                animation: `klar-letter-fly ${p.duration}ms ease-out ${p.delay}ms forwards`,
                "--klar-tx": `${Math.cos(p.angle) * p.speed}px`,
                "--klar-ty": `${Math.sin(p.angle) * p.speed}px`,
                "--klar-rot": `${p.rotation}deg`,
              } as React.CSSProperties}
            >
              {p.letter}
            </div>
          );
        }

        if (p.type === "spark") {
          return (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: ox, top: oy,
                width: p.size, height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                animation: `fw-particle ${p.duration}ms ease-out ${p.delay}ms forwards`,
                "--fw-tx": `${Math.cos(p.angle) * p.speed}px`,
                "--fw-ty": `${Math.sin(p.angle) * p.speed}px`,
                opacity: 0,
              } as React.CSSProperties}
            />
          );
        }

        if (p.type === "confetti") {
          const shapes = ["rect", "circle", "strip"] as const;
          const shape = shapes[p.id % 3];
          return (
            <div
              key={p.id}
              className="absolute"
              style={{
                left: ox + p.x, top: oy,
                animation: `fw-confetti-up ${p.duration}ms cubic-bezier(0.2, 0.8, 0.3, 1) ${p.delay}ms forwards`,
                "--fw-drift": `${p.drift}px`,
                "--fw-rot": `${p.rotation + 720}deg`,
                opacity: 0,
              } as React.CSSProperties}
            >
              {shape === "rect" ? (
                <div style={{ width: p.size, height: p.size * 0.6, backgroundColor: p.color, borderRadius: 2 }} />
              ) : shape === "strip" ? (
                <div style={{ width: p.size * 0.3, height: p.size * 1.5, backgroundColor: p.color, borderRadius: p.size }} />
              ) : (
                <div style={{ width: p.size, height: p.size, backgroundColor: p.color, borderRadius: "50%" }} />
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default Fireworks;
