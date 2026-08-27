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
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  if (loading) return <div className="min-h-[100dvh] bg-background" />;
  if (user) return <Navigate to="/home" replace />;
  if (ready) return <Navigate to="/auth" replace />;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-4">
      <AuthKlarLogo className="w-48 h-48 md:w-64 md:h-64" />
      <p className="mt-8 text-muted-foreground animate-pulse font-display text-lg">
        KLAR
      </p>
    </div>
  );
};

export default HomeGate;
