import { useState, useEffect, useCallback } from "react";

const withScroll = async (fn: () => Promise<void>) => {
  const el = document.getElementById("admin-scroll");
  const scrollTop = el?.scrollTop ?? 0;
  await fn();
  requestAnimationFrame(() => { if (el) el.scrollTop = scrollTop; });
};
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

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

/** Parse dialogue text into structured lines */
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

const ListeningEditor = ({ level }: { level: string }) => {
  const { t } = useLanguage();
  const [texts, setTexts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingTextUpdates, setPendingTextUpdates] = useState<Map<string, Record<string, any>>>(new Map());
  const [pendingQUpdates, setPendingQUpdates] = useState<Map<string, Record<string, any>>>(new Map());
  const [pendingDictUpdates, setPendingDictUpdates] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("listening_texts")
      .select("*, listening_questions(*), listening_dictations(*)")
      .eq("level", level)
      .order("sort_order");
    setTexts(data ?? []);
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
    // Also update local state for immediate UI feedback
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

  const addText = async () => {
    await supabase.from("listening_texts").insert([{
      level, title: "Neuer Hörtext", text: "Text hier...", sort_order: texts.length + 1,
    }]);
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
        const dialogueLines = parseDialogueLines(txt.text);
        const isDialogue = !!dialogueLines;
        const vc = txt.voice_config ?? {};
        
        return (
          <div key={txt.id} className="glass-card p-4 flex flex-col gap-3">
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
              <button onClick={() => deleteText(txt.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Text area */}
            <textarea
              defaultValue={txt.text}
              onChange={(e) => trackTextChange(txt.id, { text: e.target.value })}
              rows={4}
              placeholder="Hörtext..."
              className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y"
            />

            {/* Voice configuration */}
            {isDialogue ? (
              <>
                {/* Dialogue: show parsed lines grouped by speaker */}
                {(() => {
                  const speakers = [...new Set(dialogueLines!.map(l => l.speaker))];
                  return (
                    <div className="flex flex-col gap-2">
                      <span className="text-xs text-muted-foreground font-display">🎙️ Голоса диалога:</span>
                      {speakers.map(speaker => {
                        const speakerLines = dialogueLines!.filter(l => l.speaker === speaker);
                        return (
                          <div key={speaker} className="ml-2 border-l-2 border-primary/30 pl-3 flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-primary w-5">{speaker}:</span>
                              <VoiceSelect
                                value={vc[speaker] ?? ""}
                                onChange={(v) => updateVoiceConfig(txt.id, vc, speaker, v)}
                                label={speaker}
                              />
                            </div>
                            <div className="flex flex-col gap-0.5">
                              {speakerLines.map((line, i) => (
                                <p key={i} className="text-[11px] text-muted-foreground pl-7 truncate">
                                  «{line.text}»
                                </p>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            ) : (
              /* Non-dialogue: single narrator voice */
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">🎙️ Голос:</span>
                <VoiceSelect
                  value={vc["narrator"] ?? ""}
                  onChange={(v) => updateVoiceConfig(txt.id, vc, "narrator", v)}
                  label="Голос"
                />
              </div>
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
      <button onClick={addText} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
        <Plus className="w-4 h-4" /> Добавить аудио-текст
      </button>
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
