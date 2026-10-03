import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Lang } from './types';

export interface SectionProgress { done: boolean; best: number; total: number; updatedAt: number }
export interface Progress {
  lang?: Lang;
  sections: Record<string, SectionProgress>;
  drafts: Record<string, string>;
}

/**
 * Заміни реалізацію на Supabase/свій backend — достатньо реалізувати ці два методи
 * і передати store у <GermanA2Course store={...} />.
 */
export interface ProgressStore {
  load(): Promise<Progress>;
  save(p: Progress): Promise<void>;
}

const EMPTY: Progress = { sections: {}, drafts: {} };

export function createLocalStorageStore(key = 'german-a2-progress'): ProgressStore {
  return {
    async load() {
      try {
        const raw = localStorage.getItem(key);
        return raw ? { ...EMPTY, ...(JSON.parse(raw) as Progress) } : EMPTY;
      } catch { return EMPTY; }
    },
    async save(p) {
      try { localStorage.setItem(key, JSON.stringify(p)); } catch { /* storage full / disabled */ }
    },
  };
}

interface Ctx {
  progress: Progress;
  ready: boolean;
  record: (key: string, correct: number, total: number, passPercent?: number) => void;
  markDone: (key: string) => void;
  setDraft: (key: string, text: string) => void;
  setLangPref: (l: Lang) => void;
  isDone: (key: string) => boolean;
}
const ProgressContext = createContext<Ctx | null>(null);

export function useProgress(): Ctx {
  const c = useContext(ProgressContext);
  if (!c) throw new Error('useProgress must be used inside <ProgressProvider>');
  return c;
}

export function ProgressProvider({ store, children }: { store: ProgressStore; children: ReactNode }) {
  const [progress, setProgress] = useState<Progress>(EMPTY);
  const [ready, setReady] = useState(false);
  const ref = useRef<Progress>(EMPTY);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    store.load().then(p => { if (alive) { ref.current = p; setProgress(p); setReady(true); } })
      .catch(() => alive && setReady(true));
    return () => { alive = false; };
  }, [store]);

  const update = useCallback((fn: (p: Progress) => Progress) => {
    const next = fn(ref.current);
    ref.current = next;
    setProgress(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { store.save(next).catch(() => {}); }, 400);
  }, [store]);

  const record = useCallback((key: string, correct: number, total: number, passPercent = 70) => {
    update(p => {
      const prev = p.sections[key];
      const ratio = total ? correct / total : 0;
      const prevRatio = prev && prev.total ? prev.best / prev.total : -1;
      const better = ratio > prevRatio;
      return { ...p, sections: { ...p.sections, [key]: {
        best: better ? correct : prev!.best, total: better ? total : prev!.total,
        done: Boolean(prev?.done) || ratio * 100 >= passPercent, updatedAt: Date.now(),
      } } };
    });
  }, [update]);

  const markDone = useCallback((key: string) => {
    update(p => ({ ...p, sections: { ...p.sections, [key]: { best: 1, total: 1, done: true, updatedAt: Date.now() } } }));
  }, [update]);

  const setDraft = useCallback((key: string, text: string) => update(p => ({ ...p, drafts: { ...p.drafts, [key]: text } })), [update]);
  const setLangPref = useCallback((lang: Lang) => update(p => ({ ...p, lang })), [update]);
  const isDone = useCallback((key: string) => Boolean(progress.sections[key]?.done), [progress]);

  const value = useMemo(() => ({ progress, ready, record, markDone, setDraft, setLangPref, isDone }),
    [progress, ready, record, markDone, setDraft, setLangPref, isDone]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}
