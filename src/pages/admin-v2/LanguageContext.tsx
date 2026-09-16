import { ReactNode } from "react";

export interface AdminLang {
  code: string;
  label: string;
  flag: string;
}

/** Школа працює лише з німецькою — вибір мови в адмінці прибрано. */
export const ADMIN_LANGS: AdminLang[] = [{ code: "de", label: "Німецька", flag: "🇩🇪" }];

const DE = ADMIN_LANGS[0];

interface Ctx {
  lang: string;
  setLang: (code: string) => void;
  meta: AdminLang;
  isAll: boolean;
  /** Language to use when creating new content. */
  createLang: string;
}

const FIXED: Ctx = {
  lang: "de",
  setLang: () => {},
  meta: DE,
  isAll: false,
  createLang: "de",
};

export function AdminLangProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAdminLang(): Ctx {
  return FIXED;
}

/** Apply .eq('target_language', lang) filter to a supabase query when not "all". */
export function applyLangFilter<Q extends { eq: (col: string, val: any) => Q }>(query: Q, lang: string): Q {
  return lang && lang !== "all" ? query.eq("target_language", lang) : query;
}
