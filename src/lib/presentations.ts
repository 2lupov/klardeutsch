import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "@/integrations/supabase/client";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const PRESENTATION_BUCKET = "presentation-slides";


/* ───────── Типи й довідники ───────── */

export type PresKind = "pdf" | "interactive" | "game" | "test";
export type PresSkill = "grammar" | "vocab" | "reading" | "listening" | "writing" | "speaking" | "exam" | "culture";
export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const KIND_META: Record<PresKind, { label: string; emoji: string }> = {
  pdf: { label: "Слайди (PDF)", emoji: "📑" },
  interactive: { label: "Інтерактив", emoji: "🖱️" },
  game: { label: "Гра", emoji: "🎮" },
  test: { label: "Тест", emoji: "✅" },
};

export const SKILL_META: Record<PresSkill, { label: string; emoji: string }> = {
  grammar: { label: "Grammatik · граматика", emoji: "📐" },
  vocab: { label: "Wortschatz · лексика", emoji: "🧩" },
  reading: { label: "Lesen · читання", emoji: "📖" },
  listening: { label: "Hören · аудіювання", emoji: "🎧" },
  writing: { label: "Schreiben · письмо", emoji: "✍️" },
  speaking: { label: "Sprechen · мовлення", emoji: "💬" },
  exam: { label: "Prüfung · іспит", emoji: "🎓" },
  culture: { label: "Landeskunde · країнознавство", emoji: "🗺️" },
};

export interface Presentation {
  id: string;
  owner_id: string;
  title: string;
  slide_paths: string[];
  page_count: number;
  /** У списку НЕ завантажується (важкий). Брати через getPresentationHtml(). */
  html?: string | null;
  created_at: string;
  updated_at: string;
  kind: PresKind;
  level: string | null;
  skill: PresSkill | null;
  folder_id: string | null;
  tags: string[];
  notes: string | null;
  pinned: boolean;
  archived: boolean;
}

export interface PresentationFolder {
  id: string;
  owner_id: string;
  name: string;
  emoji: string;
  sort_order: number;
  created_at: string;
}

export const isInteractive = (p: Pick<Presentation, "kind">) => p.kind !== "pdf";

function normalize(row: any): Presentation {
  const hasHtml = row.html != null && row.html !== "";
  const kind: PresKind = row.kind ?? (hasHtml ? "interactive" : "pdf");
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    slide_paths: (row.slide_paths ?? []) as string[],
    page_count: row.page_count ?? (row.slide_paths ?? []).length,
    created_at: row.created_at,
    updated_at: row.updated_at ?? row.created_at,
    kind,
    level: row.level ?? null,
    skill: row.skill ?? null,
    folder_id: row.folder_id ?? null,
    tags: (row.tags ?? []) as string[],
    notes: row.notes ?? null,
    pinned: !!row.pinned,
    archived: !!row.archived,
  };
}

/** Колонки списку — без важкого html. */
const LIST_COLS =
  "id, owner_id, title, slide_paths, page_count, created_at, updated_at, kind, level, skill, folder_id, tags, notes, pinned, archived";

/** Міграція ще не виконана (немає нових колонок/таблиці). */
function isMissingSchema(e: any) {
  const code = e?.code;
  return code === "42703" || code === "42P01" || code === "PGRST204" || code === "PGRST205" || /column|relation|schema cache/i.test(e?.message ?? "");
}

export async function listPresentations(): Promise<Presentation[]> {
  const db = supabase as any;
  let res = await db.from("presentations").select(LIST_COLS).order("created_at", { ascending: false });
  if (res.error && isMissingSchema(res.error)) {
    // Запасний варіант до міграції: стара схема (kind визначаємо за наявністю html).
    res = await db.from("presentations").select("*").order("created_at", { ascending: false });
  }
  if (res.error) throw res.error;
  return (res.data ?? []).map(normalize);
}

/** HTML однієї інтерактивної презентації (тільки при відкритті). */
export async function getPresentationHtml(id: string): Promise<string> {
  const { data, error } = await (supabase as any).from("presentations").select("html").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data?.html as string) || "";
}

/* ───────── Автодогадка метаданих за назвою ───────── */

export interface GuessedMeta {
  level: string | null;
  skill: PresSkill | null;
  kind: PresKind;
}

