import { useEffect, useState } from "react";

interface Particle {
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
  "hsl(45, 92%, 52%)",   // yellow-glow
  "hsl(45, 80%, 65%)",   // yellow-soft  
  "hsl(30, 90%, 55%)",   // orange
  "hsl(60, 85%, 60%)",   // light yellow
  "hsl(15, 85%, 55%)",   // warm orange
  "hsl(50, 95%, 70%)",   // bright gold
];

const Fireworks = ({ onComplete }: { onComplete: () => void }) => {
  const [particles] = useState<Particle[]>(() => {
    const arr: Particle[] = [];
    // Multiple burst origins
    const origins = [
      { x: 50, y: 40 },
      { x: 30, y: 35 },
      { x: 70, y: 35 },
      { x: 40, y: 55 },
      { x: 60, y: 55 },
    ];

    origins.forEach((origin, oi) => {
      const count = 20 + Math.floor(Math.random() * 10);
      for (let i = 0; i < count; i++) {
        arr.push({
          id: oi * 100 + i,
          x: origin.x,
          y: origin.y,
          angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3,
          speed: 60 + Math.random() * 120,
          size: 3 + Math.random() * 5,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          delay: oi * 120 + Math.random() * 80,
        });
      }
    });
    return arr;
  });

  useEffect(() => {
    const t = setTimeout(onComplete, 2200);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Flash */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 45%, hsl(45 92% 52% / 0.3), transparent 60%)",
          animation: "fw-flash 0.6s ease-out forwards",
        }}
      />

      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
            animation: `fw-particle 1.4s ease-out ${p.delay}ms forwards`,
            "--fw-tx": `${Math.cos(p.angle) * p.speed}px`,
            "--fw-ty": `${Math.sin(p.angle) * p.speed}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default Fireworks;
