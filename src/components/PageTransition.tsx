import { useRef, useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [phase, setPhase] = useState<"visible" | "fading-out" | "fading-in">("visible");
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setPhase("fading-out");

      const timeout = setTimeout(() => {
        setDisplayChildren(children);
        setPhase("fading-in");
        // Remove fading-in class after animation completes
        setTimeout(() => setPhase("visible"), 300);
      }, 180);

      return () => clearTimeout(timeout);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  const style: React.CSSProperties = {
    transition: "opacity 0.18s ease, transform 0.25s ease",
    opacity: phase === "fading-out" ? 0 : 1,
    transform: phase === "fading-out" ? "scale(0.985)" : phase === "fading-in" ? "scale(1)" : "none",
  };

  return (
    <div style={style}>
      {displayChildren}
    </div>
  );
};

export default PageTransition;
