import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionPlan = "free" | "school" | "assistant" | "allinone";

interface SubscriptionState {
  isPremium: boolean;
  hasSchool: boolean;
  hasAssistant: boolean;
  plan: SubscriptionPlan;
  subscriptionEnd: string | null;
  cancelAtPeriodEnd: boolean;
  loading: boolean;
  checkSubscription: () => Promise<void>;
}

interface UsageState {
  lessonsUsed: number;
  gamesUsed: number;
  aiUsed: number;
  limitLessons: number;
  limitGames: number;
  limitAi: number;
}

export const useSubscription = (): SubscriptionState & { usage: UsageState; checkUsage: (type: "lesson" | "game" | "ai") => Promise<boolean> } => {
  const { user, session } = useAuth();
  const [plan, setPlan] = useState<SubscriptionPlan>("free");
  const [hasSchool, setHasSchool] = useState(false);
  const [hasAssistant, setHasAssistant] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<UsageState>({
    lessonsUsed: 0, gamesUsed: 0, aiUsed: 0,
    limitLessons: 3, limitGames: 1, limitAi: 3,
  });

  const isPremium = plan !== "free";

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      setPlan((data?.plan as SubscriptionPlan) ?? "free");
      setHasSchool(data?.has_school ?? false);
      setHasAssistant(data?.has_assistant ?? false);
      setSubscriptionEnd(data?.subscription_end ?? null);
      setCancelAtPeriodEnd(data?.cancel_at_period_end ?? false);
    } catch (e) {
      console.error("check-subscription error:", e);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (user && session) {
      checkSubscription();
      const interval = setInterval(checkSubscription, 60000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [user, session, checkSubscription]);

  // Load daily usage
  useEffect(() => {
    if (!user) return;
    const loadUsage = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("daily_usage" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("usage_date", today)
        .single();
      if (data) {
        setUsage({
          lessonsUsed: (data as any).lessons_used ?? 0,
          gamesUsed: (data as any).games_used ?? 0,
          aiUsed: (data as any).ai_requests_used ?? 0,
          limitLessons: 3, limitGames: 1, limitAi: 3,
        });
      }
    };
    loadUsage();
  }, [user]);

  const checkUsage = useCallback(async (type: "lesson" | "game" | "ai"): Promise<boolean> => {
    if (!user) return false;
    if (isPremium) return true;

    const { data, error } = await supabase.rpc("increment_daily_usage" as any, {
      p_user_id: user.id,
      p_type: type,
    });

    if (error) {
      console.error("increment_daily_usage error:", error);
      return false;
    }

    const result = data as any;
    if (result) {
      setUsage({
        lessonsUsed: result.lessons_used ?? 0,
        gamesUsed: result.games_used ?? 0,
        aiUsed: result.ai_used ?? 0,
        limitLessons: result.limit_lessons ?? 3,
        limitGames: result.limit_games ?? 1,
        limitAi: result.limit_ai ?? 3,
      });
    }

    return result?.allowed ?? false;
  }, [user, isPremium]);

  return {
    isPremium, hasSchool, hasAssistant, plan, subscriptionEnd, cancelAtPeriodEnd, loading,
    checkSubscription, usage, checkUsage,
  };
};
