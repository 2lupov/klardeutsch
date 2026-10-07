import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Присутність в уроці (Supabase Realtime presence).
 * Обидві сторони викликають хук зі своїм userId: хто «онлайн» видно одразу,
 * а також розділ, у якому зараз перебуває учень.
 */
export interface PresenceMeta {
  user_id: string;
  role: "teacher" | "student";
  section?: string;
}

export function useLivePresence(classId: string | undefined, me: { id: string; role: "teacher" | "student" } | null, section?: string) {
  const [peers, setPeers] = useState<PresenceMeta[]>([]);
  const [chan, setChan] = useState<any>(null);

  useEffect(() => {
    if (!classId || !me) return;
    const ch = supabase.channel(`live-presence:${classId}`, { config: { presence: { key: me.id } } });
    const sync = () => {
      const state = ch.presenceState() as Record<string, PresenceMeta[]>;
      setPeers(Object.values(state).flat().filter((m) => m.user_id !== me.id));
    };
    ch.on("presence", { event: "sync" }, sync)
      .subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") await ch.track({ user_id: me.id, role: me.role } as PresenceMeta);
      });
    setChan(ch);
    return () => { setChan(null); supabase.removeChannel(ch); setPeers([]); };
  }, [classId, me?.id, me?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  // оновлюємо власний розділ без перепідписки
  useEffect(() => {
    if (chan && me) chan.track({ user_id: me.id, role: me.role, section } as PresenceMeta).catch(() => {});
  }, [section]); // eslint-disable-line react-hooks/exhaustive-deps

  const other = peers.find((p) => p.role === (me?.role === "teacher" ? "student" : "teacher")) ?? null;
  return { online: !!other, other };
}
