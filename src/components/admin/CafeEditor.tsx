import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Trash2, Check, ChevronDown, ChevronUp, Coffee } from "lucide-react";
import { toast } from "sonner";

interface CafeOption {
  text: string;
  type: "perfect" | "formal" | "rude";
  feedback_ru: string;
  feedback_uk: string;
}

interface CafeScenario {
  id: string;
  barista_line: string;
  hint_ru: string;
  hint_uk: string;
  options: CafeOption[];
  timer_sec: number;
  level: string;
  sort_order: number;
}

const CafeEditor = ({ level }: { level: string }) => {
  const { t } = useLanguage();
  const [scenarios, setScenarios] = useState<CafeScenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, Record<string, any>>>(new Map());

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cafe_scenarios")
      .select("*")
      .eq("level", level)
      .order("sort_order");
    setScenarios((data as unknown as CafeScenario[]) ?? []);
    setLoading(false);
    setDirty(false);
    setPendingUpdates(new Map());
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const track = (id: string, updates: Record<string, any>) => {
    setPendingUpdates(prev => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), ...updates });
      return next;
    });
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    const promises = Array.from(pendingUpdates.entries()).map(([id, updates]) =>
      supabase.from("cafe_scenarios").update(updates).eq("id", id)
    );
    await Promise.all(promises);
    setPendingUpdates(new Map());
    setDirty(false);
    setSaving(false);
    toast.success("Сохранено!");
    load();
  };

  const addScenario = async () => {
    await supabase.from("cafe_scenarios").insert([{
      level,
      barista_line: "Neue Frage?",
      hint_ru: "Подсказка",
      hint_uk: "Підказка",
      options: [
        { text: "Perfekte Antwort", type: "perfect", feedback_ru: "Отлично!", feedback_uk: "Чудово!" },
        { text: "Formelle Antwort", type: "formal", feedback_ru: "Слишком формально", feedback_uk: "Занадто формально" },
        { text: "Grob.", type: "rude", feedback_ru: "Грубо!", feedback_uk: "Грубо!" },
      ],
      timer_sec: 10,
      sort_order: scenarios.length + 1,
    }]);
    load();
  };

  const deleteScenario = async (id: string) => {
    await supabase.from("cafe_scenarios").delete().eq("id", id);
    load();
  };

  const updateOption = (scenarioId: string, scenario: CafeScenario, optIdx: number, field: string, value: string) => {
    const currentOptions = pendingUpdates.get(scenarioId)?.options ?? scenario.options;
    const newOptions = [...currentOptions];
    newOptions[optIdx] = { ...newOptions[optIdx], [field]: value };
    track(scenarioId, { options: newOptions });
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 mb-1">
        <Coffee className="w-4 h-4 text-primary" />
        <span className="text-sm font-display font-semibold text-foreground">
          Café Bestellung — {scenarios.length} сценариев
        </span>
      </div>

      {scenarios.map((s) => {
        const isOpen = expanded.has(s.id);
        return (
          <div key={s.id} className="glass-card p-4 flex flex-col gap-2">
            {/* Header */}
            <div className="flex items-center gap-2">
              <button onClick={() => toggle(s.id)} className="p-1 text-muted-foreground hover:text-foreground">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <input
                defaultValue={s.barista_line}
                onChange={(e) => track(s.id, { barista_line: e.target.value })}
                placeholder="Фраза бармена (DE)"
                className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm font-semibold focus:border-primary focus:outline-none"
              />
              <input
                type="number"
                defaultValue={s.timer_sec}
                onChange={(e) => track(s.id, { timer_sec: parseInt(e.target.value) || 10 })}
                className="w-16 px-2 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm text-center focus:border-primary focus:outline-none"
                title="Таймер (сек)"
              />
              <button onClick={() => deleteScenario(s.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {isOpen && (
              <>
                {/* Hints */}
                <div className="flex gap-2 ml-7">
                  <input
                    defaultValue={s.hint_ru}
                    onChange={(e) => track(s.id, { hint_ru: e.target.value })}
                    placeholder="Подсказка RU"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none"
                  />
                  <input
                    defaultValue={s.hint_uk}
                    onChange={(e) => track(s.id, { hint_uk: e.target.value })}
                    placeholder="Підказка UK"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none"
                  />
                </div>

                {/* Options */}
                {s.options.map((opt, i) => {
                  const typeColor = opt.type === "perfect" ? "border-green-500/40" : opt.type === "formal" ? "border-yellow-500/40" : "border-red-500/40";
                  const typeEmoji = opt.type === "perfect" ? "✅" : opt.type === "formal" ? "🤓" : "😬";
                  return (
                    <div key={i} className={`ml-7 border-l-2 ${typeColor} pl-3 flex flex-col gap-1`}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{typeEmoji}</span>
                        <select
                          defaultValue={opt.type}
                          onChange={(e) => updateOption(s.id, s, i, "type", e.target.value)}
                          className="px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none"
                        >
                          <option value="perfect">perfect</option>
                          <option value="formal">formal</option>
                          <option value="rude">rude</option>
                        </select>
                        <input
                          defaultValue={opt.text}
                          onChange={(e) => updateOption(s.id, s, i, "text", e.target.value)}
                          placeholder="Ответ (DE)"
                          className="flex-1 px-3 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none"
                        />
                      </div>
                      <div className="flex gap-2 pl-5">
                        <input
                          defaultValue={opt.feedback_ru}
                          onChange={(e) => updateOption(s.id, s, i, "feedback_ru", e.target.value)}
                          placeholder="Фидбек RU"
                          className="flex-1 px-2 py-1 rounded-lg bg-secondary text-foreground border border-border text-[11px] focus:border-primary focus:outline-none"
                        />
                        <input
                          defaultValue={opt.feedback_uk}
                          onChange={(e) => updateOption(s.id, s, i, "feedback_uk", e.target.value)}
                          placeholder="Фідбек UK"
                          className="flex-1 px-2 py-1 rounded-lg bg-secondary text-foreground border border-border text-[11px] focus:border-primary focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        );
      })}

      <button onClick={addScenario} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
        <Plus className="w-4 h-4" /> Добавить сценарий
      </button>

      {dirty && (
        <button
          onClick={saveAll}
          disabled={saving}
          className="sticky bottom-4 z-20 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all disabled:opacity-60"
        >
          {saving ? <span className="animate-pulse">{t("loading")}</span> : <><Check className="w-4 h-4" /> Сохранить</>}
        </button>
      )}
    </div>
  );
};

export default CafeEditor;
