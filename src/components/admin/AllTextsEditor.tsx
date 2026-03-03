import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Check, BookOpen, Languages, Gamepad2, Globe, BookText, Headphones, Filter } from "lucide-react";
import { toast } from "sonner";
import translations, { Lang } from "@/i18n/translations";

type TextSource = "ui" | "vocab" | "grammar" | "cafe" | "reading" | "listening";

interface TextEntry {
  source: TextSource;
  id: string;
  field: string;
  label: string;
  value: string;
  context?: string; // e.g. level, key name
}

const SOURCE_CONFIG: { key: TextSource; icon: React.ElementType; label: string; color: string }[] = [
  { key: "ui", icon: Globe, label: "UI переводы", color: "text-blue-400" },
  { key: "vocab", icon: BookOpen, label: "Словарь", color: "text-emerald-400" },
  { key: "grammar", icon: Languages, label: "Грамматика", color: "text-amber-400" },
  { key: "cafe", icon: Gamepad2, label: "Кафе", color: "text-pink-400" },
  { key: "reading", icon: BookText, label: "Чтение", color: "text-purple-400" },
  { key: "listening", icon: Headphones, label: "Аудирование", color: "text-cyan-400" },
];

const LANGS: Lang[] = ["ru", "uk"];

const AllTextsEditor = () => {
  const [entries, setEntries] = useState<TextEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeLang, setActiveLang] = useState<Lang>("ru");
  const [activeSource, setActiveSource] = useState<TextSource | "all">("all");
  const [edits, setEdits] = useState<Map<string, string>>(new Map());
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const allEntries: TextEntry[] = [];

    // 1. UI translations
    const keys = Object.keys(translations) as (keyof typeof translations)[];
    const { data: overrides } = await supabase.from("translation_overrides").select("key, lang, value");
    const overrideMap: Record<string, Record<string, string>> = {};
    (overrides ?? []).forEach((row: any) => {
      if (!overrideMap[row.key]) overrideMap[row.key] = {};
      overrideMap[row.key][row.lang] = row.value;
    });

    for (const key of keys) {
      const def = (translations as any)[key]?.[activeLang] ?? "";
      const override = overrideMap[key]?.[activeLang];
      allEntries.push({
        source: "ui",
        id: key,
        field: activeLang,
        label: key,
        value: override ?? def,
        context: override ? "✏️ изменено" : "стандарт",
      });
    }

    // 2. Vocab cards
    const { data: vocab } = await supabase.from("vocab_cards").select("id, german, russian, ukrainian, article, level, topic").order("level").limit(1000);
    for (const card of vocab ?? []) {
      allEntries.push({
        source: "vocab",
        id: card.id,
        field: "german",
        label: `🇩🇪 ${card.german}`,
        value: card.german,
        context: `${card.level} · ${card.topic}`,
      });
      if (activeLang === "ru") {
        allEntries.push({
          source: "vocab",
          id: card.id,
          field: "russian",
          label: `🇷🇺 ${card.german} →`,
          value: card.russian,
          context: `${card.level} · ${card.topic}`,
        });
      } else {
        allEntries.push({
          source: "vocab",
          id: card.id,
          field: "ukrainian",
          label: `🇺🇦 ${card.german} →`,
          value: (card as any).ukrainian ?? "",
          context: `${card.level} · ${card.topic}`,
        });
      }
    }

    // 3. Grammar questions
    const { data: grammar } = await supabase.from("grammar_questions").select("id, question, explanation, level, topic, options").order("level").limit(500);
    for (const q of grammar ?? []) {
      allEntries.push({
        source: "grammar",
        id: q.id,
        field: "question",
        label: `❓ Вопрос`,
        value: q.question,
        context: `${q.level} · ${q.topic}`,
      });
      if (q.explanation) {
        allEntries.push({
          source: "grammar",
          id: q.id,
          field: "explanation",
          label: `💡 Объяснение`,
          value: q.explanation,
          context: `${q.level} · ${q.topic}`,
        });
      }
      // Options
      if (Array.isArray(q.options)) {
        q.options.forEach((opt: string, i: number) => {
          allEntries.push({
            source: "grammar",
            id: q.id,
            field: `option_${i}`,
            label: `Вариант ${i + 1}`,
            value: opt,
            context: `${q.level} · ${q.question.substring(0, 30)}...`,
          });
        });
      }
    }

    // 4. Cafe scenarios
    const { data: cafe } = await supabase.from("cafe_scenarios").select("id, barista_line, hint_ru, hint_uk, level, options").order("level").limit(200);
    for (const c of cafe ?? []) {
      allEntries.push({
        source: "cafe",
        id: c.id,
        field: "barista_line",
        label: `🇩🇪 Бариста`,
        value: c.barista_line,
        context: c.level,
      });
      allEntries.push({
        source: "cafe",
        id: c.id,
        field: "hint_ru",
        label: `🇷🇺 Подсказка`,
        value: c.hint_ru,
        context: c.level,
      });
      allEntries.push({
        source: "cafe",
        id: c.id,
        field: "hint_uk",
        label: `🇺🇦 Підказка`,
        value: c.hint_uk,
        context: c.level,
      });
    }

    // 5. Reading texts
    const { data: reading } = await supabase.from("reading_texts").select("id, title, text, level, topic").order("level").limit(100);
    for (const r of reading ?? []) {
      allEntries.push({
        source: "reading",
        id: r.id,
        field: "title",
        label: `📖 Заголовок`,
        value: r.title,
        context: `${r.level} · ${r.topic}`,
      });
      allEntries.push({
        source: "reading",
        id: r.id,
        field: "text",
        label: `📖 Текст`,
        value: r.text,
        context: `${r.level} · ${r.title.substring(0, 30)}`,
      });
    }

    // 6. Listening texts
    const { data: listening } = await supabase.from("listening_texts").select("id, title, text, level, topic").order("level").limit(100);
    for (const l of listening ?? []) {
      allEntries.push({
        source: "listening",
        id: l.id,
        field: "title",
        label: `🎧 Заголовок`,
        value: l.title,
        context: `${l.level} · ${l.topic}`,
      });
      allEntries.push({
        source: "listening",
        id: l.id,
        field: "text",
        label: `🎧 Текст`,
        value: l.text,
        context: `${l.level} · ${l.title.substring(0, 30)}`,
      });
    }

    setEntries(allEntries);
    setLoading(false);
  }, [activeLang]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const editKey = (entry: TextEntry) => `${entry.source}::${entry.id}::${entry.field}`;

  const getDisplayValue = (entry: TextEntry) => {
    const key = editKey(entry);
    return edits.has(key) ? edits.get(key)! : entry.value;
  };

  const handleChange = (entry: TextEntry, value: string) => {
    setEdits((prev) => {
      const next = new Map(prev);
      if (value === entry.value) {
        next.delete(editKey(entry));
      } else {
        next.set(editKey(entry), value);
      }
      return next;
    });
  };

  const filtered = entries.filter((e) => {
    if (activeSource !== "all" && e.source !== activeSource) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      e.value.toLowerCase().includes(s) ||
      e.label.toLowerCase().includes(s) ||
      e.id.toLowerCase().includes(s) ||
      (e.context?.toLowerCase().includes(s) ?? false)
    );
  });

  const saveAll = async () => {
    if (edits.size === 0) return;
    setSaving(true);

    let errorCount = 0;
    let successCount = 0;

    for (const [compositeKey, newValue] of edits.entries()) {
      const [source, id, field] = compositeKey.split("::");
      let error: any = null;

      if (source === "ui") {
        const defaultVal = (translations as any)[id]?.[field] ?? "";
        if (newValue === defaultVal || newValue === "") {
          const res = await supabase.from("translation_overrides").delete().eq("key", id).eq("lang", field);
          error = res.error;
        } else {
          const res = await supabase.from("translation_overrides").upsert(
            { key: id, lang: field, value: newValue, updated_at: new Date().toISOString() },
            { onConflict: "key,lang" }
          );
          error = res.error;
        }
      } else if (source === "vocab") {
        const res = await supabase.from("vocab_cards").update({ [field]: newValue }).eq("id", id);
        error = res.error;
      } else if (source === "grammar") {
        if (field.startsWith("option_")) {
          const idx = parseInt(field.split("_")[1]);
          const { data } = await supabase.from("grammar_questions").select("options").eq("id", id).single();
          if (data) {
            const opts = [...(data.options as string[])];
            opts[idx] = newValue;
            const res = await supabase.from("grammar_questions").update({ options: opts }).eq("id", id);
            error = res.error;
          }
        } else {
          const res = await supabase.from("grammar_questions").update({ [field]: newValue }).eq("id", id);
          error = res.error;
        }
      } else if (source === "cafe") {
        const res = await supabase.from("cafe_scenarios").update({ [field]: newValue }).eq("id", id);
        error = res.error;
      } else if (source === "reading") {
        const res = await supabase.from("reading_texts").update({ [field]: newValue }).eq("id", id);
        error = res.error;
      } else if (source === "listening") {
        const res = await supabase.from("listening_texts").update({ [field]: newValue }).eq("id", id);
        error = res.error;
      }

      if (error) {
        console.error(`Ошибка сохранения ${compositeKey}:`, error);
        errorCount++;
      } else {
        successCount++;
      }
    }

    if (errorCount > 0) {
      toast.error(`Ошибка: ${errorCount} из ${edits.size} не сохранились. Проверьте, что вы вошли как админ.`);
    } else {
      toast.success(`Сохранено ${successCount} изменений!`);
      setEdits(new Map());
    }
    setSaving(false);
    loadAll();
  };

  if (loading) return <p className="text-muted-foreground animate-pulse">Загрузка всех текстов...</p>;

  return (
    <div className="flex flex-col gap-4">
      {/* Lang selector for UI translations */}
      <div className="flex gap-2">
        {LANGS.map((lang) => (
          <button
            key={lang}
            onClick={() => setActiveLang(lang)}
            className={`px-4 py-2 rounded-xl text-sm font-display font-medium transition-all ${
              activeLang === lang
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {lang === "ru" ? "🇷🇺 Русский" : "🇺🇦 Українська"}
          </button>
        ))}
      </div>

      {/* Source filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setActiveSource("all")}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeSource === "all"
              ? "bg-card border border-primary/50 text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-card/50"
          }`}
        >
          <Filter className="w-3 h-3" /> Все ({entries.length})
        </button>
        {SOURCE_CONFIG.map(({ key, icon: Icon, label, color }) => {
          const count = entries.filter(e => e.source === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveSource(key)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSource === key
                  ? "bg-card border border-primary/50 text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              <Icon className={`w-3 h-3 ${color}`} /> {label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по любому тексту, ключу, уровню..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Показано {filtered.length} из {entries.length} текстов · {edits.size > 0 && <span className="text-primary font-semibold">{edits.size} изменений</span>}
      </p>

      {/* Entries list */}
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        {filtered.slice(0, 100).map((entry) => {
          const key = editKey(entry);
          const isEdited = edits.has(key);
          const cfg = SOURCE_CONFIG.find(s => s.key === entry.source);
          const isLongText = entry.value.length > 100;

          return (
            <div
              key={key}
              className={`glass-card p-3 flex flex-col gap-1.5 ${isEdited ? "border-primary/40 bg-primary/5" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  {cfg && <cfg.icon className={`w-3 h-3 flex-shrink-0 ${cfg.color}`} />}
                  <span className="text-[11px] font-medium text-foreground truncate">{entry.label}</span>
                </div>
                <span className="text-[9px] text-muted-foreground flex-shrink-0">{entry.context}</span>
              </div>
              {isLongText ? (
                <textarea
                  value={getDisplayValue(entry)}
                  onChange={(e) => handleChange(entry, e.target.value)}
                  rows={3}
                  className={`w-full px-3 py-2 rounded-lg bg-secondary text-foreground border text-sm focus:border-primary focus:outline-none resize-y ${
                    isEdited ? "border-primary/50" : "border-border"
                  }`}
                />
              ) : (
                <input
                  value={getDisplayValue(entry)}
                  onChange={(e) => handleChange(entry, e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg bg-secondary text-foreground border text-sm focus:border-primary focus:outline-none ${
                    isEdited ? "border-primary/50" : "border-border"
                  }`}
                />
              )}
            </div>
          );
        })}
        {filtered.length > 100 && (
          <p className="text-xs text-center text-muted-foreground py-4">
            Показаны первые 100 результатов. Используйте поиск для уточнения.
          </p>
        )}
      </div>

      {/* Save */}
      {edits.size > 0 && (
        <button
          onClick={saveAll}
          disabled={saving}
          className="sticky bottom-4 z-20 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all disabled:opacity-60"
        >
          {saving ? (
            <span className="animate-pulse">Сохранение...</span>
          ) : (
            <>
              <Check className="w-4 h-4" /> Сохранить {edits.size} изменений
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default AllTextsEditor;
