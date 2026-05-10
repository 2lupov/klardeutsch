import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Глобальная синхронизация: как только учитель стартует live-сессию для этого ученика,
 * ученика автоматически перебрасывает на /student-view/:sessionId — независимо от того,
 * на какой странице он сейчас находится. Если сессия закрылась — возвращаем на /assignments.
 */
export function useStudentLiveSync(userId: string | undefined) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const goToSession = (id: string) => {
      const target = `/student-view/${id}`;
      if (location.pathname === target) return;
      // не редиректим учителя из его пресентера
      if (location.pathname.startsWith("/tutoring/lesson/")) {
        // учитель тоже сюда заходит — но student_id фильтр уже отсекает
      }
      toast.info("👨‍🏫 Преподаватель начал урок");
      navigate(target, { replace: true });
    };

    // Initial check
    (async () => {
      const { data } = await supabase
        .from("tutoring_live_sessions")
        .select("id, status")
        .eq("student_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (data?.id) goToSession(data.id);
    })();

    const ch = supabase
      .channel(`live-sync:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tutoring_live_sessions", filter: `student_id=eq.${userId}` },
        ({ new: s }: any) => { if (s?.status === "active") goToSession(s.id); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tutoring_live_sessions", filter: `student_id=eq.${userId}` },
        ({ new: s }: any) => {
          if (s?.status === "active") goToSession(s.id);
          if (s?.status === "ended" && location.pathname === `/student-view/${s.id}`) {
            navigate("/assignments", { replace: true });
          }
        },
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [userId, navigate, location.pathname]);
}
