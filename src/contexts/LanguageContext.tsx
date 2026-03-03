import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import translations, { Lang, TranslationKey } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
  overrides: Record<string, Record<string, string>>;
  saveOverride: (key: string, lang: string, value: string) => Promise<void>;
  reloadOverrides: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ru",
  setLang: () => {},
  t: (key) => key,
  editMode: false,
  setEditMode: () => {},
  overrides: {},
  saveOverride: async () => {},
  reloadOverrides: async () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("klar-lang");
    return (saved === "uk" ? "uk" : "ru") as Lang;
  });

  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [editMode, setEditMode] = useState(false);

  const loadOverrides = useCallback(async () => {
    const { data } = await supabase.from("translation_overrides").select("key, lang, value");
    if (data) {
      const map: Record<string, Record<string, string>> = {};
      data.forEach((row: any) => {
        if (!map[row.key]) map[row.key] = {};
        map[row.key][row.lang] = row.value;
      });
      setOverrides(map);
    }
  }, []);

  useEffect(() => { loadOverrides(); }, [loadOverrides]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("klar-lang", l);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const override = overrides[key]?.[lang];
    if (override) return override;
    return translations[key]?.[lang] ?? key;
  }, [lang, overrides]);

  const saveOverride = useCallback(async (key: string, lng: string, value: string) => {
    const defaultVal = (translations as any)[key]?.[lng] ?? "";
    if (value === defaultVal || value === "") {
      // Remove override, revert to default
      await supabase.from("translation_overrides").delete().eq("key", key).eq("lang", lng);
    } else {
      await supabase.from("translation_overrides").upsert(
        { key, lang: lng, value, updated_at: new Date().toISOString() },
        { onConflict: "key,lang" }
      );
    }
    await loadOverrides();
  }, [loadOverrides]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, editMode, setEditMode, overrides, saveOverride, reloadOverrides: loadOverrides }}>
      {children}
    </LanguageContext.Provider>
  );
};
