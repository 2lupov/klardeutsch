import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * While a live class is active for this student, every navigation is
 * redirected into /live/:id. When the teacher ends it, the student is
 * released back to their normal dashboard.
 */
export function useLiveClassLock(userId: string | undefined) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const goTo = (id: string) => {
      const target = `/live/${id}`;
      if (location.pathname === target) return;
      // Bring the student into the lesson once; afterwards they may
      // step out to their cabinet (/academy) without being bounced back.
      const key = `klar_live_joined:${id}`;
      if (location.pathname.startsWith("/academy") && sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
      toast.info("👨‍🏫 Урок почався");
      navigate(target, { replace: true });
    };

    (async () => {
      const { data } = await supabase
        .from("live_classes")
        .select("id, status")
        .eq("student_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled || !data?.id) return;
      goTo(data.id);
    })();

    const ch = supabase
      .channel(`live-class-lock:${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_classes", filter: `student_id=eq.${userId}` },
        ({ new: c }: any) => { if (c?.status === "active") goTo(c.id); },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "live_classes", filter: `student_id=eq.${userId}` },
        ({ new: c }: any) => {
          if (c?.status === "active") goTo(c.id);
          if (c?.status === "ended" && location.pathname === `/live/${c.id}`) {
            toast.success("Урок завершено");
            navigate("/assignments", { replace: true });
          }
        },
      )
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [userId, navigate, location.pathname]);
}
