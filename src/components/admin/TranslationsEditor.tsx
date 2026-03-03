import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import translations, { Lang } from "@/i18n/translations";

const LANGS: Lang[] = ["ru", "uk"];
const LANG_LABELS: Record<Lang, string> = { ru: "🇷🇺 Русский", uk: "🇺🇦 Українська" };

const TranslationsEditor = () => {
  const keys = Object.keys(translations) as (keyof typeof translations)[];
  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [localEdits, setLocalEdits] = useState<Record<string, Record<string, string>>>({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeLang, setActiveLang] = useState<Lang>("ru");

  const loadOverrides = useCallback(async () => {
    const { data } = await supabase.from("translation_overrides").select("key, lang, value");
    const map: Record<string, Record<string, string>> = {};
    (data ?? []).forEach((row: any) => {
      if (!map[row.key]) map[row.key] = {};
      map[row.key][row.lang] = row.value;
    });
    setOverrides(map);
  }, []);

  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  const filtered = keys.filter((key) => {
    if (!search) return true;
    const s = search.toLowerCase();
    const def = translations[key][activeLang] ?? "";
    return key.toLowerCase().includes(s) || def.toLowerCase().includes(s);
  });

  const getValue = (key: string, lang: Lang): string => {
    return localEdits[key]?.[lang] ?? overrides[key]?.[lang] ?? "";
  };

  const getDefault = (key: string, lang: Lang): string => {
    return (translations as any)[key]?.[lang] ?? "";
  };

  const handleChange = (key: string, lang: Lang, value: string) => {
    setLocalEdits((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? {}), [lang]: value },
    }));
  };

  const isModified = (key: string, lang: Lang): boolean => {
    const val = getValue(key, lang);
    return val !== "" && val !== getDefault(key, lang);
  };

  const saveAll = async () => {
    setSaving(true);
    const upserts: { key: string; lang: string; value: string }[] = [];

    for (const [key, langs] of Object.entries(localEdits)) {
      for (const [lang, value] of Object.entries(langs)) {
        if (value && value !== getDefault(key, lang as Lang)) {
          upserts.push({ key, lang, value });
        }
      }
    }

    if (upserts.length > 0) {
      const { error } = await supabase.from("translation_overrides").upsert(upserts, { onConflict: "key,lang" });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(`Сохранено ${upserts.length} изменений!`);
        setLocalEdits({});
        await loadOverrides();
      }
    } else {
      toast.info("Нет изменений для сохранения");
    }
    setSaving(false);
  };

  const resetOverride = async (key: string, lang: Lang) => {
    await supabase.from("translation_overrides").delete().eq("key", key).eq("lang", lang);
    setLocalEdits((prev) => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key][lang];
        if (Object.keys(next[key]).length === 0) delete next[key];
      }
      return next;
    });
    await loadOverrides();
    toast.success("Сброшено к стандартному");
  };

  const dirty = Object.keys(localEdits).length > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Lang tabs */}
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
            {LANG_LABELS[lang]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Поиск по ключу или тексту..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} ключей · Изменённые выделены цветом. Пустое поле = стандартный текст.
      </p>

      {/* Translation list */}
      <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        {filtered.map((key) => {
          const def = getDefault(key, activeLang);
          const val = getValue(key, activeLang);
          const modified = isModified(key, activeLang) || (overrides[key]?.[activeLang] && !localEdits[key]?.[activeLang]);

          return (
            <div key={key} className={`glass-card p-3 flex flex-col gap-1.5 ${modified ? "border-primary/30" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-mono">{key}</span>
                {(overrides[key]?.[activeLang] || val) && (
                  <button
                    onClick={() => resetOverride(key, activeLang)}
                    className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-0.5"
                    title="Сбросить к стандартному"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground/70 truncate">Стандарт: {def}</p>
              <input
                value={val}
                onChange={(e) => handleChange(key, activeLang, e.target.value)}
                placeholder={def}
                className={`w-full px-3 py-2 rounded-lg bg-secondary text-foreground border text-sm focus:border-primary focus:outline-none ${
                  modified ? "border-primary/50" : "border-border"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Save */}
      {dirty && (
        <button
          onClick={saveAll}
          disabled={saving}
          className="sticky bottom-4 z-20 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all disabled:opacity-60"
        >
          {saving ? (
            <span className="animate-pulse">Сохранение...</span>
          ) : (
            <>
              <Check className="w-4 h-4" /> Сохранить изменения
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default TranslationsEditor;
