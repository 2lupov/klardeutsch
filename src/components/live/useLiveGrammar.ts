import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toHtml } from "@/lib/rich-text";

export interface GrammarRule { title?: string; explanation_uk?: string; table?: string[] }
export interface GrammarExample { de?: string; uk?: string; focus?: string }
export interface GrammarTask { prompt?: string; answer?: string; hint_uk?: string }

export interface GrammarLesson {
  title?: string;
  title_de?: string;
  level?: string;
  topic?: string;
  summary_uk?: string;
  rules?: GrammarRule[];
  examples?: GrammarExample[];
  practice?: GrammarTask[];
  mistakes?: string[];
  vocab?: { term: string; article?: string | null; translation?: string }[];
  reading?: { title_de?: string; text_de?: string; questions?: string[] };
}

/**
 * Спільний стан розділу «Граматика» живого уроку: конспект, позначки в тексті,
 * нотатки і відкриті відповіді практики синхронні у викладача та учня.
 */
export function useLiveGrammar(classId: string) {
  const [lesson, setLesson] = useState<GrammarLesson | null>(null);
  const [marks, setMarks] = useState("");
  const [notes, setNotes] = useState("");
  const [revealed, setRevealed] = useState<number[]>([]);
  const [remote, setRemote] = useState<"marks" | "notes" | null>(null);
  const me = useRef<string | null>(null);
  const chan = useRef<any>(null);
  const cur = useRef({ marks: "", notes: "", revealed: [] as number[], lesson: null as GrammarLesson | null });
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listeners = useRef<{ marks?: (v: string) => void; notes?: (v: string) => void }>({});

  const apply = (field: "marks" | "notes", html: string, fromRemote: boolean) => {
    cur.current[field] = html;
    (field === "marks" ? setMarks : setNotes)(html);
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
      const { data } = await (supabase as any).from("live_class_grammar").select("*").eq("class_id", classId).maybeSingle();
      if (!alive || !data) return;
      apply("marks", toHtml(data.marks || ""), true);
      apply("notes", toHtml(data.notes || ""), true);
      cur.current.lesson = data.lesson || null;
      setLesson(data.lesson || null);
      cur.current.revealed = Array.isArray(data.revealed) ? data.revealed : [];
      setRevealed(cur.current.revealed);
    })();

    const ch = supabase.channel(`live-grammar:${classId}`, { config: { broadcast: { self: false } } });
    (["marks", "notes"] as const).forEach((field) =>
      ch.on("broadcast", { event: field }, ({ payload }: any) => {
        if (typeof payload?.value === "string") apply(field, toHtml(payload.value), true);
      }),
    );
    ch.on("broadcast", { event: "lesson" }, ({ payload }: any) => {
      cur.current.lesson = payload?.lesson ?? null;
      setLesson(payload?.lesson ?? null);
      cur.current.revealed = [];
      setRevealed([]);
    });
    ch.on("broadcast", { event: "revealed" }, ({ payload }: any) => {
      const r = Array.isArray(payload?.revealed) ? payload.revealed : [];
      cur.current.revealed = r;
      setRevealed(r);
    });
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "live_class_grammar", filter: `class_id=eq.${classId}` },
      (p: any) => {
        const row = p.new;
        if (!row || row.updated_by === me.current) return;
        const m = toHtml(row.marks || "");
        const n = toHtml(row.notes || "");
        if (m !== cur.current.marks) apply("marks", m, true);
        if (n !== cur.current.notes) apply("notes", n, true);
        cur.current.lesson = row.lesson || null;
        setLesson(row.lesson || null);
        const r = Array.isArray(row.revealed) ? row.revealed : [];
        cur.current.revealed = r;
        setRevealed(r);
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
      void (supabase as any).from("live_class_grammar").upsert(
        {
          class_id: classId,
          lesson: cur.current.lesson,
          marks: cur.current.marks,
          notes: cur.current.notes,
          revealed: cur.current.revealed,
          updated_by: me.current,
        },
        { onConflict: "class_id" },
      );
    }, 600);
  }, [classId]);

  const push = useCallback(
    (field: "marks" | "notes", html: string) => {
      apply(field, html, false);
      chan.current?.send({ type: "broadcast", event: field, payload: { value: html } });
      persist();
    },
    [persist],
  );

  const pushLesson = useCallback(
    (l: GrammarLesson | null, marksHtml: string) => {
      cur.current.lesson = l;
      setLesson(l);
      cur.current.revealed = [];
      setRevealed([]);
      apply("marks", marksHtml, false);
      listeners.current.marks?.(marksHtml);
      chan.current?.send({ type: "broadcast", event: "lesson", payload: { lesson: l } });
      chan.current?.send({ type: "broadcast", event: "marks", payload: { value: marksHtml } });
      if (saveT.current) clearTimeout(saveT.current);
      void (async () => {
        const { error } = await (supabase as any).from("live_class_grammar").upsert(
          { class_id: classId, lesson: l, marks: marksHtml, notes: cur.current.notes, revealed: [], updated_by: me.current },
          { onConflict: "class_id" },
        );
        if (error) console.error("grammar save", error);
        // Одразу переносимо учня на вкладку «Граматика»
        if (l) await supabase.from("live_classes").update({ current_section: "grammar" } as any).eq("id", classId);
      })();
    },
    [classId],
  );

  const toggleReveal = useCallback(
    (i: number) => {
      const next = cur.current.revealed.includes(i)
        ? cur.current.revealed.filter((x) => x !== i)
        : [...cur.current.revealed, i];
      cur.current.revealed = next;
      setRevealed(next);
      chan.current?.send({ type: "broadcast", event: "revealed", payload: { revealed: next } });
      persist();
    },
    [persist],
  );

  const onRemote = useCallback((field: "marks" | "notes", fn: (v: string) => void) => {
    listeners.current[field] = fn;
  }, []);

  return { lesson, marks, notes, revealed, remote, push, pushLesson, toggleReveal, onRemote };
}
