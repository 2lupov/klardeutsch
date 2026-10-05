import { useCallback, useEffect, useState } from "react";
import { BUILTIN_MEDIA } from "./data";

export interface DrState {
  done: Record<string, boolean>; // "1-theory"
  answers: Record<string, string>; // any question key
  drafts: Record<string, string>;
  exams: Record<string, { answers: Record<string, string>; submitted?: boolean; startedAt?: number }>;
}
const empty: DrState = { done: {}, answers: {}, drafts: {}, exams: {} };
const keyFor = (uid?: string) => `klar-deutschraum-a2:${uid ?? "guest"}`;

/** Local progress per account on this device (first stage; server sync can come later). */
export function useDrStore(uid?: string) {
  const [state, setState] = useState<DrState>(empty);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(keyFor(uid));
      setState(raw ? { ...empty, ...JSON.parse(raw) } : empty);
    } catch { setState(empty); }
  }, [uid]);
  const update = useCallback((fn: (s: DrState) => DrState) => {
    setState((prev) => {
      const next = fn(prev);
      try { localStorage.setItem(keyFor(uid), JSON.stringify(next)); } catch {}
      return next;
    });
  }, [uid]);
  return { state, update };
}

const MEDIA_KEY = "klar-deutschraum-media";
export function getMedia(): Record<string, string> {
  try { return { ...BUILTIN_MEDIA, ...JSON.parse(localStorage.getItem(MEDIA_KEY) || "{}") }; } catch { return { ...BUILTIN_MEDIA }; }
}
export function setMediaUrl(key: string, url: string) {
  const cur = JSON.parse(localStorage.getItem(MEDIA_KEY) || "{}");
  if (url) cur[key] = url; else delete cur[key];
  localStorage.setItem(MEDIA_KEY, JSON.stringify(cur));
}
