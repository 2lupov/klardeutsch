import { useState, useEffect, useCallback, useRef } from "react";

const withScroll = async (fn: () => Promise<void>) => {
  const el = document.getElementById("admin-scroll");
  const scrollTop = el?.scrollTop ?? 0;
  await fn();
  requestAnimationFrame(() => { if (el) el.scrollTop = scrollTop; });
};
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Trash2, Check, ArrowUp, ArrowDown, Play, Square, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { fetchEdgeFunction } from "@/lib/auth-fetch";

/** Button to generate & cache audio for a listening text */
const GenerateAudioButton = ({ listeningId, audioUrl, onGenerated }: { listeningId: string; audioUrl?: string | null; onGenerated: (url: string) => void }) => {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetchEdgeFunction("generate-listening-audio", { json: { listening_id: listeningId } });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Failed"); }
      const data = await res.json();
      onGenerated(data.audio_url);
      toast.success("Аудио сгенерировано и сохранено ✓");
    } catch (e: any) {
      toast.error(`Ошибка: ${e.message}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={generate}
      disabled={generating}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        audioUrl
          ? "bg-success/10 text-success border border-success/30 hover:bg-success/20"
          : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
      } disabled:opacity-50`}
      title={audioUrl ? "Перегенерировать аудио" : "Сгенерировать аудио"}
    >
      {generating ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Генерация...</>
      ) : audioUrl ? (
        <><Volume2 className="w-3.5 h-3.5" /> 🔄 Обновить аудио</>
      ) : (
        <><Volume2 className="w-3.5 h-3.5" /> 🎵 Сгенерировать аудио</>
      )}
    </button>
  );
};

/** Auto-resize textarea to fit content */
const AutoTextarea = ({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "0";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      placeholder={placeholder}
      className={className}
      style={{ overflow: "hidden" }}
    />
  );
};

/** Preview button to listen to a text snippet with a voice */
const PreviewButton = ({ text, voiceId }: { text: string; voiceId: string }) => {
  const [state, setState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setState("idle");
  };

  const play = async () => {
    if (state === "playing") { stop(); return; }
    if (!text.trim() || !voiceId) { toast.error("Укажите голос и текст"); return; }
    stop();
    setState("loading");
    try {
      const preview = text.slice(0, 200);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
          body: JSON.stringify({ text: preview, voiceId }),
        }
      );
      if (!res.ok) throw new Error("TTS error");
      const blob = await res.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onended = () => setState("idle");
      await audio.play();
      setState("playing");
    } catch {
      toast.error("Ошибка воспроизведения");
      setState("idle");
    }
  };

  useEffect(() => () => stop(), []);

  return (
    <button onClick={play} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Предпрослушивание">
      {state === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> :
       state === "playing" ? <Square className="w-3.5 h-3.5 fill-current" /> :
       <Play className="w-3.5 h-3.5" />}
    </button>
  );
};

const VOICE_OPTIONS = [
  { id: "aTTiK3YzK3dXETpuDE2h", label: "Мужской 1" },
  { id: "fmj9wTxZg3ta4xR75kgB", label: "Мужской 2" },
  { id: "6CS8keYmkwxkspesdyA7", label: "Женский 1" },
  { id: "NE7AIW5DoJ7lUosXV2KR", label: "Женский 2" },
];

const CUSTOM_ID = "__custom__";

const VoiceSelect = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => {
  const isPreset = !value || VOICE_OPTIONS.some(v => v.id === value);
  const [custom, setCustom] = useState(!isPreset);
  const [customId, setCustomId] = useState(!isPreset ? value : "");

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={custom ? CUSTOM_ID : value}
        onChange={(e) => {
          if (e.target.value === CUSTOM_ID) {
            setCustom(true);
            if (customId) onChange(customId);
          } else {
            setCustom(false);
            onChange(e.target.value);
          }
        }}
        className="px-2 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none"
      >
        <option value="">{label}: авто</option>
        <optgroup label="Мужские">
          {VOICE_OPTIONS.filter(v => v.label.startsWith("Муж")).map(v => (
            <option key={v.id} value={v.id}>{label}: {v.label}</option>
          ))}
        </optgroup>
        <optgroup label="Женские">
          {VOICE_OPTIONS.filter(v => v.label.startsWith("Жен")).map(v => (
            <option key={v.id} value={v.id}>{label}: {v.label}</option>
          ))}
        </optgroup>
        <option value={CUSTOM_ID}>Свой ID...</option>
      </select>
      {custom && (
        <input
          value={customId}
          onChange={(e) => { setCustomId(e.target.value); onChange(e.target.value); }}
          placeholder="voice ID"
          className="w-36 px-2 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs font-mono focus:border-primary focus:outline-none"
        />
      )}
    </div>
  );
};

