import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface SRSCardWithWord {
  id: string;
  vocab_card_id: string | null;
  custom_word_id: string | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  german: string;
  russian: string;
  ukrainian?: string;
  article?: string;
  example?: string;
}

export const useSRS = () => {
  const { user } = useAuth();
  const [dueCount, setDueCount] = useState(0);
  const [dueCards, setDueCards] = useState<SRSCardWithWord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDueCount = useCallback(async () => {
    if (!user) return;
    const { count } = await (supabase as any)
      .from("srs_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .lte("next_review_at", new Date().toISOString());
    setDueCount(count ?? 0);
    setLoading(false);
  }, [user]);

  const fetchDueCards = useCallback(async () => {
    if (!user) return [];
    const { data } = await (supabase as any)
      .from("srs_cards")
      .select("id, vocab_card_id, custom_word_id, ease_factor, interval_days, repetitions")
      .eq("user_id", user.id)
      .lte("next_review_at", new Date().toISOString())
      .limit(20);

    if (!data?.length) return [];

    // Fetch associated vocab cards
    const vocabIds = data.filter((c: any) => c.vocab_card_id).map((c: any) => c.vocab_card_id);
    const customIds = data.filter((c: any) => c.custom_word_id).map((c: any) => c.custom_word_id);

    let vocabMap: Record<string, any> = {};
    let customMap: Record<string, any> = {};

    if (vocabIds.length) {
      const { data: vocabs } = await supabase
        .from("vocab_cards")
        .select("id, german, russian, ukrainian, article, example")
        .in("id", vocabIds);
      vocabs?.forEach((v) => (vocabMap[v.id] = v));
    }

    if (customIds.length) {
      const { data: customs } = await supabase
        .from("custom_words")
        .select("id, german, russian, article, example")
        .in("id", customIds);
      customs?.forEach((c) => (customMap[c.id] = c));
    }

    const enriched = data.map((c: any) => {
      const word = c.vocab_card_id ? vocabMap[c.vocab_card_id] : customMap[c.custom_word_id];
      return { ...c, ...(word || { german: "?", russian: "?" }) };
    });

    setDueCards(enriched);
    return enriched;
  }, [user]);

  const reviewCard = useCallback(
    async (cardId: string, quality: number) => {
      if (!user) return;
      await (supabase as any).rpc("review_srs_card", {
        p_user_id: user.id,
        p_card_id: cardId,
        p_quality: quality,
      });
    },
    [user]
  );

  const addToSRS = useCallback(
    async (vocabCardId: string) => {
      if (!user) return;
      await (supabase as any).from("srs_cards").upsert(
        { user_id: user.id, vocab_card_id: vocabCardId, next_review_at: new Date().toISOString() },
        { onConflict: "user_id,vocab_card_id" }
      );
    },
    [user]
  );

  useEffect(() => {
    fetchDueCount();
  }, [fetchDueCount]);

  return { dueCount, dueCards, loading, fetchDueCards, fetchDueCount, reviewCard, addToSRS };
};
