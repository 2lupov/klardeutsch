import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export interface AdminLang {
  code: string; // "all" | "de" | "en" | ...
  label: string;
  flag: string;
}

export const ADMIN_LANGS: AdminLang[] = [
  { code: "all", label: "Усі мови", flag: "🌍" },
  { code: "de", label: "Німецька", flag: "🇩🇪" },
  { code: "en", label: "Англійська", flag: "🇬🇧" },
  { code: "pl", label: "Польська", flag: "🇵🇱" },
  { code: "es", label: "Іспанська", flag: "🇪🇸" },
  { code: "fr", label: "Французька", flag: "🇫🇷" },
  { code: "it", label: "Італійська", flag: "🇮🇹" },
];

const STORAGE_KEY = "admin-v2:lang";

interface Ctx {
  lang: string; // current selected code (may be "all")
  setLang: (code: string) => void;
  meta: AdminLang;
  isAll: boolean;
  /** Language to use when creating new content — never "all". */
  createLang: string;
}

const AdminLangContext = createContext<Ctx | null>(null);

export function AdminLangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<string>(() => {
    if (typeof window === "undefined") return "all";
    return localStorage.getItem(STORAGE_KEY) || "all";
  });

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang]);

  const meta = ADMIN_LANGS.find((l) => l.code === lang) || ADMIN_LANGS[0];
  const isAll = lang === "all";
  const createLang = isAll ? "de" : lang;

  return (
    <AdminLangContext.Provider value={{ lang, setLang: setLangState, meta, isAll, createLang }}>
      {children}
    </AdminLangContext.Provider>
  );
}

export function useAdminLang() {
  const ctx = useContext(AdminLangContext);
  if (!ctx) throw new Error("useAdminLang must be used within AdminLangProvider");
  return ctx;
}

/** Apply .eq('target_language', lang) filter to a supabase query when not "all". */
export function applyLangFilter<Q extends { eq: (col: string, val: any) => Q }>(query: Q, lang: string): Q {
  return lang && lang !== "all" ? query.eq("target_language", lang) : query;
}
