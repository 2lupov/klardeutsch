import { supabase } from "@/integrations/supabase/client";

export interface SlotChoice {
  starts_at: string;
  duration_min: number;
}

export interface SlotRequest {
  id: string;
  student_id: string;
  teacher_id: string | null;
  week_start: string;
  slots: SlotChoice[];
  note: string | null;
  status: "pending" | "approved" | "declined";
  created_at: string;
  updated_at: string;
}

const normalize = (r: any): SlotRequest => ({
  id: r.id,
  student_id: r.student_id,
  teacher_id: r.teacher_id ?? null,
  week_start: r.week_start,
  slots: Array.isArray(r.slots)
    ? (r.slots as any[])
        .filter((s) => s && s.starts_at)
        .map((s) => ({ starts_at: String(s.starts_at), duration_min: Number(s.duration_min) || 60 }))
    : [],
  note: r.note ?? null,
  status: (r.status as SlotRequest["status"]) ?? "pending",
  created_at: r.created_at,
  updated_at: r.updated_at,
});

/** Понеділок тижня, що починається після найближчої неділі (тиждень, на який плануємо). */
export function nextWeekStart(from = new Date()): string {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0 = Sunday
  const daysToMonday = dow === 0 ? 1 : 8 - dow;
  d.setDate(d.getDate() + daysToMonday);
  return d.toISOString().slice(0, 10);
}

/** Дати понеділок–субота обраного тижня для вибору часу. */
export function weekDays(weekStart: string): Date[] {
  const base = new Date(`${weekStart}T00:00:00`);
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

export function formatSlot(s: SlotChoice): string {
  const d = new Date(s.starts_at);
  return d.toLocaleString("uk-UA", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export async function getMyRequest(studentId: string, weekStart: string): Promise<SlotRequest | null> {
  const { data } = await supabase
    .from("lesson_slot_requests")
    .select("*")
    .eq("student_id", studentId)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? normalize(data) : null;
}

export async function createRequest(input: {
  studentId: string;
  teacherId?: string | null;
  weekStart: string;
  slots: SlotChoice[];
  note?: string;
}): Promise<SlotRequest> {
  const { data, error } = await supabase
    .from("lesson_slot_requests")
    .insert({
      student_id: input.studentId,
      teacher_id: input.teacherId ?? null,
      week_start: input.weekStart,
      slots: input.slots as any,
      note: input.note?.trim() || null,
      status: "pending",
    })
    .select("*")
    .single();
  if (error) throw error;
  return normalize(data);
}

export async function listRequests(status?: SlotRequest["status"]): Promise<SlotRequest[]> {
  let q = supabase.from("lesson_slot_requests").select("*").order("created_at", { ascending: false }).limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as any[]).map(normalize);
}

/** Підтверджує заявку та створює заняття у графіку. */
export async function approveRequest(req: SlotRequest, teacherId: string, studentName: string): Promise<void> {
  if (req.slots.length) {
    const { error: schedErr } = await supabase.from("school_schedule").insert(
      req.slots.map((s) => ({
        teacher_id: teacherId,
        student_id: req.student_id,
        title: `Заняття · ${studentName}`,
        starts_at: s.starts_at,
        duration_min: s.duration_min,
        status: "planned",
        notes: req.note,
      })),
    );
    if (schedErr) throw schedErr;
  }
  const { error } = await supabase
    .from("lesson_slot_requests")
    .update({ status: "approved", teacher_id: teacherId })
    .eq("id", req.id);
  if (error) throw error;
}

export async function declineRequest(id: string, teacherId: string): Promise<void> {
  const { error } = await supabase
    .from("lesson_slot_requests")
    .update({ status: "declined", teacher_id: teacherId })
    .eq("id", id);
  if (error) throw error;
}
