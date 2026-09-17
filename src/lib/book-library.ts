import { supabase } from "@/integrations/supabase/client";

export interface LibraryBook {
  id: string;
  owner_id: string;
  title: string;
  kind: string;
  level: string | null;
  publisher: string | null;
  total_pages: number;
  size_bytes: number;
  file_path: string;
  notes: string | null;
  created_at: string;
}

export const BOOK_KINDS = [
  { value: "kursbuch", label: "Kursbuch" },
  { value: "arbeitsbuch", label: "Arbeitsbuch" },
  { value: "grammatik", label: "Граматика" },
  { value: "lesen", label: "Читання" },
  { value: "sonstiges", label: "Інше" },
] as const;

export const kindLabel = (kind: string) =>
  BOOK_KINDS.find((k) => k.value === kind)?.label ?? kind;

export const prettySize = (bytes: number) => {
  if (!bytes) return "—";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} МБ` : `${Math.max(1, Math.round(bytes / 1024))} КБ`;
};

export async function listLibraryBooks(): Promise<LibraryBook[]> {
  const { data, error } = await supabase
    .from("book_files")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LibraryBook[];
}

/** Завантажує PDF у бібліотеку і створює запис. */
export async function uploadLibraryBook(input: {
  ownerId: string;
  file: File;
  title: string;
  kind: string;
  level: string | null;
  publisher?: string | null;
  totalPages: number;
  notes?: string | null;
}): Promise<LibraryBook> {
  const safe = input.file.name.replace(/[^\w.\-]+/g, "_").slice(-80);
  const path = `${input.ownerId}/${Date.now()}-${safe}`;
  const up = await supabase.storage.from("book-library").upload(path, input.file, {
    upsert: false,
    contentType: "application/pdf",
  });
  if (up.error) throw up.error;

  const { data, error } = await supabase
    .from("book_files")
    .insert({
      owner_id: input.ownerId,
      title: input.title.trim() || input.file.name.replace(/\.pdf$/i, ""),
      kind: input.kind,
      level: input.level,
      publisher: input.publisher ?? null,
      total_pages: input.totalPages,
      size_bytes: input.file.size,
      file_path: path,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from("book-library").remove([path]);
    throw error;
  }
  return data as LibraryBook;
}

export async function deleteLibraryBook(book: LibraryBook) {
  const { error } = await supabase.from("book_files").delete().eq("id", book.id);
  if (error) throw error;
  await supabase.storage.from("book-library").remove([book.file_path]);
}

/** Тягне PDF з бібліотеки як файл — далі його читає та сама логіка, що й локальний. */
export async function downloadLibraryBook(book: LibraryBook): Promise<File> {
  const { data, error } = await supabase.storage.from("book-library").download(book.file_path);
  if (error) throw error;
  return new File([data], `${book.title}.pdf`, { type: "application/pdf" });
}

export async function libraryBookUrl(book: LibraryBook): Promise<string | null> {
  const { data } = await supabase.storage.from("book-library").createSignedUrl(book.file_path, 3600);
  return data?.signedUrl ?? null;
}