export function guessMeta(title: string, interactive: boolean): GuessedMeta {
  const t = title.toLowerCase();
  const m = title.match(/(?:^|[^a-z0-9])([ABC][12])(?:[.\-–]\d)?(?![a-z0-9])/i);
  let kind: PresKind = interactive ? "interactive" : "pdf";
  if (interactive) {
    if (/(test|тест|prüfung|pruefung|exam)/i.test(t)) kind = "test";
    else if (/(spiel|game|mission|weltall|3d|thuis|игра|гра)/i.test(t)) kind = "game";
  }
  let skill: PresSkill | null = null;
  if (/(genitiv|präteritum|praeteritum|verb|grammatik|kasus|artikel|adjektiv|epitheta|граматик)/i.test(t)) skill = "grammar";
  else if (/(wortschatz|vokabel|wörter|küche|wohnzimmer|woordenschat|слов)/i.test(t)) skill = "vocab";
  else if (kind === "test") skill = "exam";
  return { level: m ? m[1].toUpperCase() : null, skill, kind };
}

/** «klar_dmytro_lektion1_audio.svg» → «dmytro lektion1 audio» (читабельна назва). */
export function prettyTitle(raw: string): string {
  let s = raw.replace(/\.(pdf|html?|svg)$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  s = s.replace(/^klar\s+/i, "");
  if (s && s === s.toLowerCase()) s = s.charAt(0).toUpperCase() + s.slice(1);
  return s || "Презентація";
}

/** Ключ для пошуку дублів: без «(1)», регістру й розділових знаків. */
export function dupKey(title: string): string {
  return title.replace(/\(\d+\)\s*$/, "").toLowerCase().replace(/[^a-z0-9а-яіїєґ]+/g, "");
}

/* ───────── Слайди (PDF) ───────── */

/** Підписані посилання на слайди (для показу учню). */
export async function slideUrls(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data, error } = await supabase.storage
    .from(PRESENTATION_BUCKET)
    .createSignedUrls(paths, 60 * 60 * 6);
  if (error) throw error;
  const map = new Map<string, string>((data ?? []).map((d: any) => [d.path as string, d.signedUrl as string]));
  return paths.map((p) => map.get(p) || "");
}

export interface PresentationMeta {
  folder_id?: string | null;
  level?: string | null;
  skill?: PresSkill | null;
  kind?: PresKind;
  tags?: string[];
  notes?: string | null;
}

/** Вставка з новими колонками; якщо міграція ще не виконана — без них. */
async function insertPresentation(base: Record<string, any>, meta: PresentationMeta) {
  const db = supabase as any;
  const clean = Object.fromEntries(Object.entries(meta).filter(([, v]) => v !== undefined));
  let res = await db.from("presentations").insert({ ...base, ...clean }).select("*").single();
  if (res.error && isMissingSchema(res.error)) {
    res = await db.from("presentations").insert(base).select("*").single();
  }
  if (res.error) throw res.error;
  return res.data;
}

