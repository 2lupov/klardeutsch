import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toHtml } from "@/lib/rich-text";

export interface LiveVideoState {
  video_url: string;
  video_id: string | null;
  notes: string;
}

const EMPTY: LiveVideoState = { video_url: "", video_id: null, notes: "" };

export function youtubeVideoId(value: string) {
  const input = value.trim();
  if (!input) return null;
  try {
    const url = new URL(input.startsWith("http") ? input : `https://${input}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      id = url.searchParams.get("v");
      if (!id) {
        const parts = url.pathname.split("/").filter(Boolean);
        if (["embed", "shorts", "live"].includes(parts[0] ?? "")) id = parts[1] ?? null;
      }
    }
    return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function useLiveVideo(classId: string) {
  const [state, setState] = useState<LiveVideoState>(EMPTY);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const current = useRef<LiveVideoState>(EMPTY);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channel = useRef<any>(null);
  const editor = useRef<((value: string) => void) | null>(null);

  const apply = useCallback((next: LiveVideoState, remote = false) => {
    const normalized = { ...next, notes: toHtml(next.notes || "") };
    current.current = normalized;
    setState(normalized);
    if (remote) editor.current?.(normalized.notes);
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await (supabase as any).from("live_class_video").select("video_url, video_id, notes").eq("class_id", classId).maybeSingle();
      if (alive && data) apply(data as LiveVideoState, true);
    })();

    const ch = supabase.channel(`live-video:${classId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "state" }, ({ payload }: any) => {
      if (!payload?.state) return;
      apply(payload.state as LiveVideoState, true);
      setRemoteTyping(true);
      if (remoteTimer.current) clearTimeout(remoteTimer.current);
      remoteTimer.current = setTimeout(() => setRemoteTyping(false), 1200);
    });
    ch.on("postgres_changes", { event: "*", schema: "public", table: "live_class_video", filter: `class_id=eq.${classId}` }, ({ new: row }: any) => {
      if (row) apply(row as LiveVideoState, true);
    });
    ch.subscribe();
    channel.current = ch;
    return () => {
      alive = false;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (remoteTimer.current) clearTimeout(remoteTimer.current);
      supabase.removeChannel(ch);
      channel.current = null;
    };
  }, [apply, classId]);

  const save = useCallback(async (next: LiveVideoState) => {
    await (supabase as any).from("live_class_video").upsert({ class_id: classId, ...next }, { onConflict: "class_id" });
  }, [classId]);

  const update = useCallback((patch: Partial<LiveVideoState>, immediate = false) => {
    const next = { ...current.current, ...patch };
    apply(next);
    channel.current?.send({ type: "broadcast", event: "state", payload: { state: next } });
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (immediate) void save(next);
    else saveTimer.current = setTimeout(() => void save(next), 600);
  }, [apply, save]);

  useEffect(() => () => {
    if (saveTimer.current) void save(current.current);
  }, [save]);

  return { state, update, remoteTyping, registerEditor: (fn: (value: string) => void) => { editor.current = fn; } };
}