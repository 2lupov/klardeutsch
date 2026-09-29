import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toHtml } from "@/lib/rich-text";

export interface ReadingTopic {
  title_de?: string;
  text_de?: string;
  summary_uk?: string;
  grammar_focus?: string[];
  vocab?: { term: string; article?: string | null; translation?: string }[];
  questions?: string[];
  word_count?: number;
  target_words?: number;
  level?: string;
}

/**
 * Спільний стан розділів «Читання» та «Нотатки» живого уроку.
 * Текст і нотатки синхронізуються між викладачем та учнем у реальному часі.
 */
export function useLiveReading(classId: string) {
  const [text, setText] = useState("");
  const [notes, setNotes] = useState("");
  const [topic, setTopic] = useState<ReadingTopic | null>(null);
  const [remote, setRemote] = useState<"text" | "notes" | null>(null);
  const me = useRef<string | null>(null);
  const chan = useRef<any>(null);
  const cur = useRef({ text: "", notes: "", topic: null as ReadingTopic | null });
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeners = useRef<{ text?: (v: string) => void; notes?: (v: string) => void }>({});

  const apply = (field: "text" | "notes", html: string, fromRemote: boolean) => {
    cur.current[field] = html;
    (field === "text" ? setText : setNotes)(html);
    if (fromRemote) {
      listeners.current[field]?.(html);
      setRemote(field);
      if (remoteT.current) clearTimeout(remoteT.current);
      remoteT.current = setTimeout(() => setRemote(null), 1500);
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      me.current = u.user?.id ?? null;
      const { data } = await (supabase as any).from("live_class_reading").select("*").eq("class_id", classId).maybeSingle();
      if (!alive || !data) return;
      apply("text", toHtml(data.text || ""), true);
      apply("notes", toHtml(data.notes || ""), true);
      cur.current.topic = data.topic || null;
      setTopic(data.topic || null);
    })();

    const ch = supabase.channel(`live-reading:${classId}`, { config: { broadcast: { self: false } } });
    (["text", "notes"] as const).forEach((field) =>
      ch.on("broadcast", { event: field }, ({ payload }: any) => {
        if (typeof payload?.value === "string") apply(field, toHtml(payload.value), true);
      }),
    );
    ch.on("broadcast", { event: "topic" }, ({ payload }: any) => {
      cur.current.topic = payload?.topic ?? null;
      setTopic(payload?.topic ?? null);
    });
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_class_reading", filter: `class_id=eq.${classId}` },
      (p: any) => {
        const row = p.new;
        if (!row || row.updated_by === me.current) return;
        const t = toHtml(row.text || "");
        const n = toHtml(row.notes || "");
        if (t !== cur.current.text) apply("text", t, true);
        if (n !== cur.current.notes) apply("notes", n, true);
        cur.current.topic = row.topic || null;
        setTopic(row.topic || null);
      },
    );
    ch.subscribe();
    chan.current = ch;
    return () => {
      alive = false;
      supabase.removeChannel(ch);
      chan.current = null;
    };
  }, [classId]);

  const persist = useCallback(() => {
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      void (supabase as any).from("live_class_reading").upsert(
        {
          class_id: classId,
          text: cur.current.text,
          notes: cur.current.notes,
          topic: cur.current.topic,
          updated_by: me.current,
        },
        { onConflict: "class_id" },
      );
    }, 600);
  }, [classId]);

  /** Локальна зміна поля: одразу летить іншій стороні і зберігається. */
  const push = useCallback(
    (field: "text" | "notes", html: string) => {
      apply(field, html, false);
      chan.current?.send({ type: "broadcast", event: field, payload: { value: html } });
      persist();
    },
    [persist],
  );

  const pushTopic = useCallback(
    (t: ReadingTopic | null, html: string) => {
      cur.current.topic = t;
      setTopic(t);
      apply("text", html, false);
      listeners.current.text?.(html);
      chan.current?.send({ type: "broadcast", event: "topic", payload: { topic: t } });
      chan.current?.send({ type: "broadcast", event: "text", payload: { value: html } });
      persist();
    },
    [persist],
  );

  /** Зовнішній редактор підписується, щоб оновлювати свій DOM при змінах з іншої сторони. */
  const onRemote = useCallback((field: "text" | "notes", fn: (v: string) => void) => {
    listeners.current[field] = fn;
  }, []);

  return { text, notes, topic, remote, push, pushTopic, onRemote };
}
