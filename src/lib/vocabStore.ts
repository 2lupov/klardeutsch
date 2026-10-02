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
  folder: string;
  image_url: string | null;
  image_credit: string | null;
  image_query: string | null;
};

export type GlossaryEntry = {
  nl: string;
  article?: string;
  ru?: string;
  de?: string;
  en?: string; // короткий английский глосс — по нему ищем картинку
  example?: string;
  example_ru?: string;
};

export const DEFAULT_FOLDER = "Без папки";
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

export async function getByFolder(folder: string): Promise<VocabItem[]> {
  const { data, error } = await supabase.from("dutch_vocab").select("*").eq("folder", folder).order("lemma").range(0, 9999);
  if (error) throw error;
  return (data ?? []) as VocabItem[];
}

export type FolderSummary = { name: string; count: number; known: number };

/** Папки = агрегация по текстовому полю folder, отдельной таблицы под это не заводили —
 *  список папок и так никогда не бывает большим (уровни + то, что сам назвал). */
export async function getFolders(): Promise<FolderSummary[]> {
  const { data, error } = await supabase.from("dutch_vocab").select("folder, status").range(0, 19999);
  if (error) throw error;
  const map = new Map<string, FolderSummary>();
  for (const row of (data ?? []) as { folder: string; status: SrsStatus }[]) {
    const f = map.get(row.folder) ?? { name: row.folder, count: 0, known: 0 };
    f.count += 1;
    if (row.status === "known") f.known += 1;
    map.set(row.folder, f);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "ru"));
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

export async function getStats(folder?: string): Promise<{ known: number; learning: number; dueNow: number }> {
  let known = supabase.from("dutch_vocab").select("id", { count: "exact", head: true }).eq("status", "known");
  let learning = supabase.from("dutch_vocab").select("id", { count: "exact", head: true }).neq("status", "known");
  let dueNow = supabase.from("dutch_vocab").select("id", { count: "exact", head: true }).lte("due_at", new Date().toISOString()).neq("status", "known");
  if (folder) { known = known.eq("folder", folder); learning = learning.eq("folder", folder); dueNow = dueNow.eq("folder", folder); }
  const [k, l, d] = await Promise.all([known, learning, dueNow]);
  return { known: k.count ?? 0, learning: l.count ?? 0, dueNow: d.count ?? 0 };
}

function rowFrom(entry: GlossaryEntry, userId: string, source: string, folder: string) {
  return {
    user_id: userId,
    lemma: entry.nl,
    article: entry.article || null,
    translation_ru: entry.ru || null,
    translation_de: entry.de || null,
    example: entry.example || null,
    example_ru: entry.example_ru || null,
    source,
    folder,
    image_query: entry.en || null,
    ...initCard(),
  };
}

/** Пассивное добавление слова (встретил при чтении/в модуле) — не трогает
 *  существующий прогресс, если слово уже в словаре. */
export async function addIfNew(entry: GlossaryEntry, source: string, folder: string = DEFAULT_FOLDER): Promise<VocabItem | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: existing } = await supabase.from("dutch_vocab").select("*").eq("user_id", auth.user.id).ilike("lemma", entry.nl).maybeSingle();
  if (existing) return existing as VocabItem;

  const { data, error } = await supabase.from("dutch_vocab").insert(rowFrom(entry, auth.user.id, source, folder)).select().single();
  if (error) throw error;
  return data as VocabItem;
}

/** Массовая загрузка глоссария сгенерированного текста — одним запросом вместо N. */
export async function bulkAddIfNew(entries: GlossaryEntry[], source: string, folder: string = DEFAULT_FOLDER): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || !entries.length) return;
  const known = await getVocabMap();
  const rows = entries.filter((e) => e.nl && !known.has(norm(e.nl))).map((e) => rowFrom(e, auth.user!.id, source, folder));
  if (!rows.length) return;
  // onConflict подстрахует, если то же слово успело прилететь из другого места параллельно
  const { error } = await supabase.from("dutch_vocab").upsert(rows, { onConflict: "user_id,lemma", ignoreDuplicates: true });
  if (error) throw error;
}

/** Слово, которое пользователь вписал в словарь сам — явное намерение,
 *  поэтому в отличие от addIfNew разрешаем обновить перевод/папку даже
 *  если запись уже существовала (но прогресс SRS не трогаем). */
export async function addManualWord(entry: GlossaryEntry, folder: string): Promise<VocabItem> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Не авторизован");
  const { data: existing } = await supabase.from("dutch_vocab").select("*").eq("user_id", auth.user.id).ilike("lemma", entry.nl).maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("dutch_vocab")
      .update({
        article: entry.article || existing.article,
        translation_ru: entry.ru || existing.translation_ru,
        translation_de: entry.de || existing.translation_de,
        example: entry.example || existing.example,
        example_ru: entry.example_ru || existing.example_ru,
        image_query: entry.en || existing.image_query,
        folder,
      })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) throw error;
    return data as VocabItem;
  }

  const { data, error } = await supabase.from("dutch_vocab").insert(rowFrom(entry, auth.user.id, "manual", folder)).select().single();
  if (error) throw error;
  return data as VocabItem;
}

export async function updateWord(id: string, patch: Partial<Pick<VocabItem, "translation_ru" | "translation_de" | "article" | "example" | "example_ru" | "folder">>): Promise<void> {
  const { error } = await supabase.from("dutch_vocab").update(patch).eq("id", id);
  if (error) throw error;
}

export async function deleteWord(id: string): Promise<void> {
  const { error } = await supabase.from("dutch_vocab").delete().eq("id", id);
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

/** Картинка к слову — лениво, только когда слово реально показывается
 *  (карточка повторения, строка в словаре), а не для всего глоссария разом.
 *  Результат кэшируется в самой строке, повторный вызов для того же слова
 *  уже не ходит в Pexels. */
export async function fetchWordImage(item: VocabItem): Promise<{ url: string | null; credit: string | null }> {
  // image_url === null → ещё не пробовали. "" → пробовали, картинки не нашлось
  // (не повторяем запрос впустую). Непустая строка → уже есть, кэш отдаём как есть.
  if (item.image_url !== null && item.image_url !== undefined) {
    return { url: item.image_url || null, credit: item.image_credit };
  }
  const query = item.image_query || item.translation_de || item.translation_ru || item.lemma;
  const { data, error } = await supabase.functions.invoke("word-image", { body: { query } });
  if (error || !data?.url) {
    await supabase.from("dutch_vocab").update({ image_url: "" }).eq("id", item.id); // "" = уже пробовали, пусто — не спамим запросами повторно
    return { url: null, credit: null };
  }
  await supabase.from("dutch_vocab").update({ image_url: data.url, image_credit: data.credit ?? null }).eq("id", item.id);
  return { url: data.url, credit: data.credit ?? null };
}
