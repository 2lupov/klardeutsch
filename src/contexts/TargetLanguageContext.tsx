import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type TargetLang = "de" | "en" | "pl" | "es" | "fr";

export interface LanguageMeta {
  code: TargetLang;
  name_en: string;
  name_ru: string;
  name_uk: string;
  name_native: string;
  flag_emoji: string;
  sort_order: number;
  is_active: boolean;
}

interface Ctx {
  targetLang: TargetLang;
  setTargetLang: (lang: TargetLang) => Promise<void>;
  languages: LanguageMeta[];
  activeLanguages: LanguageMeta[];
  loading: boolean;
}

const TargetLanguageContext = createContext<Ctx>({
  targetLang: "de",
  setTargetLang: async () => {},
  languages: [],
  activeLanguages: [],
  loading: true,
});

export const useTargetLanguage = () => useContext(TargetLanguageContext);

const STORAGE_KEY = "klar-target-lang";

const isValidLang = (v: string | null): v is TargetLang =>
  v === "de" || v === "en" || v === "pl" || v === "es" || v === "fr";

export const TargetLanguageProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [languages, setLanguages] = useState<LanguageMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetLang, setTargetLangState] = useState<TargetLang>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isValidLang(saved) ? saved : "de";
  });

  // Load list of languages
  useEffect(() => {
    supabase
      .from("languages")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (data) setLanguages(data as LanguageMeta[]);
        setLoading(false);
      });
  }, []);

  // Sync from profile when user logs in
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("active_target_language")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const lang = (data as any)?.active_target_language;
        if (isValidLang(lang)) {
          setTargetLangState(lang);
          localStorage.setItem(STORAGE_KEY, lang);
        }
      });
  }, [user]);

  const setTargetLang = useCallback(
    async (lang: TargetLang) => {
      setTargetLangState(lang);
      localStorage.setItem(STORAGE_KEY, lang);
      if (user) {
        await supabase
          .from("profiles")
          .update({ active_target_language: lang } as any)
          .eq("user_id", user.id);
      }
    },
    [user]
  );

  const activeLanguages = languages.filter((l) => l.is_active);

  return (
    <TargetLanguageContext.Provider
      value={{ targetLang, setTargetLang, languages, activeLanguages, loading }}
    >
      {children}
    </TargetLanguageContext.Provider>
  );
};
