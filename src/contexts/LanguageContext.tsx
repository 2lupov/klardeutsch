import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import translations, { Lang, TranslationKey } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "ru",
  setLang: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("klar-lang");
    return (saved === "uk" ? "uk" : "ru") as Lang;
  });

  const [overrides, setOverrides] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("translation_overrides").select("key, lang, value");
      if (data) {
        const map: Record<string, Record<string, string>> = {};
        data.forEach((row: any) => {
          if (!map[row.key]) map[row.key] = {};
          map[row.key][row.lang] = row.value;
        });
        setOverrides(map);
      }
    };
    load();
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("klar-lang", l);
  }, []);

  const t = useCallback((key: TranslationKey): string => {
    // Check overrides first
    const override = overrides[key]?.[lang];
    if (override) return override;
    return translations[key]?.[lang] ?? key;
  }, [lang, overrides]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
