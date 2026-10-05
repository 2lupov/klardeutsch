import { supabase } from "@/integrations/supabase/client";
import type { Attempt } from "./passport";
import type { Rubric } from "./types";
import catalogJson from "@/data/catalog.json";
import type { CatalogCourse, CourseContent } from "./types";

export const CATALOG = catalogJson as CatalogCourse[];

const courseFiles = import.meta.glob<{ default: CourseContent }>("@/data/courses/*.json");
export async function loadCourse(code: string): Promise<CourseContent | null> {
  const key = Object.keys(courseFiles).find((k) => k.endsWith(`/${code}.json`));
  if (!key) return null;
  return (await courseFiles[key]()).default;
}

export interface AttemptRow extends Attempt {
  id: string;
  course_code: string;
  can_do_key: string;
  lesson_id: string | null;
  exercise_id: string | null;
  auto_score: number | null;
}

const CACHE = "klar_skill_attempts";

export async function fetchAttempts(userId: string): Promise<AttemptRow[]> {
  const { data, error } = await supabase
    .from("skill_attempts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) {
    try { return JSON.parse(localStorage.getItem(CACHE) || "[]"); } catch { return []; }
  }
  const rows = (data ?? []) as unknown as AttemptRow[];
  localStorage.setItem(CACHE, JSON.stringify(rows));
  return rows;
}

export async function saveAttempt(input: {
  userId: string; courseCode: string; canDoKey: string; lessonId: string; exerciseId: string;
  withSupport: boolean; newSituation: boolean; rubric: Rubric;
}) {
  const { error } = await supabase.from("skill_attempts").insert({
    user_id: input.userId,
    course_code: input.courseCode,
    can_do_key: input.canDoKey,
    lesson_id: input.lessonId,
    exercise_id: input.exerciseId,
    with_support: input.withSupport,
    new_situation: input.newSituation,
    rubric: input.rubric,
  });
  if (error) throw error;
}
