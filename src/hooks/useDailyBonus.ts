import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface BonusReward {
  type: "coins" | "xp";
  amount: number;
  emoji: string;
  label: string;
}

const REWARDS: BonusReward[] = [
  { type: "coins", amount: 5, emoji: "🪙", label: "5 монет" },
  { type: "coins", amount: 10, emoji: "💰", label: "10 монет" },
  { type: "coins", amount: 15, emoji: "💰", label: "15 монет" },
  { type: "coins", amount: 25, emoji: "🎁", label: "25 монет" },
  { type: "coins", amount: 50, emoji: "🏆", label: "50 монет!" },
  { type: "xp", amount: 10, emoji: "⚡", label: "+10 XP" },
  { type: "xp", amount: 20, emoji: "⚡", label: "+20 XP" },
  { type: "xp", amount: 30, emoji: "🔥", label: "+30 XP" },
  { type: "xp", amount: 50, emoji: "🚀", label: "+50 XP!" },
];

function pickReward(streak: number): BonusReward {
  // Higher streak = better chances for bigger rewards
  const boost = Math.min(streak, 7);
  const weights = REWARDS.map((_, i) => 1 + (i < boost ? i * 0.5 : 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return REWARDS[i];
  }
  return REWARDS[0];
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

function isYesterday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return d.toDateString() === yesterday.toDateString();
}

export const useDailyBonus = () => {
  const { user } = useAuth();
  const [canClaim, setCanClaim] = useState(false);
  const [streak, setStreak] = useState(1);
  const [loading, setLoading] = useState(true);
  const [reward, setReward] = useState<BonusReward | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    supabase
      .from("daily_bonuses" as any)
      .select("last_claimed_at, streak")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!data) {
          setCanClaim(true);
          setStreak(1);
        } else if (isToday(data.last_claimed_at)) {
          setCanClaim(false);
          setStreak(data.streak);
        } else {
          setCanClaim(true);
          setStreak(isYesterday(data.last_claimed_at) ? data.streak + 1 : 1);
        }
        setLoading(false);
      });
  }, [user]);

  const claim = useCallback(async (): Promise<BonusReward | null> => {
    if (!user || !canClaim) return null;

    const newStreak = streak;
    const picked = pickReward(newStreak);

    // Upsert daily bonus record
    await (supabase as any)
      .from("daily_bonuses")
      .upsert(
        { user_id: user.id, last_claimed_at: new Date().toISOString(), streak: newStreak },
        { onConflict: "user_id" }
      );

    // Award the reward
    if (picked.type === "coins") {
      await supabase.rpc("award_coins", { p_user_id: user.id, p_amount: picked.amount, p_reason: "daily_bonus" });
    } else {
      await supabase.rpc("award_xp", { p_user_id: user.id, p_amount: picked.amount });
    }

    setCanClaim(false);
    setStreak(newStreak);
    setReward(picked);
    return picked;
  }, [user, canClaim, streak]);

  return { canClaim, streak, loading, reward, claim };
};
