import { useEffect, useRef, useState } from "react";

/**
 * Fade-up reveal on scroll. Returns a ref to attach to the section
 * and a boolean that flips once the element enters the viewport.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, shown };
}

/** Utility: inline style for staggered fade-up children. */
export const stagger = (index: number) => ({
  transitionDelay: `${Math.min(index * 80, 400)}ms`,
});
