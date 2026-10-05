import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type CommunityMessage = Tables<"community_messages">;
export type ChatProfile = { user_id: string; display_name: string | null; avatar_url: string | null };

const PAGE = 60;

export const useCommunityMessages = (enabled: boolean) => {
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ChatProfile>>({});
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  const ensureProfiles = useCallback(async (ids: string[]) => {
    const missing = [...new Set(ids)].filter((id) => !profilesRef.current[id]);
    if (!missing.length) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", missing);
    if (error) { console.warn("profiles load failed", error.message); return; }
    setProfiles((prev) => {
      const next = { ...prev };
      (data ?? []).forEach((p) => { next[p.user_id] = p; });
      return next;
    });
  }, []);

  const mergeUnique = (list: CommunityMessage[]) => {
    const seen = new Set<string>();
    return list
      .filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  };

  // initial load: newest PAGE messages, displayed oldest → newest
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("community_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE);
      if (cancelled) return;
      if (error) { setError(error.message); setLoading(false); return; }
      const list = (data ?? []).reverse();
      setMessages((prev) => mergeUnique([...list, ...prev]));
      setHasMore((data ?? []).length === PAGE);
      await ensureProfiles(list.map((m) => m.user_id));
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [enabled, ensureProfiles]);

  // realtime: only the community channel
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel("community-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, (payload) => {
        const msg = payload.new as CommunityMessage;
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : mergeUnique([...prev, msg])));
        ensureProfiles([msg.user_id]);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "community_messages" }, (payload) => {
        const id = (payload.old as Partial<CommunityMessage>).id;
        if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [enabled, ensureProfiles]);

  const loadOlder = useCallback(async () => {
    if (loadingOlder || !hasMore || !messages.length) return 0;
    setLoadingOlder(true);
    const { data, error } = await supabase
      .from("community_messages")
      .select("*")
      .lt("created_at", messages[0].created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    setLoadingOlder(false);
    if (error) { setError(error.message); return 0; }
    const list = (data ?? []).reverse();
    setHasMore((data ?? []).length === PAGE);
    setMessages((prev) => mergeUnique([...list, ...prev]));
    await ensureProfiles(list.map((m) => m.user_id));
    return list.length;
  }, [loadingOlder, hasMore, messages, ensureProfiles]);

  const send = useCallback(async (row: TablesInsert<"community_messages">) => {
    const { data, error } = await supabase.from("community_messages").insert(row).select().single();
    if (error) throw error;
    setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : mergeUnique([...prev, data])));
    return data;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("community_messages").delete().eq("id", id);
    if (error) throw error;
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return { messages, profiles, loading, loadingOlder, hasMore, error, loadOlder, send, remove };
};
