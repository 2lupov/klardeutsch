import { useEffect, useState, useMemo } from "react";

interface Particle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  type: "spark" | "confetti" | "star" | "ring" | "trail";
  rotation: number;
  drift: number;
}

const COLORS = [
  "hsl(45, 92%, 52%)",   // gold
  "hsl(45, 80%, 65%)",   // light gold
  "hsl(30, 90%, 55%)",   // orange
  "hsl(60, 85%, 60%)",   // yellow
  "hsl(0, 85%, 60%)",    // red
  "hsl(200, 80%, 60%)",  // blue
  "hsl(280, 70%, 65%)",  // purple
  "hsl(140, 70%, 55%)",  // green
  "hsl(320, 80%, 65%)",  // pink
  "hsl(170, 70%, 55%)",  // teal
];

const triggerHaptic = () => {
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      tg.HapticFeedback.impactOccurred("heavy");
      setTimeout(() => tg.HapticFeedback.impactOccurred("medium"), 200);
      setTimeout(() => tg.HapticFeedback.impactOccurred("light"), 400);
      setTimeout(() => tg.HapticFeedback.impactOccurred("heavy"), 800);
      setTimeout(() => tg.HapticFeedback.impactOccurred("medium"), 1200);
    }
  } catch {}
  if (navigator.vibrate) {
    navigator.vibrate([100, 50, 80, 50, 60, 100, 120]);
  }
};

interface FireworksProps {
  onComplete: () => void;
  originRef?: React.RefObject<HTMLElement>;
}

const randColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const Fireworks = ({ onComplete, originRef }: FireworksProps) => {
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (originRef?.current) {
      const rect = originRef.current.getBoundingClientRect();
      setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
  }, [originRef]);

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    let id = 0;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // === Wave 1: central burst sparks (from origin) ===
    for (let wave = 0; wave < 3; wave++) {
      const count = 24 + wave * 6;
      for (let i = 0; i < count; i++) {
        arr.push({
          id: id++, x: 0, y: 0,
          angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4,
          speed: 60 + Math.random() * 120 + wave * 30,
          size: 3 + Math.random() * 5,
          color: randColor(),
          delay: wave * 200 + Math.random() * 100,
          duration: 1000 + Math.random() * 600,
          type: "spark",
          rotation: 0, drift: 0,
        });
      }
    }

    // === Wave 2: confetti shooting up ===
    for (let i = 0; i < 100; i++) {
      arr.push({
        id: id++,
        x: -50 + Math.random() * 100,
        y: 0,
        angle: 0, speed: 0,
        size: 6 + Math.random() * 10,
        color: randColor(),
        delay: Math.random() * 500,
        duration: 2200 + Math.random() * 1000,
        type: "confetti",
        rotation: Math.random() * 360,
        drift: (Math.random() - 0.5) * 250,
      });
    }

    // === Wave 3: secondary explosions at random positions ===
    const burstPoints = [
      { bx: W * 0.2, by: H * 0.25, bDelay: 600 },
      { bx: W * 0.8, by: H * 0.3, bDelay: 900 },
      { bx: W * 0.5, by: H * 0.15, bDelay: 1200 },
      { bx: W * 0.3, by: H * 0.6, bDelay: 1500 },
      { bx: W * 0.7, by: H * 0.5, bDelay: 1800 },
    ];
    for (const bp of burstPoints) {
      for (let i = 0; i < 16; i++) {
        arr.push({
          id: id++,
          x: bp.bx, y: bp.by,
          angle: (Math.PI * 2 * i) / 16 + (Math.random() - 0.5) * 0.3,
          speed: 30 + Math.random() * 70,
          size: 3 + Math.random() * 4,
          color: randColor(),
          delay: bp.bDelay + Math.random() * 150,
          duration: 900 + Math.random() * 500,
          type: "spark",
          rotation: 0, drift: 0,
        });
      }
      // Expanding ring for each burst
      arr.push({
        id: id++,
        x: bp.bx, y: bp.by,
        angle: 0, speed: 0,
        size: 80 + Math.random() * 40,
        color: randColor(),
        delay: bp.bDelay,
        duration: 800,
        type: "ring",
        rotation: 0, drift: 0,
      });
    }

    // === Stars floating down ===
    for (let i = 0; i < 20; i++) {
      arr.push({
        id: id++,
        x: Math.random() * W,
        y: -20,
        angle: 0, speed: 0,
        size: 10 + Math.random() * 14,
        color: randColor(),
        delay: 400 + Math.random() * 2000,
        duration: 2000 + Math.random() * 1500,
        type: "star",
        rotation: Math.random() * 360,
        drift: (Math.random() - 0.5) * 100,
      });
    }

    // === Trails shooting upward ===
    for (let i = 0; i < 8; i++) {
      arr.push({
        id: id++,
        x: W * 0.15 + Math.random() * W * 0.7,
        y: H,
        angle: 0, speed: 0,
        size: 3,
        color: COLORS[i % COLORS.length],
        delay: i * 250 + Math.random() * 200,
        duration: 1200,
        type: "trail",
        rotation: 0,
        drift: (Math.random() - 0.5) * 60,
      });
    }

    return arr;
  }, []);

  useEffect(() => {
    triggerHaptic();
    const t = setTimeout(onComplete, 3500);
    return () => clearTimeout(t);
  }, [onComplete]);

  const ox = origin?.x ?? window.innerWidth / 2;
  const oy = origin?.y ?? window.innerHeight * 0.35;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Multi-layer flash */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${ox}px ${oy}px, hsl(45 92% 52% / 0.5), transparent 50%)`,
          animation: "fw-flash 0.8s ease-out forwards",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${ox}px ${oy}px, hsl(45 92% 80% / 0.3), transparent 30%)`,
          animation: "fw-flash 0.4s ease-out forwards",
        }}
      />

      {particles.map((p) => {
        if (p.type === "spark") {
          const isSecondary = p.x !== 0 || p.y !== 0;
          const cx = isSecondary ? p.x : ox;
          const cy = isSecondary ? p.y : oy;
          return (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: cx, top: cy,
                width: p.size, height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 4}px ${p.color}, 0 0 ${p.size * 8}px ${p.color}40`,
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

        if (p.type === "ring") {
          return (
            <div
              key={p.id}
              className="absolute rounded-full"
              style={{
                left: p.x, top: p.y,
                width: 0, height: 0,
                border: `2px solid ${p.color}`,
                boxShadow: `0 0 20px ${p.color}, inset 0 0 20px ${p.color}40`,
                transform: "translate(-50%, -50%)",
                animation: `fw-ring ${p.duration}ms ease-out ${p.delay}ms forwards`,
                "--fw-ring-size": `${p.size}px`,
                opacity: 0,
              } as React.CSSProperties}
            />
          );
        }

        if (p.type === "star") {
          return (
            <div
              key={p.id}
              className="absolute"
              style={{
                left: p.x, top: p.y,
                fontSize: p.size,
                color: p.color,
                textShadow: `0 0 ${p.size}px ${p.color}`,
                animation: `fw-star-fall ${p.duration}ms ease-in ${p.delay}ms forwards`,
                "--fw-star-drift": `${p.drift}px`,
                "--fw-star-rot": `${p.rotation + 360}deg`,
                opacity: 0,
              } as React.CSSProperties}
            >
              ✦
            </div>
          );
        }

        if (p.type === "trail") {
          return (
            <div
              key={p.id}
              className="absolute"
              style={{
                left: p.x, bottom: 0,
                width: p.size, height: p.size,
                backgroundColor: p.color,
                borderRadius: "50%",
                boxShadow: `0 0 12px ${p.color}, 0 8px 24px ${p.color}80`,
                animation: `fw-trail ${p.duration}ms ease-out ${p.delay}ms forwards`,
                "--fw-trail-drift": `${p.drift}px`,
                opacity: 0,
              } as React.CSSProperties}
            />
          );
        }

        return null;
      })}
    </div>
  );
};

export default Fireworks;
