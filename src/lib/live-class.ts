import { supabase } from "@/integrations/supabase/client";
import type { KitSection } from "@/lib/lesson-kits";

/** Активні розділи уроку — лише три. Старі значення залишені для сумісності з давніми записами. */
export type LiveSection =
  | "board"
  | "slides"
  | "blocks"
  | "grammar"
  | "listening"
  | "reading"
  | "notes"
  | "tasks"
  | "vocab"
  | "textbook"
  | "writing"
  | "video";

/** Нотатки відкриваються острівцем поверх будь-якого розділу, тому окремої вкладки немає. */
export const LIVE_SECTIONS: { key: LiveSection; label: string; icon: string }[] = [
  { key: "board", label: "Дошка", icon: "✍️" },
  { key: "slides", label: "Презентація", icon: "🖼" },
  { key: "blocks", label: "Блок-завдання", icon: "🧩" },
  { key: "textbook", label: "Підручник", icon: "📖" },
  { key: "reading", label: "Читання", icon: "📚" },
  { key: "grammar", label: "Граматика", icon: "🎓" },
  { key: "writing", label: "Письмо", icon: "✉️" },
  { key: "video", label: "Відео", icon: "🎬" },
];

/** Спільна тема уроку: введена в Читанні / Граматиці — підтягується в усі розділи. */
const topicKey = (classId: string) => `klar-live-topic:${classId}`;
export function getLessonTopic(classId: string): string {
  try { return localStorage.getItem(topicKey(classId)) || ""; } catch { return ""; }
}
export function setLessonTopic(classId: string, topic: string) {
  const t = topic.trim();
  if (!t) return;
  try { localStorage.setItem(topicKey(classId), t); } catch { /* ignore */ }
}

/** Що саме показано учню в розділі «Презентація» / «Блок-завдання». */
export type LiveView =
  | { type: "slide"; presentation_id: string; page: number }
  | { type: "textbook"; student_book_id: string; page: number }
  | { type: "blocks"; kit_id: string; title?: string; level?: string | null; blocks: any[]; sections?: KitSection[]; page_paths?: string[]; presentation_id?: string | null };


export interface LiveClass {
  id: string;
  teacher_id: string;
  student_id: string;
  title: string;
  status: "active" | "ended";
  current_section: LiveSection;
  board: any[];
  book_page?: LiveBookPage | null;
  live_view?: LiveView | null;
  started_at: string;
  ended_at: string | null;
}

/** Переносить учня на потрібний розділ і показує йому вибраний матеріал. */
export async function setLiveView(classId: string, section: LiveSection, view: LiveView | null) {
  const { error } = await supabase
    .from("live_classes")
    .update({ current_section: section, live_view: view } as any)
    .eq("id", classId);
  if (error) throw error;
}


export interface LiveItem {
  id: string;
  class_id: string;
  section: LiveSection;
  kind: "text" | "audio" | "question" | "word" | "interactive";
  title: string | null;
  content: any;
  sort_order: number;
  created_at: string;
}

export async function startLiveClass(teacherId: string, studentId: string, title: string) {
  const findActive = async () => {
    const { data, error } = await supabase
      .from("live_classes")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("student_id", studentId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as LiveClass | null;
  };

  const existing = await findActive();
  if (existing) return existing;

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
  if (error) {
    // 23505: подвійний клік / дві вкладки встигли створити урок — беремо вже створений, а не дубль
    if ((error as any).code === "23505") {
      const again = await findActive();
      if (again) return again;
    }
    throw error;
  }
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
