import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

/**
 * A "managed student" is a user account created by a teacher
 * (profiles.created_by_teacher_id is set).
 *
 * They get a locked-down interface: only the assignments page from
 * their teacher, no subscriptions, no extra navigation, no shop, etc.
 */
export const useIsManagedStudent = () => {
  const { user, loading: authLoading } = useAuth();
  const [isStudent, setIsStudent] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setIsStudent(false);
      return;
    }
    supabase
      .from("profiles")
      .select("created_by_teacher_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsStudent(!!(data as any)?.created_by_teacher_id);
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return { isStudent: !!isStudent, loading: isStudent === null };
};
