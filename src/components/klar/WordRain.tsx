import { useEffect, useRef } from "react";

const TOKENS = ["der", "die", "das", "und", "sein", "ä", "ö", "ü", "A1", "B1", "haben", "ich"];

type Particle = {
  x: number;
  y: number;
  speed: number;
  size: number;
  alpha: number;
  text: string;
  drift: number;
};

/**
 * Calm background canvas: German words and letters slowly falling.
 * Pauses when off-screen or when the tab is hidden, respects reduced motion.
 */
const WordRain = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let visible = true;
    let particles: Particle[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const count = () => (window.innerWidth < 768 ? 32 : 70);

    const spawn = (initial = false): Particle => ({
      x: Math.random() * window.innerWidth,
      y: initial ? Math.random() * window.innerHeight : -30,
      speed: 0.12 + Math.random() * 0.35,
      size: 11 + Math.random() * 12,
      alpha: 0.05 + Math.random() * 0.14,
      text: TOKENS[Math.floor(Math.random() * TOKENS.length)],
      drift: (Math.random() - 0.5) * 0.12,
    });

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = Array.from({ length: count() }, () => spawn(true));
    };

    const draw = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speed;
        p.x += p.drift;
        if (p.y > window.innerHeight + 30) particles[i] = spawn();
        ctx.font = `500 ${p.size}px 'Cormorant Garamond', serif`;
        ctx.fillStyle = `hsl(var(--klar-aqua) / ${p.alpha})`;
        ctx.fillText(p.text, p.x, p.y);
      }
      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (raf) return;
      raf = requestAnimationFrame(draw);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    start();

    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true;
      if (visible && !document.hidden) start();
      else stop();
    });
    io.observe(canvas);

    const onVisibility = () => (document.hidden || !visible ? stop() : start());
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-0" />
  );
};

export default WordRain;
