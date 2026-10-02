import { supabase } from "@/integrations/supabase/client";
import { initCard, gradeCard, type SrsCard, type SrsGrade, type SrsStatus } from "./srs";

export type VocabItem = SrsCard & {
  id: string;
  lemma: string;
  article: string | null;
  translation_ru: string | null;
  translation_de: string | null;
  example: string | null;
  example_ru: string | null;
  source: string;
};

export type GlossaryEntry = {
  nl: string;
  article?: string;
  ru?: string;
  de?: string;
  example?: string;
  example_ru?: string;
};

const norm = (s: string) => s.trim().toLowerCase();

/** Загружает весь словарь пользователя в Map<lemma_lowercase, VocabItem>.
 *  .range нужен явно — без него Supabase молча обрежет выборку на 1000 строк,
 *  а за пару месяцев активного чтения в словаре вполне может быть больше. */
export async function getVocabMap(): Promise<Map<string, VocabItem>> {
  const { data, error } = await supabase.from("dutch_vocab").select("*").range(0, 19999);
  if (error) throw error;
  const map = new Map<string, VocabItem>();
  for (const row of (data ?? []) as VocabItem[]) map.set(norm(row.lemma), row);
  return map;
}

export async function getDueCards(limit = 30): Promise<VocabItem[]> {
  const { data, error } = await supabase
    .from("dutch_vocab")
    .select("*")
    .lte("due_at", new Date().toISOString())
    .neq("status", "known")
    .order("due_at", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as VocabItem[];
}

export async function getStats(): Promise<{ known: number; learning: number; dueNow: number }> {
  const [{ count: known }, { count: learning }, { count: dueNow }] = await Promise.all([
    supabase.from("dutch_vocab").select("id", { count: "exact", head: true }).eq("status", "known"),
    supabase.from("dutch_vocab").select("id", { count: "exact", head: true }).neq("status", "known"),
    supabase.from("dutch_vocab").select("id", { count: "exact", head: true }).lte("due_at", new Date().toISOString()).neq("status", "known"),
  ]);
  return { known: known ?? 0, learning: learning ?? 0, dueNow: dueNow ?? 0 };
}

/** Добавляет слово в словарь, если его там ещё нет (не трогает существующий прогресс). */
export async function addIfNew(entry: GlossaryEntry, source: string): Promise<VocabItem | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: existing } = await supabase
    .from("dutch_vocab")
    .select("*")
    .eq("user_id", auth.user.id)
    .ilike("lemma", entry.nl)
    .maybeSingle();
  if (existing) return existing as VocabItem;

  const row = {
    user_id: auth.user.id,
    lemma: entry.nl,
    article: entry.article || null,
    translation_ru: entry.ru || null,
    translation_de: entry.de || null,
    example: entry.example || null,
    example_ru: entry.example_ru || null,
    source,
    ...initCard(),
  };
  const { data, error } = await supabase.from("dutch_vocab").insert(row).select().single();
  if (error) throw error;
  return data as VocabItem;
}

/** Массовая загрузка глоссария сгенерированного текста — одним запросом вместо N. */
export async function bulkAddIfNew(entries: GlossaryEntry[], source: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !entries.length) return;
  const known = await getVocabMap();
  const rows = entries
    .filter((e) => e.nl && !known.has(norm(e.nl)))
    .map((e) => ({
      user_id: auth.user!.id,
      lemma: e.nl,
      article: e.article || null,
      translation_ru: e.ru || null,
      translation_de: e.de || null,
      example: e.example || null,
      example_ru: e.example_ru || null,
      source,
      ...initCard(),
    }));
  if (!rows.length) return;
  // onConflict подстрахует, если то же слово успело прилететь из другого места параллельно
  const { error } = await supabase.from("dutch_vocab").upsert(rows, { onConflict: "user_id,lemma", ignoreDuplicates: true });
  if (error) throw error;
}

export async function markKnown(lemma: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const card = gradeCard(initCard(), "easy"); // сразу хороший интервал, но не "known" с одного клика
  const { error } = await supabase
    .from("dutch_vocab")
    .update({ status: "known" as SrsStatus, interval_days: 60, due_at: new Date(Date.now() + 60 * 86_400_000).toISOString(), ease: card.ease })
    .ilike("lemma", lemma);
  if (error) throw error;
}

export async function reviewCard(item: VocabItem, grade: SrsGrade): Promise<void> {
  const next = gradeCard(item, grade);
  const { error } = await supabase
    .from("dutch_vocab")
    .update({ ease: next.ease, interval_days: next.interval_days, reps: next.reps, due_at: next.due_at, status: next.status, last_reviewed_at: new Date().toISOString() })
    .eq("id", item.id);
  if (error) throw error;
}
