import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export const useCoins = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("user_coins")
      .select("balance")
      .eq("user_id", user.id)
      .single();
    setBalance(data?.balance ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const awardCoins = useCallback(
    async (amount: number, reason: string) => {
      if (!user) return;
      await supabase.rpc("award_coins", {
        p_user_id: user.id,
        p_amount: amount,
        p_reason: reason,
      });
      setBalance((prev) => prev + amount);
    },
    [user]
  );

  const purchaseItem = useCallback(
    async (itemId: string): Promise<boolean> => {
      if (!user) return false;
      const { data } = await supabase.rpc("purchase_item", {
        p_user_id: user.id,
        p_item_id: itemId,
      });
      if (data) {
        await fetchBalance();
      }
      return !!data;
    },
    [user, fetchBalance]
  );

  return { balance, loading, awardCoins, purchaseItem, refetch: fetchBalance };
};
