import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useXP = () => {
  const { user } = useAuth();
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchXP = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_xp")
      .select("total_xp")
      .eq("user_id", user.id)
      .single();
    setTotalXP(data?.total_xp ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchXP();
  }, [fetchXP]);

  const awardXP = useCallback(
    async (amount: number) => {
      if (!user) return;
      await supabase.rpc("award_xp", { p_user_id: user.id, p_amount: amount });
      setTotalXP((prev) => prev + amount);
    },
    [user]
  );

  return { totalXP, loading, awardXP, refetch: fetchXP };
};
