import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import KlarLanding from "@/pages/KlarLanding";

/**
 * Root route: guests see the «Клар» landing page,
 * signed-in users continue to the learning app.
 */
const HomeGate = () => {
  const { user, loading } = useAuth();

  if (loading) return <div className="min-h-[100dvh] bg-klar-bg" />;
  if (user) return <Navigate to="/home" replace />;
  return <KlarLanding />;
};

export default HomeGate;
