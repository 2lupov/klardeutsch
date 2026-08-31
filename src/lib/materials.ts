import { supabase } from "@/integrations/supabase/client";
import type { LiveSection } from "@/lib/live-class";

export type MaterialCategory = "grammar" | "reading" | "listening" | "tasks" | "vocab" | "theory";
export type MaterialKind = "text" | "question" | "audio" | "word";

export const MATERIAL_CATEGORIES: { key: MaterialCategory; label: string; icon: string }[] = [
  { key: "grammar", label: "Граматика", icon: "📐" },
  { key: "reading", label: "Читання", icon: "📖" },
  { key: "listening", label: "Слухання", icon: "🎧" },
  { key: "tasks", label: "Завдання", icon: "✅" },
  { key: "vocab", label: "Словник", icon: "🗂" },
  { key: "theory", label: "Теорія", icon: "📚" },
];

export const MATERIAL_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export interface MaterialFolder {
  id: string;
  owner_id: string | null;
  name: string;
  category: MaterialCategory;
  level: string | null;
  description: string | null;
  tags: string[];
  is_published: boolean;
  created_at: string;
}

export interface MaterialItem {
  id: string;
  folder_id: string;
  owner_id: string | null;
  kind: MaterialKind;
  title: string | null;
  content: any;
  level: string | null;
  tags: string[];
  source: "manual" | "ai" | "book";
  sort_order: number;
  created_at: string;
}

export const kindLabel = (k: MaterialKind) =>
  k === "text" ? "Текст / теорія" : k === "question" ? "Питання" : k === "audio" ? "Аудіо" : "Слово";

/** Folder category -> default live-lesson section */
export const categoryToSection = (c: MaterialCategory): LiveSection =>
  c === "vocab" ? "vocab" : c === "theory" ? "grammar" : (c as LiveSection);

export function materialPreview(item: MaterialItem): string {
  const c = item.content || {};
  if (item.kind === "text") return String(c.body || "");
  if (item.kind === "question") return String(c.question || "");
  if (item.kind === "audio") return String(c.url || "");
  if (item.kind === "word") return [c.article, c.term, c.translation && `— ${c.translation}`].filter(Boolean).join(" ");
  return "";
}

export async function fetchFolders() {
  const { data, error } = await supabase
    .from("material_folders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data || []) as unknown as MaterialFolder[];
}

export async function createFolder(input: {
  ownerId: string;
  name: string;
  category: MaterialCategory;
  level: string | null;
  description?: string | null;
  tags?: string[];
}) {
  const { data, error } = await supabase
    .from("material_folders")
    .insert({
      owner_id: input.ownerId,
      name: input.name,
      category: input.category,
      level: input.level,
      description: input.description ?? null,
      tags: input.tags ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as MaterialFolder;
}

export async function deleteFolder(id: string) {
  const { error } = await supabase.from("material_folders").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchItems(folderId: string) {
  const { data, error } = await supabase
    .from("material_items")
    .select("*")
    .eq("folder_id", folderId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data || []) as unknown as MaterialItem[];
}

/** Global search across all folders (title + tags), optionally scoped to a folder/level */
export async function searchItems(opts: {
  query?: string;
  folderId?: string | null;
  level?: string | null;
  kinds?: MaterialKind[];
  limit?: number;
}) {
  let q = supabase.from("material_items").select("*").order("created_at", { ascending: false });
  if (opts.folderId) q = q.eq("folder_id", opts.folderId);
  if (opts.level) q = q.eq("level", opts.level);
  if (opts.kinds?.length) q = q.in("kind", opts.kinds);
  const term = (opts.query || "").trim();
  if (term) q = q.or(`title.ilike.%${term}%,content->>body.ilike.%${term}%,content->>question.ilike.%${term}%,content->>term.ilike.%${term}%`);
  const { data, error } = await q.limit(opts.limit ?? 200);
  if (error) throw error;
  return (data || []) as unknown as MaterialItem[];
}

export async function createItem(input: {
  folderId: string;
  ownerId: string;
  kind: MaterialKind;
  title: string | null;
  content: any;
  level: string | null;
  tags?: string[];
}) {
  const { data, error } = await supabase
    .from("material_items")
    .insert({
      folder_id: input.folderId,
      owner_id: input.ownerId,
      kind: input.kind,
      title: input.title,
      content: input.content,
      level: input.level,
      tags: input.tags ?? [],
      source: "manual",
      sort_order: Date.now() % 1000000,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as MaterialItem;
}

export async function updateItem(id: string, patch: Partial<Pick<MaterialItem, "title" | "content" | "level" | "tags">>) {
  const { error } = await supabase.from("material_items").update(patch as any).eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from("material_items").delete().eq("id", id);
  if (error) throw error;
}

export async function generateMaterials(input: {
  folderId: string;
  prompt: string;
  bookText?: string;
  level: string;
  count: number;
  kinds: MaterialKind[];
}) {
  const { data, error } = await supabase.functions.invoke("generate-materials", {
    body: {
      folder_id: input.folderId,
      prompt: input.prompt,
      book_text: input.bookText || "",
      level: input.level,
      count: input.count,
      kinds: input.kinds.filter((k) => k !== "audio"),
    },
  });
  if (error) throw new Error((data as any)?.error || error.message);
  if ((data as any)?.error) throw new Error((data as any).error);
  return ((data as any)?.items || []) as MaterialItem[];
}
