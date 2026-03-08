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
  languageLocked: boolean;
  lockLanguage: (lang: Lang) => Promise<void>;
  unlockLanguage: () => Promise<void>;
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
  languageLocked: false,
  lockLanguage: async () => {},
  unlockLanguage: async () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("klar-lang");
    return (saved === "uk" ? "uk" : "ru") as Lang;
  });

  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});
  const [editMode, setEditMode] = useState(false);
  const [languageLocked, setLanguageLocked] = useState(() => {
    return localStorage.getItem("klar-lang-locked") === "true";
  });

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

  // Load locked state from profile on auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        supabase.from("profiles").select("preferred_lang, language_locked").eq("user_id", data.user.id).single().then(({ data: prof }) => {
          if (prof) {
            const locked = !!(prof as any).language_locked;
            setLanguageLocked(locked);
            localStorage.setItem("klar-lang-locked", String(locked));
            if (locked && (prof as any).preferred_lang) {
              const savedLang = (prof as any).preferred_lang as Lang;
              setLangState(savedLang);
              localStorage.setItem("klar-lang", savedLang);
            }
          }
        });
      }
    });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("klar-lang", l);
    // Sync to profile for Telegram notifications
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        supabase.from("profiles").update({ preferred_lang: l } as any).eq("user_id", data.user.id).then(() => {});
      }
    });
  }, []);

  const lockLanguage = useCallback(async (l: Lang) => {
    setLangState(l);
    localStorage.setItem("klar-lang", l);
    setLanguageLocked(true);
    localStorage.setItem("klar-lang-locked", "true");
    const { data } = await supabase.auth.getUser();
    if (data?.user?.id) {
      await supabase.from("profiles").update({ preferred_lang: l, language_locked: true } as any).eq("user_id", data.user.id);
    }
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    const override = overrides[key]?.[lang];
    if (override) return override;
    return translations[key]?.[lang] ?? key;
  }, [lang, overrides]);

  const saveOverride = useCallback(async (key: string, lng: string, value: string) => {
    const defaultVal = (translations as any)[key]?.[lng] ?? "";
    if (value === defaultVal || value === "") {
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
    <LanguageContext.Provider value={{ lang, setLang, t, editMode, setEditMode, overrides, saveOverride, reloadOverrides: loadOverrides, languageLocked, lockLanguage, unlockLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};