/** Parse "A: text\nB: text" into structured lines */
function parseDialogueLines(text: string): { speaker: string; text: string }[] | null {
  if (!/^[A-Z]:\s/m.test(text)) return null;
  const lines: { speaker: string; text: string }[] = [];
  const regex = /([A-Z]):\s*(.+?)(?=(?:\n[A-Z]:\s)|$)/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match[2].trim()) lines.push({ speaker: match[1], text: match[2].trim() });
  }
  return lines.length > 0 ? lines : null;
}

/** Serialize dialogue lines back to "A: ...\nB: ..." format */
function serializeDialogueLines(linesA: string[], linesB: string[]): string {
  // Interleave A and B lines
  const result: string[] = [];
  const maxLen = Math.max(linesA.length, linesB.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < linesA.length && linesA[i].trim()) result.push(`A: ${linesA[i].trim()}`);
    if (i < linesB.length && linesB[i].trim()) result.push(`B: ${linesB[i].trim()}`);
  }
  return result.join("\n");
}

/** Split parsed lines into two arrays for A and B */
function splitDialogueToColumns(text: string): { linesA: string[]; linesB: string[] } {
  const parsed = parseDialogueLines(text);
  if (!parsed) return { linesA: [""], linesB: [""] };
  const linesA = parsed.filter(l => l.speaker === "A").map(l => l.text);
  const linesB = parsed.filter(l => l.speaker === "B").map(l => l.text);
  return { linesA: linesA.length ? linesA : [""], linesB: linesB.length ? linesB : [""] };
}

