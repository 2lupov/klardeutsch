import { useRef, useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const prevPath = useRef(location.pathname);
  const [displayChildren, setDisplayChildren] = useState(children);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;

      // Just swap content instantly — no flash, no blink
      setDisplayChildren(children);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return <div ref={containerRef}>{displayChildren}</div>;
};

export default PageTransition;
