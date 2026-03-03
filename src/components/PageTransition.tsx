import { useRef, useEffect, useState, ReactNode } from "react";
import { useLocation } from "react-router-dom";

const PageTransition = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionClass, setTransitionClass] = useState("animate-page-enter");
  const prevPath = useRef(location.pathname);

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      prevPath.current = location.pathname;
      setTransitionClass("animate-page-exit");

      const timeout = setTimeout(() => {
        setDisplayChildren(children);
        setTransitionClass("animate-page-enter");
      }, 150);

      return () => clearTimeout(timeout);
    } else {
      setDisplayChildren(children);
    }
  }, [location.pathname, children]);

  return (
    <div className={transitionClass} style={{ willChange: "opacity, transform" }}>
      {displayChildren}
    </div>
  );
};

export default PageTransition;
