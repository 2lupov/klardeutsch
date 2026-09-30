import { supabase } from "@/integrations/supabase/client";

export interface StudentFolder {
  id: string;
  student_id: string;
  teacher_id: string | null;
  name: string;
  emoji: string | null;
  color: string | null;
  sort_order: number;
  created_at: string;
}

export interface StudentFolderPage {
  id: string;
  student_id: string;
  teacher_id: string | null;
  folder_id: string;
  book_id: string | null;
  book_title: string | null;
  page_number: number | null;
  image_path: string;
  caption: string | null;
  created_at: string;
}

const db = supabase as any;

/** Власні папки учня (створює учень або його викладач). */
export async function listStudentFolders(studentId: string): Promise<StudentFolder[]> {
  const { data, error } = await db.from("student_folders").select("*")
    .eq("student_id", studentId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as StudentFolder[];
}

export async function createStudentFolder(
  studentId: string,
  name: string,
  opts: { emoji?: string; teacherId?: string | null } = {},
): Promise<StudentFolder> {
  const { data, error } = await db.from("student_folders")
    .insert({ student_id: studentId, name: name.trim(), emoji: opts.emoji ?? "📁", teacher_id: opts.teacherId ?? null })
    .select("*").single();
  if (error) throw error;
  return data as StudentFolder;
}

export async function renameStudentFolder(id: string, name: string) {
  const { error } = await db.from("student_folders").update({ name: name.trim() }).eq("id", id);
  if (error) throw error;
}

export async function deleteStudentFolder(id: string) {
  const { error } = await db.from("student_folders").delete().eq("id", id);
  if (error) throw error;
}

export async function listFolderPages(studentId: string): Promise<StudentFolderPage[]> {
  const { data, error } = await db.from("student_folder_pages").select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data || []) as StudentFolderPage[];
}

export async function addFolderPages(
  studentId: string,
  folderId: string,
  pages: { book_id: string; book_title: string; page_number: number; image_path: string }[],
  teacherId?: string | null,
) {
  if (pages.length === 0) return;
  const { error } = await db.from("student_folder_pages").insert(
    pages.map((p) => ({ ...p, student_id: studentId, folder_id: folderId, teacher_id: teacherId ?? null })),
  );
  if (error) throw error;
}

export async function removeFolderPage(id: string) {
  const { error } = await db.from("student_folder_pages").delete().eq("id", id);
  if (error) throw error;
}

/** Перенести сторінку в іншу папку. */
export async function moveFolderPage(id: string, folderId: string) {
  const { error } = await db.from("student_folder_pages").update({ folder_id: folderId }).eq("id", id);
  if (error) throw error;
}
