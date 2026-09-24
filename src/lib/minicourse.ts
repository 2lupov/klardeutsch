import { supabase } from "@/integrations/supabase/client";
import { normalizeKit, type KitSection, type LessonKit } from "@/lib/lesson-kits";

export type MiniCourse = LessonKit;
export type MiniSection = KitSection;

/** Презентація → мінікурс із темами (ШІ). */
export async function createMiniCourseFromPresentation(input: {
  presentationId: string;
  title?: string;
  level: string;
  from: number;
  to: number;
  notes?: string;
}): Promise<MiniCourse> {
  const { data, error } = await supabase.functions.invoke("presentation-to-minicourse", {
    body: {
      presentation_id: input.presentationId,
      title: input.title,
      level: input.level,
      from: input.from,
      to: input.to,
      notes: input.notes ?? "",
    },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return normalizeKit((data as any).kit);
}

export async function listMiniCourses(): Promise<MiniCourse[]> {
  const { data, error } = await supabase
    .from("lesson_kits")
    .select("*")
    .eq("kind", "minicourse")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizeKit);
}

/** Видає мінікурс учню в його акаунт. */
export async function assignMiniCourse(teacherId: string, course: MiniCourse, studentId: string): Promise<void> {
  const images = [...course.blocks, ...course.sections.flatMap((s) => s.blocks)].map((b) => b.payload?.image_path).filter((p): p is string => typeof p === "string" && p.startsWith(`kits/${course.id}/`));
  const audio = [...course.blocks, ...course.sections.flatMap((s) => s.blocks)].map((b) => b.payload?.audio_path).filter((p): p is string => typeof p === "string" && p.startsWith(`kits/${course.id}/`));
  const { error } = await supabase.from("student_assignments").insert({
    teacher_id: teacherId,
    student_id: studentId,
    type: "minicourse",
    title: course.title,
    instructions: "Проходь тему за темою: спочатку теорія, потім завдання.",
    level: course.level,
    payload: { kit_id: course.id, sections: course.sections, page_paths: course.page_paths, presentation_id: course.presentation_id, image_paths: [...new Set(images)], audio_paths: [...new Set(audio)] } as any,
    status: "assigned",
  });
  if (error) throw error;
  await supabase.from("lesson_kits").update({ last_assigned_at: new Date().toISOString() }).eq("id", course.id);
}

export interface MiniCourseTask {
  id: string;
  title: string;
  instructions: string | null;
  level: string | null;
  status: string;
  sections: MiniSection[];
  pagePaths: string[];
  presentationId: string | null;
}

export async function loadMiniCourseTask(assignmentId: string): Promise<MiniCourseTask | null> {
  const { data } = await supabase
    .from("student_assignments")
    .select("id, title, instructions, level, status, payload")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!data) return null;
  const raw = ((data as any).payload?.sections ?? []) as any[];
  return {
    id: data.id,
    title: (data as any).title ?? "Мінікурс",
    instructions: (data as any).instructions ?? null,
    level: (data as any).level ?? null,
    status: (data as any).status ?? "assigned",
    pagePaths: Array.isArray((data as any).payload?.page_paths) ? (data as any).payload.page_paths : [],
    presentationId: (data as any).payload?.presentation_id ?? null,
    sections: raw.map((s, i) => ({
      id: String(s?.id ?? `s-${i}`),
      title: String(s?.title ?? `Тема ${i + 1}`),
      emoji: String(s?.emoji ?? "📘"),
      summary: s?.summary ?? null,
      blocks: Array.isArray(s?.blocks) ? s.blocks : [],
      layout: ["grammar", "reading", "illustrated", "practice"].includes(s?.layout) ? s.layout : "grammar",
    })),
  };
}
