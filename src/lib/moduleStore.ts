import { supabase } from "@/integrations/supabase/client";
import { CURRICULUM, type CurriculumModule } from "./curriculum";
import type { GlossaryEntry } from "./vocabStore";

export type ModuleStatus = "locked" | "unlocked" | "passed";

export type ModuleContent = {
  title: string;
  text: string;
  text_ru: string;
  glossary: GlossaryEntry[];
  grammar?: { rule: string; items: { q: string; options: string[]; answer: number; why: string }[] };
  quiz: { q_ru: string; options: string[]; answer: number }[];
};

type Row = { module_id: string; status: "unlocked" | "passed"; best_score: number | null; attempts: number; content_json: ModuleContent | null };

export async function getProgressMap(): Promise<Map<string, Row>> {
  const { data, error } = await supabase.from("dutch_module_progress").select("*");
  if (error) throw error;
  const map = new Map<string, Row>();
  for (const row of (data ?? []) as any[]) map.set(row.module_id, row);
  return map;
}

/** locked/unlocked/passed решается на клиенте: из фиксированного порядка
 *  CURRICULUM плюс тем, что реально есть в базе — не нужно заранее
 *  проставлять статус всем 28 модулям каждому пользователю. */
export function resolveStatus(mod: CurriculumModule, progress: Map<string, Row>): ModuleStatus {
  const row = progress.get(mod.id);
  if (row?.status === "passed") return "passed";
  if (row) return "unlocked";
  if (mod.order === 1) return "unlocked";
  const prev = CURRICULUM.find((m) => m.order === mod.order - 1);
  if (prev && progress.get(prev.id)?.status === "passed") return "unlocked";
  return "locked";
}

export async function getOrCreateContent(mod: CurriculumModule, generate: () => Promise<ModuleContent>): Promise<ModuleContent> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Не авторизован");

  const { data: existing } = await supabase.from("dutch_module_progress").select("*").eq("module_id", mod.id).maybeSingle();
  if (existing?.content_json) return existing.content_json as ModuleContent;

  const content = await generate();
  const { error } = await supabase.from("dutch_module_progress").upsert(
    { user_id: auth.user.id, module_id: mod.id, content_json: content, status: existing?.status ?? "unlocked" },
    { onConflict: "user_id,module_id" }
  );
  if (error) throw error;
  return content;
}

export async function passModule(moduleId: string, score: number): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: existing } = await supabase.from("dutch_module_progress").select("best_score, attempts").eq("module_id", moduleId).maybeSingle();
  const best = Math.max(existing?.best_score ?? 0, score);
  const { error } = await supabase.from("dutch_module_progress").upsert(
    { user_id: auth.user.id, module_id: moduleId, status: "passed", best_score: best, attempts: (existing?.attempts ?? 0) + 1 },
    { onConflict: "user_id,module_id" }
  );
  if (error) throw error;
}

export async function recordAttempt(moduleId: string, score: number): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return;
  const { data: existing } = await supabase.from("dutch_module_progress").select("best_score, attempts, status").eq("module_id", moduleId).maybeSingle();
  const best = Math.max(existing?.best_score ?? 0, score);
  const { error } = await supabase.from("dutch_module_progress").upsert(
    { user_id: auth.user.id, module_id: moduleId, status: existing?.status ?? "unlocked", best_score: best, attempts: (existing?.attempts ?? 0) + 1 },
    { onConflict: "user_id,module_id" }
  );
  if (error) throw error;
}
