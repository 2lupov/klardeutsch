import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  askForBlocks,
  assertTeacher,
  blockCors,
  gatewayErrorResponse,
  jsonResponse,
  normalizeBlock,
} from "../_shared/lesson-blocks.ts";

/** Авто-ДЗ: збирає помилки учня в блоках і створює нові тренувальні блоки. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: blockCors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => ({}));
    const lessonId = String(body?.lesson_id ?? "");
    if (!lessonId) return jsonResponse({ error: "lesson_id is required" }, 400);

    const guard = await assertTeacher(admin, anon, authHeader, lessonId);
    if (guard.error) return guard.error;
    const lesson = guard.lesson;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI не налаштований" }, 500);

    const { data: blocks } = await admin
      .from("tutoring_lesson_blocks")
      .select("id, type, title, payload, sort_order")
      .eq("lesson_id", lessonId)
      .order("sort_order");
    const blockIds = (blocks ?? []).map((b: any) => b.id);
    if (blockIds.length === 0) return jsonResponse({ error: "У цьому уроці ще немає блоків" }, 400);

    const { data: answers } = await admin
      .from("tutoring_block_answers")
      .select("block_id, answers, score, max_score")
      .in("block_id", blockIds)
      .eq("student_id", lesson.student_id);

    const mistakes: string[] = [];
    (answers ?? []).forEach((a: any) => {
      const block: any = (blocks ?? []).find((b: any) => b.id === a.block_id);
      if (!block) return;
      const p: any = block.payload ?? {};
      const given: any = a.answers ?? {};
      if (block.type === "luecke") {
        (p.items ?? []).forEach((it: any, i: number) => {
          const g = String(given?.[i] ?? "").trim().toLowerCase();
          if (g !== String(it.answer ?? "").trim().toLowerCase()) {
            mistakes.push(`${it.sentence} → правильно "${it.answer}", учень: "${given?.[i] ?? "—"}"`);
          }
        });
      }
      if (block.type === "satzbau") {
        (p.sentences ?? []).forEach((s: any, i: number) => {
          const g: string[] = given?.[i] ?? [];
          const correct = (s.words ?? []).join(" ");
          if (g.join(" ") !== correct) mistakes.push(`Satzbau: ${correct}`);
        });
      }
      if (block.type === "paare") {
        (p.pairs ?? []).forEach((pr: any, i: number) => {
          if (String(given?.[i] ?? "") !== String(pr.right ?? "")) mistakes.push(`${pr.left} → ${pr.right}`);
        });
      }
    });

    const topics = (blocks ?? []).map((b: any) => b.title).filter(Boolean).join("; ").slice(0, 600);
    const prompt = [
      `Рівень ${lesson.level ?? "A2"}. Склади домашнє завдання для відпрацювання саме цих помилок учня.`,
      `Поверни один блок "luecke" з 8 НОВИХ речень і один блок "satzbau" з 4 НОВИХ речень на ті самі правила (інші приклади, не копіювати).`,
      mistakes.length ? `Помилки учня:\n${mistakes.slice(0, 25).join("\n").slice(0, 2500)}` : `Учень ще не робив вправ. Теми уроку: ${topics}`,
    ].join("\n");

    const ai = await askForBlocks(LOVABLE_API_KEY, [], prompt);
    if (ai.status !== 200) return gatewayErrorResponse(ai.status, ai.error);

    const norm = (ai.blocks.map(normalizeBlock).filter(Boolean) as any[])
      .filter((b) => b.type === "luecke" || b.type === "satzbau")
      .slice(0, 2);
    if (norm.length === 0) return jsonResponse({ error: "ШІ не змогла скласти домашку" }, 422);

    const base = ((blocks ?? []).at(-1)?.sort_order ?? 0) + 1;
    const rows = norm.map((b, i) => ({
      lesson_id: lessonId,
      type: b.type,
      title: `Домашка: ${b.title ?? b.type}`.slice(0, 200),
      payload: b.payload,
      sort_order: base + i,
      source: "ai",
      visible_to_student: true,
    }));

    const { error: insErr } = await admin.from("tutoring_lesson_blocks").insert(rows);
    if (insErr) return jsonResponse({ error: insErr.message }, 500);

    return jsonResponse({ ok: true, blocks: rows.length, mistakes: mistakes.length });
  } catch (e) {
    console.error("generate-block-homework error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
