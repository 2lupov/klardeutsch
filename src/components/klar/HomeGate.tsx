import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AuthKlarLogo from "@/components/auth/AuthKlarLogo";

/**
 * Root route: guests see a brief KLAR splash and are redirected
 * to the auth screen. Authenticated users continue to the learning app.
 */
const HomeGate = () => {
  const { user, loading } = useAuth();
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = performance.now();
    const duration = 1500;
    let raf = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setReady(true);
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (loading) return <div className="min-h-[100dvh] bg-background" />;
  if (user) return <Navigate to="/home" replace />;
  if (ready) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4">
      <AuthKlarLogo progress={progress} />
      <p className="mt-8 text-muted-foreground animate-pulse font-display text-lg">
        KLAR
      </p>
    </div>
  );
};

export default HomeGate;
