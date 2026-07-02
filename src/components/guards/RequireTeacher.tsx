import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Same whitelist as RequirePremium — full-access accounts are always allowed.
const FULL_ACCESS_NAMES = ["rodnoi", "2lupov7"];

interface Props { children: ReactNode }

const RequireTeacher = ({ children }: Props) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<"loading" | "ok" | "deny">("loading");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setState("deny"); return; }
    (async () => {
      const [{ data: roles }, { data: prof }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("profiles").select("display_name, nickname").eq("user_id", user.id).single(),
      ]);
      const has = (roles || []).some((r: any) => r.role === "teacher" || r.role === "admin");
      const name = (prof?.display_name ?? "").toLowerCase().trim();
      const nick = (prof?.nickname ?? "").toLowerCase().trim();
      const whitelisted = FULL_ACCESS_NAMES.includes(name) || FULL_ACCESS_NAMES.includes(nick);
      setState(has || whitelisted ? "ok" : "deny");
    })();
  }, [user, authLoading]);

  if (authLoading || state === "loading") return null;
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth?next=${next}`} replace />;
  }
  if (state === "deny") return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default RequireTeacher;
