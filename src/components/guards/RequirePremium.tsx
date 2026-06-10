import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  children: ReactNode;
  /** Optional plan requirement: "assistant" | "school" | "allinone". If unset → any premium plan unlocks. */
  require?: "assistant" | "school" | "allinone";
}

// Nicknames / display names that bypass all premium checks (full access).
const FULL_ACCESS_NAMES = ["rodnoi", "2lupov7"];

const RequirePremium = ({ children, require }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { isPremium, hasSchool, hasAssistant, plan, loading } = useSubscription();
  const [whitelisted, setWhitelisted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) { setWhitelisted(false); return; }
    supabase
      .from("profiles")
      .select("display_name, nickname")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        const name = (data?.display_name ?? "").toLowerCase().trim();
        const nick = (data?.nickname ?? "").toLowerCase().trim();
        setWhitelisted(FULL_ACCESS_NAMES.includes(name) || FULL_ACCESS_NAMES.includes(nick));
      });
  }, [user]);

  if (authLoading || loading || whitelisted === null) return null;

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }

  if (whitelisted) return <>{children}</>;

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