/** PDF презентації → картинки слайдів + запис у бібліотеці. */
export async function uploadPresentation(opts: {
  ownerId: string;
  file: File;
  title?: string;
  meta?: PresentationMeta;
  onProgress?: (text: string) => void;
}): Promise<Presentation> {
  const { ownerId, file, onProgress } = opts;
  const say = (t: string) => onProgress?.(t);
  const title = (opts.title || prettyTitle(file.name)).trim() || "Презентація";
  const guess = guessMeta(title, false);

  say("Читаємо PDF…");
  const doc = await (pdfjsLib as any).getDocument({ data: await file.arrayBuffer() }).promise;
  const total: number = doc.numPages;

  const created = await insertPresentation(
    { owner_id: ownerId, title, slide_paths: [], page_count: 0 },
    { kind: "pdf", level: guess.level, skill: guess.skill, ...opts.meta },
  );

  const paths: string[] = [];
  for (let n = 1; n <= total; n++) {
    say(`Готуємо слайд ${n} з ${total}…`);
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2.4, 1800 / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.85),
    );
    canvas.width = 0;
    canvas.height = 0;

    const path = `${created.id}/slide-${String(n).padStart(3, "0")}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(PRESENTATION_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw upErr;
    paths.push(path);
  }

  const { data: updated, error: updErr } = await supabase
    .from("presentations")
    .update({ slide_paths: paths, page_count: paths.length })
    .eq("id", created.id)
    .select("*")
    .single();
  if (updErr) throw updErr;
  say("Готово");
  return normalize(updated);
}

/* ───────── Редагування ───────── */

export type PresentationPatch = Partial<
  Pick<Presentation, "title" | "kind" | "level" | "skill" | "folder_id" | "tags" | "notes" | "pinned" | "archived">
>;

export async function updatePresentation(id: string, patch: PresentationPatch) {
  const { error } = await (supabase as any).from("presentations").update(patch).eq("id", id);
  if (error) throw error;
}

export async function updatePresentations(ids: string[], patch: PresentationPatch) {
  if (!ids.length) return;
  const { error } = await (supabase as any).from("presentations").update(patch).in("id", ids);
  if (error) throw error;
}

export async function renamePresentation(id: string, title: string) {
  await updatePresentation(id, { title });
}

export async function deletePresentation(p: Presentation) {
  if (p.slide_paths.length) {
    await supabase.storage.from(PRESENTATION_BUCKET).remove(p.slide_paths);
  }
  const { error } = await supabase.from("presentations").delete().eq("id", p.id);
  if (error) throw error;
}

/** Інтерактивна презентація з HTML/SVG-коду (кнопки, анімації працюють). */
export async function createHtmlPresentation(
  ownerId: string,
  title: string,
  html: string,
  meta?: PresentationMeta,
): Promise<Presentation> {
  const t = title.trim() || "Інтерактивна презентація";
  const guess = guessMeta(t, true);
  const row = await insertPresentation(
    { owner_id: ownerId, title: t, slide_paths: [], page_count: 1, html },
    { kind: guess.kind, level: guess.level, skill: guess.skill, ...meta },
  );
  // Озвучку ElevenLabs генеруємо й зберігаємо одразу, у фоні
  void import("@/components/live/HtmlSlides").then((m) => m.pregenerateTts(html, /nl/i.test(t) ? "nl" : "de")).catch(() => {});
  return normalize(row);
}

export const isHtmlFile = (f: File) => /\.(html?|svg)$/i.test(f.name);

/* ───────── Папки ───────── */

export async function listPresentationFolders(): Promise<PresentationFolder[]> {
  const { data, error } = await (supabase as any)
    .from("presentation_folders")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    if (isMissingSchema(error)) return [];
    throw error;
  }
  return (data ?? []) as PresentationFolder[];
}

export async function createPresentationFolder(ownerId: string, name: string, emoji: string, sortOrder: number) {
  const { data, error } = await (supabase as any)
    .from("presentation_folders")
    .insert({ owner_id: ownerId, name: name.trim(), emoji: emoji || "📁", sort_order: sortOrder })
    .select("*")
    .single();
  if (error) throw error;
  return data as PresentationFolder;
}

export async function updatePresentationFolder(id: string, patch: Partial<Pick<PresentationFolder, "name" | "emoji">>) {
  const { error } = await (supabase as any).from("presentation_folders").update(patch).eq("id", id);
  if (error) throw error;
}

/** Презентації з папки не видаляються — вони стають «Без папки» (on delete set null). */
export async function deletePresentationFolder(id: string) {
  const { error } = await (supabase as any).from("presentation_folders").delete().eq("id", id);
  if (error) throw error;
}

/** Інтерактивна презентація як ДЗ учня (один запис на учня й презентацію). Повертає false, якщо вже видано. */
export async function assignPresentationHomework(teacherId: string, studentId: string, presentationId: string): Promise<boolean> {
  const db = supabase as any;
  const { data: pres } = await db.from("presentations").select("title, html").eq("id", presentationId).maybeSingle();
  if (!pres?.html) throw new Error("Це не інтерактивна презентація");
  const { data: ex } = await db.from("student_assignments").select("id").eq("student_id", studentId)
    .eq("type", "presentation").eq("payload->>presentation_id", presentationId).limit(1);
  if (ex?.length) return false;
  const { error } = await db.from("student_assignments").insert({
    teacher_id: teacherId, student_id: studentId, type: "presentation", title: pres.title || "Інтерактивний урок",
    instructions: "Пройдіть інтерактивну презентацію і здайте.", payload: { presentation_id: presentationId, folder: "Уроки" },
  });
  if (error) throw error;
  return true;
}
