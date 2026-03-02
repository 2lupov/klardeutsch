import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useCallback } from "react";
import { toast } from "@/hooks/use-toast";

const COIN_REWARDS: Record<string, number> = {
  vocabulary: 5,
  grammar: 10,
  reading: 15,
  listening: 20,
};

const XP_REWARDS: Record<string, number> = {
  vocabulary: 10,
  grammar: 20,
  reading: 30,
  listening: 25,
};

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

      // Award coins and XP on completion
      if (completed) {
        const coins = COIN_REWARDS[category] ?? 5;
        const xp = XP_REWARDS[category] ?? 10;
        await Promise.all([
          supabase.rpc("award_coins", {
            p_user_id: user.id,
            p_amount: coins,
            p_reason: `${category}:${level}:${exerciseId}`,
          }),
          supabase.rpc("award_xp", { p_user_id: user.id, p_amount: xp }),
        ]);
        toast({
          title: `+${coins} 🪙`,
          description: category === "vocabulary" ? "Словарный запас" : category === "grammar" ? "Грамматика" : "Чтение",
        });
        // Haptic feedback
        try {
          (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
        } catch {}
      }
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
