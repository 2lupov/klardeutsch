import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";

interface Props {
  children: ReactNode;
  /** Optional plan requirement: "assistant" | "school" | "allinone". If unset → any premium plan unlocks. */
  require?: "assistant" | "school" | "allinone";
}

const RequirePremium = ({ children, require }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { isPremium, hasSchool, hasAssistant, plan, loading } = useSubscription();

  if (authLoading || loading) return null;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  let allowed = isPremium;
  if (require === "school") allowed = hasSchool || plan === "allinone";
  if (require === "assistant") allowed = hasAssistant || plan === "allinone";
  if (require === "allinone") allowed = plan === "allinone";

  if (!allowed) {
    return <Navigate to="/profile?upgrade=1" replace />;
  }

  return <>{children}</>;
};

export default RequirePremium;
