import { supabase } from "@/integrations/supabase/client";

export type BookKind = "kursbuch" | "arbeitsbuch" | "other";

export interface Book {
  id: string;
  owner_id: string | null;
  title: string;
  kind: BookKind;
  level: string | null;
  language: string | null;
  publisher: string | null;
  total_pages: number | null;
  created_at: string;
}

export interface BookLektion {
  id: string;
  book_id: string;
  number: number;
  title: string | null;
  page_from: number | null;
  page_to: number | null;
}

export interface BookPage {
  id: string;
  book_id: string;
  lektion_id: string | null;
  page_number: number;
  image_path: string;
  ocr_status: string | null;
}

export type BookTaskFormat = "choice" | "gap" | "open" | "audio";

export interface BookTaskContent {
  format?: BookTaskFormat;
  items?: Array<{
    prompt?: string;
    options?: string[];
    correct_index?: number;
    answer?: string;
  }>;
  note?: string;
}

export interface BookTask {
  id: string;
  book_id: string;
  page_id: string;
  code: string | null;
  kind: string | null;
  title: string | null;
  instructions: string | null;
  content: BookTaskContent | null;
  bbox: { x: number; y: number; w: number; h: number } | null;
  source: string | null;
  sort_order: number | null;
}

export const BOOK_KIND_LABEL: Record<BookKind, string> = {
  kursbuch: "Kursbuch (підручник)",
  arbeitsbuch: "Arbeitsbuch (зошит)",
  other: "Інше",
};

/* ───────── books ───────── */

export async function listBooks(): Promise<Book[]> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Book[];
}

export async function createBook(input: {
  title: string;
  kind: BookKind;
  level?: string | null;
  language?: string | null;
  publisher?: string | null;
}): Promise<Book> {
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("books")
    .insert({ ...input, owner_id: auth?.user?.id ?? null } as any)
    .select()
    .single();
  if (error) throw error;
  return data as Book;
}

export async function deleteBook(id: string) {
  const { error } = await supabase.from("books").delete().eq("id", id);
  if (error) throw error;
}

/* ───────── lektionen ───────── */

export async function listLektionen(bookId: string): Promise<BookLektion[]> {
  const { data, error } = await supabase
    .from("book_lektionen")
    .select("*")
    .eq("book_id", bookId)
    .order("number");
  if (error) throw error;
  return (data ?? []) as BookLektion[];
}

export async function upsertLektion(input: {
  id?: string;
  book_id: string;
  number: number;
  title?: string | null;
  page_from?: number | null;
  page_to?: number | null;
}) {
  const { error } = await supabase.from("book_lektionen").upsert(input as any);
  if (error) throw error;
}

export async function deleteLektion(id: string) {
  const { error } = await supabase.from("book_lektionen").delete().eq("id", id);
  if (error) throw error;
}

/** Attach pages within a Lektion page range to that Lektion. */
export async function linkPagesToLektion(lektion: BookLektion) {
  if (lektion.page_from == null || lektion.page_to == null) return;
  const { error } = await supabase
    .from("book_pages")
    .update({ lektion_id: lektion.id } as any)
    .eq("book_id", lektion.book_id)
    .gte("page_number", lektion.page_from)
    .lte("page_number", lektion.page_to);
  if (error) throw error;
}

/* ───────── pages ───────── */

export async function listPages(bookId: string): Promise<BookPage[]> {
  const { data, error } = await supabase
    .from("book_pages")
    .select("*")
    .eq("book_id", bookId)
    .order("page_number");
  if (error) throw error;
  return (data ?? []) as BookPage[];
}

export async function insertPage(input: {
  book_id: string;
  page_number: number;
  image_path: string;
}) {
  const { data, error } = await supabase
    .from("book_pages")
    .insert({ ...input, ocr_status: "pending" } as any)
    .select()
    .single();
  if (error) throw error;
  return data as BookPage;
}

export async function deletePage(page: BookPage) {
  await supabase.storage.from("book-pages").remove([page.image_path]);
  const { error } = await supabase.from("book_pages").delete().eq("id", page.id);
  if (error) throw error;
}

export async function uploadPageImage(
  bookId: string,
  pageNumber: number,
  blob: Blob,
): Promise<string> {
  const path = `${bookId}/${String(pageNumber).padStart(4, "0")}.jpg`;
  const { error } = await supabase.storage
    .from("book-pages")
    .upload(path, blob, { contentType: "image/jpeg", upsert: true });
  if (error) throw error;
  return path;
}

const urlCache = new Map<string, { url: string; exp: number }>();

export async function signedPageUrl(path: string): Promise<string | null> {
  const cached = urlCache.get(path);
  if (cached && cached.exp > Date.now()) return cached.url;
  const { data, error } = await supabase.storage
    .from("book-pages")
    .createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  urlCache.set(path, { url: data.signedUrl, exp: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export async function signedPageUrls(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    paths.map(async (p) => {
      const u = await signedPageUrl(p);
      if (u) out[p] = u;
    }),
  );
  return out;
}

/* ───────── tasks ───────── */

export async function listTasks(bookId: string, pageIds?: string[]): Promise<BookTask[]> {
  let q = supabase.from("book_tasks").select("*").eq("book_id", bookId);
  if (pageIds?.length) q = q.in("page_id", pageIds);
  const { data, error } = await q.order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as BookTask[];
}

export async function updateTask(id: string, patch: Partial<BookTask>) {
  const { error } = await supabase.from("book_tasks").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteTask(id: string) {
  const { error } = await supabase.from("book_tasks").delete().eq("id", id);
  if (error) throw error;
}

/** Ask the AI to recognise the tasks on a page scan. */
export async function recognisePage(pageId: string) {
  const { data, error } = await supabase.functions.invoke("parse-book-page", {
    body: { page_id: pageId },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ok: true; tasks: number };
}
