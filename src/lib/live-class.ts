import { supabase } from "@/integrations/supabase/client";

export type LiveSection = "board" | "grammar" | "listening" | "reading" | "tasks" | "vocab";

export const LIVE_SECTIONS: { key: LiveSection; label: string; icon: string }[] = [
  { key: "board", label: "Дошка", icon: "✍️" },
  { key: "grammar", label: "Граматика", icon: "📐" },
  { key: "listening", label: "Слухання", icon: "🎧" },
  { key: "reading", label: "Читання", icon: "📖" },
  { key: "tasks", label: "Завдання", icon: "✅" },
  { key: "vocab", label: "Словник", icon: "🗂" },
];

export interface LiveClass {
  id: string;
  teacher_id: string;
  student_id: string;
  title: string;
  status: "active" | "ended";
  current_section: LiveSection;
  board: any[];
  book_page?: LiveBookPage | null;
  started_at: string;
  ended_at: string | null;
}

export interface LiveItem {
  id: string;
  class_id: string;
  section: LiveSection;
  kind: "text" | "audio" | "question" | "word";
  title: string | null;
  content: any;
  sort_order: number;
  created_at: string;
}

export async function startLiveClass(teacherId: string, studentId: string, title: string) {
  const { data: existing } = await supabase
    .from("live_classes")
    .select("*")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as unknown as LiveClass;

  // Дошка учня переноситься з попереднього уроку (як у Miro — одне полотно на учня)
  const { data: prev } = await supabase
    .from("live_classes")
    .select("board")
    .eq("teacher_id", teacherId)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("live_classes")
    .insert({ teacher_id: teacherId, student_id: studentId, title, board: ((prev as any)?.board || []) as any })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as LiveClass;
}


export async function endLiveClass(id: string) {
  const { error } = await supabase
    .from("live_classes")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function addLiveItem(
  classId: string,
  section: LiveSection,
  kind: LiveItem["kind"],
  title: string | null,
  content: any,
) {
  const { data, error } = await supabase
    .from("live_class_items")
    .insert({ class_id: classId, section, kind, title, content, sort_order: Date.now() % 100000 })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as LiveItem;
}

export async function fetchLiveItems(classId: string) {
  const { data } = await supabase
    .from("live_class_items")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: true });
  return (data || []) as unknown as LiveItem[];
}

export async function markSectionSeen(classId: string, studentId: string, section: LiveSection) {
  await supabase
    .from("live_class_seen")
    .upsert(
      { class_id: classId, student_id: studentId, section, last_seen_at: new Date().toISOString() },
      { onConflict: "class_id,student_id,section" },
    );
}

/* ───────── textbook page shown under the whiteboard ───────── */

export interface LiveBookPage {
  book_title: string;
  page_number: number | null;
  image_path: string;
}

export async function setLiveBookPage(classId: string, page: LiveBookPage | null) {
  const { error } = await supabase
    .from("live_classes")
    .update({ book_page: page } as any)
    .eq("id", classId);
  if (error) throw error;
}