/** Dialogue column editor */
const DialogueColumn = ({ speaker, lines, onChange, voiceValue, onVoiceChange }: {
  speaker: string;
  lines: string[];
  onChange: (lines: string[]) => void;
  voiceValue: string;
  onVoiceChange: (v: string) => void;
}) => {
  const updateLine = (idx: number, value: string) => {
    const next = [...lines];
    next[idx] = value;
    onChange(next);
  };
  const addLine = () => onChange([...lines, ""]);
  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    onChange(lines.filter((_, i) => i !== idx));
  };
  const moveLine = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= lines.length) return;
    const next = [...lines];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    onChange(next);
  };

  return (
    <div className="flex-1 flex flex-col gap-2 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-sm font-bold text-primary">{speaker}</span>
        <VoiceSelect value={voiceValue} onChange={onVoiceChange} label={speaker} />
        <PreviewButton text={lines.filter(l => l.trim()).join(". ")} voiceId={voiceValue} />
      </div>
      {lines.map((line, i) => (
        <div key={i} className="flex gap-1 items-start">
          <span className="text-[10px] text-muted-foreground mt-2.5 w-4 text-right shrink-0">{i + 1}</span>
          <AutoTextarea
            value={line}
            onChange={(v) => updateLine(i, v)}
            placeholder={`Реплика ${speaker}...`}
            className="flex-1 px-2 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-none min-h-[36px]"
          />
          <div className="flex flex-col gap-0.5">
            <button onClick={() => moveLine(i, -1)} disabled={i === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20">
              <ArrowUp className="w-3 h-3" />
            </button>
            <button onClick={() => moveLine(i, 1)} disabled={i === lines.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20">
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>
          <button onClick={() => removeLine(i)} disabled={lines.length <= 1} className="p-1 text-destructive hover:bg-destructive/10 rounded disabled:opacity-20">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button onClick={addLine} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 self-start">
        <Plus className="w-3 h-3" /> Реплика
      </button>
    </div>
  );
};

const ListeningEditor = ({ level }: { level: string }) => {
  const { t } = useLanguage();
  const [texts, setTexts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingTextUpdates, setPendingTextUpdates] = useState<Map<string, Record<string, any>>>(new Map());
  const [pendingQUpdates, setPendingQUpdates] = useState<Map<string, Record<string, any>>>(new Map());
  const [pendingDictUpdates, setPendingDictUpdates] = useState<Map<string, string>>(new Map());
  // Track dialogue column state per text id
  const [dialogueStates, setDialogueStates] = useState<Map<string, { linesA: string[]; linesB: string[] }>>(new Map());
  // Track mode per text (solo / dialogue)
  const [modes, setModes] = useState<Map<string, "solo" | "dialogue">>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("listening_texts")
      .select("*, listening_questions(*), listening_dictations(*)")
      .eq("level", level)
      .order("sort_order");
    const items = data ?? [];
    setTexts(items);
    // Init modes & dialogue states from loaded data
    const newModes = new Map<string, "solo" | "dialogue">();
    const newDialogue = new Map<string, { linesA: string[]; linesB: string[] }>();
    for (const txt of items) {
      const isD = /^[A-Z]:\s/m.test(txt.text);
      newModes.set(txt.id, isD ? "dialogue" : "solo");
      if (isD) {
        newDialogue.set(txt.id, splitDialogueToColumns(txt.text));
      }
    }
    setModes(newModes);
    setDialogueStates(newDialogue);
    setLoading(false);
    setDirty(false);
    setPendingTextUpdates(new Map());
    setPendingQUpdates(new Map());
    setPendingDictUpdates(new Map());
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const trackTextChange = (id: string, updates: Record<string, any>) => {
    setPendingTextUpdates((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id), ...updates });
      return next;
    });
    setTexts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setDirty(true);
  };

  const trackQChange = (id: string, updates: Record<string, any>) => {
    setPendingQUpdates((prev) => {
      const next = new Map(prev);
      next.set(id, { ...next.get(id), ...updates });
      return next;
    });
    setDirty(true);
  };

  const trackDictChange = (id: string, sentence: string) => {
    setPendingDictUpdates((prev) => {
      const next = new Map(prev);
      next.set(id, sentence);
      return next;
    });
    setDirty(true);
  };

  const updateVoiceConfig = (txtId: string, currentVc: Record<string, string> | null, key: string, value: string) => {
    const newVc = { ...(currentVc ?? {}), [key]: value || undefined } as Record<string, any>;
    Object.keys(newVc).forEach(k => { if (!newVc[k]) delete newVc[k]; });
    trackTextChange(txtId, { voice_config: Object.keys(newVc).length ? newVc : null });
  };

  const updateDialogueColumn = (txtId: string, speaker: "A" | "B", lines: string[]) => {
    setDialogueStates(prev => {
      const next = new Map(prev);
      const current = next.get(txtId) ?? { linesA: [""], linesB: [""] };
      const updated = speaker === "A" ? { ...current, linesA: lines } : { ...current, linesB: lines };
      next.set(txtId, updated);
      // Serialize and track as text change
      const serialized = serializeDialogueLines(updated.linesA, updated.linesB);
      trackTextChange(txtId, { text: serialized });
      return next;
    });
  };

  const setMode = (txtId: string, mode: "solo" | "dialogue") => {
    setModes(prev => {
      const next = new Map(prev);
      next.set(txtId, mode);
      return next;
    });
    if (mode === "dialogue") {
      const txt = texts.find(t => t.id === txtId);
      const existing = splitDialogueToColumns(txt?.text ?? "");
      // If switching from solo, put the text as first line of A
      if (existing.linesA.length === 1 && !existing.linesA[0] && txt?.text && !/^[A-Z]:\s/m.test(txt.text)) {
        existing.linesA = [txt.text];
      }
      setDialogueStates(prev => {
        const next = new Map(prev);
        next.set(txtId, existing);
        return next;
      });
      // Serialize immediately
      const serialized = serializeDialogueLines(existing.linesA, existing.linesB);
      trackTextChange(txtId, { text: serialized });
    }
  };

  const saveAll = async () => {
    setSaving(true);
    const promises: PromiseLike<any>[] = [];
    for (const [id, updates] of pendingTextUpdates.entries()) {
      promises.push(supabase.from("listening_texts").update(updates).eq("id", id).then());
    }
    for (const [id, updates] of pendingQUpdates.entries()) {
      promises.push(supabase.from("listening_questions").update(updates).eq("id", id).then());
    }
    for (const [id, sentence] of pendingDictUpdates.entries()) {
      promises.push(supabase.from("listening_dictations").update({ sentence }).eq("id", id).then());
    }
    await Promise.all(promises);
    setDirty(false);
    setPendingTextUpdates(new Map());
    setPendingQUpdates(new Map());
    setPendingDictUpdates(new Map());
    setSaving(false);
    toast.success(t("saved"));
  };

  const addText = async (mode: "solo" | "dialogue") => {
    const text = mode === "dialogue" ? "A: Hallo!\nB: Hallo!" : "Text hier...";
    const { data } = await supabase.from("listening_texts").insert([{
      level, title: mode === "dialogue" ? "Neuer Dialog" : "Neuer Hörtext", text, sort_order: texts.length + 1,
    }]).select().single();
    if (data) {
      setModes(prev => { const n = new Map(prev); n.set(data.id, mode); return n; });
      if (mode === "dialogue") {
        setDialogueStates(prev => { const n = new Map(prev); n.set(data.id, { linesA: ["Hallo!"], linesB: ["Hallo!"] }); return n; });
      }
    }
    withScroll(load);
  };

  const deleteText = async (id: string) => {
    await supabase.from("listening_texts").delete().eq("id", id);
    withScroll(load);
  };

  const addQuestion = async (listeningId: string, count: number) => {
    await supabase.from("listening_questions").insert([{
      listening_id: listeningId, question: t("newQuestion"), options: ["A", "B", "C", "D"], correct_index: 0, sort_order: count + 1,
    }]);
    withScroll(load);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("listening_questions").delete().eq("id", id);
    withScroll(load);
  };

  const addDictation = async (listeningId: string, count: number) => {
    await supabase.from("listening_dictations").insert([{
      listening_id: listeningId, sentence: "Neuer Satz zum Diktieren", sort_order: count + 1,
    }]);
    withScroll(load);
  };

  const deleteDictation = async (id: string) => {
    await supabase.from("listening_dictations").delete().eq("id", id);
    withScroll(load);
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-4" onFocus={(e) => { const t = e.target as HTMLElement; if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') (t as HTMLInputElement).select(); }}>
      {texts.map((txt) => {
        const mode = modes.get(txt.id) ?? "solo";
        const isDialogue = mode === "dialogue";
        const vc = txt.voice_config ?? {};
        const dState = dialogueStates.get(txt.id) ?? { linesA: [""], linesB: [""] };

        return (
          <div key={txt.id} className="glass-card p-4 flex flex-col gap-3">
            {/* Header */}
            <div className="flex gap-2 items-start">
              <input
                defaultValue={txt.title}
                onChange={(e) => trackTextChange(txt.id, { title: e.target.value })}
                placeholder={t("title")}
                className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm font-semibold focus:border-primary focus:outline-none"
              />
              <input
                defaultValue={txt.topic ?? "Allgemein"}
                onChange={(e) => trackTextChange(txt.id, { topic: e.target.value })}
                placeholder={t("topic")}
                className="w-28 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
              />
              {/* Mode toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden text-xs shrink-0">
                <button
                  onClick={() => setMode(txt.id, "solo")}
                  className={`px-3 py-2 transition-colors ${!isDialogue ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  🎙️ Соло
                </button>
                <button
                  onClick={() => setMode(txt.id, "dialogue")}
                  className={`px-3 py-2 transition-colors ${isDialogue ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  💬 Диалог
                </button>
              </div>
              <button onClick={() => deleteText(txt.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {/* Generate audio button */}
            <div className="flex items-center gap-2">
              <GenerateAudioButton
                listeningId={txt.id}
                audioUrl={txt.audio_url}
                onGenerated={(url) => {
                  setTexts(prev => prev.map(t => t.id === txt.id ? { ...t, audio_url: url } : t));
                }}
              />
              {txt.audio_url && (
                <span className="text-[10px] text-success">✓ Аудио закэшировано</span>
              )}
            </div>

            {/* Content area */}
            {isDialogue ? (
              <div className="flex gap-3">
                <DialogueColumn
                  speaker="A"
                  lines={dState.linesA}
                  onChange={(lines) => updateDialogueColumn(txt.id, "A", lines)}
                  voiceValue={vc["A"] ?? ""}
                  onVoiceChange={(v) => updateVoiceConfig(txt.id, vc, "A", v)}
                />
                <div className="w-px bg-border shrink-0" />
                <DialogueColumn
                  speaker="B"
                  lines={dState.linesB}
                  onChange={(lines) => updateDialogueColumn(txt.id, "B", lines)}
                  voiceValue={vc["B"] ?? ""}
                  onVoiceChange={(v) => updateVoiceConfig(txt.id, vc, "B", v)}
                />
              </div>
            ) : (
              <>
                <textarea
                  defaultValue={txt.text}
                  onChange={(e) => trackTextChange(txt.id, { text: e.target.value })}
                  rows={4}
                  placeholder="Hörtext..."
                  className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y"
                />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">🎙️ Голос:</span>
                  <VoiceSelect
                    value={vc["narrator"] ?? ""}
                    onChange={(v) => updateVoiceConfig(txt.id, vc, "narrator", v)}
                    label="Голос"
                  />
                  <PreviewButton text={txt.text} voiceId={vc["narrator"] ?? ""} />
                </div>
              </>
            )}

            {/* Questions */}
            <p className="text-xs text-muted-foreground font-display">{t("questions")}:</p>
            {(txt.listening_questions ?? [])
              .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((q: any) => (
                <div key={q.id} className="ml-2 border-l-2 border-border pl-3 flex flex-col gap-1.5">
                  <div className="flex gap-2 items-start">
                    <input defaultValue={q.question} onChange={(e) => trackQChange(q.id, { question: e.target.value })} className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
                    <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {q.options.map((opt: string, i: number) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input type="radio" name={`lq-correct-${q.id}`} checked={q.correct_index === i} onChange={() => trackQChange(q.id, { correct_index: i })} className="accent-primary" />
                      <input defaultValue={opt} onChange={(e) => { const newOpts = [...q.options]; newOpts[i] = e.target.value; trackQChange(q.id, { options: newOpts }); }} className="flex-1 px-3 py-1 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
                    </div>
                  ))}
                </div>
              ))}
            <button onClick={() => addQuestion(txt.id, txt.listening_questions?.length ?? 0)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-2">
              <Plus className="w-3 h-3" /> {t("addQuestion")}
            </button>

            {/* Dictations */}
            <p className="text-xs text-muted-foreground font-display mt-2">{t("listenDictation")}:</p>
            {(txt.listening_dictations ?? [])
              .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
              .map((d: any) => (
                <div key={d.id} className="ml-2 border-l-2 border-primary/30 pl-3 flex gap-2 items-center">
                  <input
                    defaultValue={d.sentence}
                    onChange={(e) => trackDictChange(d.id, e.target.value)}
                    placeholder="Satz..."
                    className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
                  />
                  <button onClick={() => deleteDictation(d.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            <button onClick={() => addDictation(txt.id, txt.listening_dictations?.length ?? 0)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-2">
              <Plus className="w-3 h-3" /> Добавить предложение
            </button>
          </div>
        );
      })}

      {/* Add buttons */}
      <div className="flex gap-3">
        <button onClick={() => addText("solo")} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
          <Plus className="w-4 h-4" /> 🎙️ Соло-текст
        </button>
        <button onClick={() => addText("dialogue")} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
          <Plus className="w-4 h-4" /> 💬 Диалог
        </button>
      </div>

      {dirty && (
        <button
          onClick={saveAll}
          disabled={saving}
          className="sticky bottom-4 z-20 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all disabled:opacity-60"
        >
          {saving ? (
            <span className="animate-pulse">{t("loading")}</span>
          ) : (
            <>
              <Check className="w-4 h-4" /> {t("saveChanges")}
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ListeningEditor;
