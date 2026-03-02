import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useCallback } from "react";

export const useProgress = () => {
  const { user } = useAuth();

  const saveProgress = useCallback(
    async (level: string, category: string, exerciseId: string, score: number, completed: boolean, data?: Json) => {
      if (!user) return;
      await supabase
        .from("user_progress")
        .upsert(
          [{
            user_id: user.id,
            level,
            category,
            exercise_id: exerciseId,
            score,
            completed,
            data: data ?? null,
          }],
          { onConflict: "user_id,level,category,exercise_id" }
        );
    },
    [user]
  );

  const getProgress = useCallback(
    async (level: string, category: string) => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_progress")
        .select("*")
        .eq("user_id", user.id)
        .eq("level", level)
        .eq("category", category);
      return data ?? [];
    },
    [user]
  );

  return { saveProgress, getProgress };
};
