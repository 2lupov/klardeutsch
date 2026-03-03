import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Referral {
  id: string;
  referred_id: string;
  status: string;
  activated_at: string | null;
  created_at: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface ReferralChallenge {
  id: string;
  referrer_id: string;
  referred_id: string;
  challenge_type: string;
  target_value: number;
  current_value: number;
  completed: boolean;
  reward_type: string;
  reward_value: string;
  partner_name: string | null;
}

const MILESTONES = [
  { count: 1, reward: "50 монет + 20 XP" },
  { count: 3, reward: "Бейдж «Botschafter» + 200 монет", badge: "botschafter" },
  { count: 5, reward: "Аватар «Goldene Kette»", badge: "goldene_kette" },
  { count: 10, reward: "Титул «Sprachmeister» + 500 монет", badge: "sprachmeister" },
];

export const useReferrals = () => {
  const { user } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [challenges, setChallenges] = useState<ReferralChallenge[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Generate or get code
    const { data: codeData } = await supabase.rpc("generate_referral_code", { p_user_id: user.id });
    setCode(codeData as string);

    // Get referrals with profile info
    const { data: refs } = await supabase
      .from("referrals")
      .select("*")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (refs && refs.length > 0) {
      const ids = refs.map((r: any) => r.referred_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", ids);

      const profileMap = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
      setReferrals(
        refs.map((r: any) => ({
          ...r,
          display_name: profileMap.get(r.referred_id)?.display_name ?? null,
          avatar_url: profileMap.get(r.referred_id)?.avatar_url ?? null,
        }))
      );
    } else {
      setReferrals([]);
    }

    // Get challenges
    const { data: ch } = await supabase
      .from("referral_challenges")
      .select("*")
      .or(`referrer_id.eq.${user.id},referred_id.eq.${user.id}`);

    if (ch && ch.length > 0) {
      const partnerIds = ch.map((c: any) => (c.referrer_id === user.id ? c.referred_id : c.referrer_id));
      const { data: partners } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", partnerIds);
      const partnerMap = new Map((partners ?? []).map((p: any) => [p.user_id, p.display_name]));

      setChallenges(
        ch.map((c: any) => ({
          ...c,
          partner_name: partnerMap.get(c.referrer_id === user.id ? c.referred_id : c.referrer_id) ?? null,
        }))
      );
    } else {
      setChallenges([]);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const activeCount = referrals.filter((r) => r.status === "active").length;

  return { code, referrals, challenges, loading, activeCount, milestones: MILESTONES, refresh: loadData };
};
