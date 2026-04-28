import { supabase } from "@/integrations/supabase/client";

export type ViewType =
  | { type: "welcome" }
  | { type: "theory"; html?: string }
  | { type: "exercise"; exerciseId: string; revealAnswer?: boolean }
  | { type: "word"; wordId: string; revealTranslation?: boolean }
  | { type: "text"; title?: string; body: string }
  | { type: "whiteboard" };

export interface LiveSession {
  id: string;
  lesson_id: string;
  teacher_id: string;
  student_id: string;
  status: "active" | "ended";
  current_view: ViewType;
  highlight: { x: number; y: number; visible: boolean; label?: string } | null;
  whiteboard: any[];
}

export async function startOrResumeSession(lesson: { id: string; teacher_id: string; student_id: string }) {
  // Reuse latest active or create
  const { data: existing } = await supabase
    .from("tutoring_live_sessions")
    .select("*")
    .eq("lesson_id", lesson.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing as unknown as LiveSession;

  const { data, error } = await supabase
    .from("tutoring_live_sessions")
    .insert({
      lesson_id: lesson.id,
      teacher_id: lesson.teacher_id,
      student_id: lesson.student_id,
      current_view: { type: "welcome" },
      whiteboard: [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as LiveSession;
}

export async function updateSession(id: string, patch: Partial<LiveSession>) {
  const { error } = await supabase
    .from("tutoring_live_sessions")
    .update(patch as any)
    .eq("id", id);
  if (error) throw error;
}

export async function endSession(id: string) {
  await supabase
    .from("tutoring_live_sessions")
    .update({ status: "ended", ended_at: new Date().toISOString() } as any)
    .eq("id", id);
}
