import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  askForBlocks,
  assertTeacher,
  blockCors,
  gatewayErrorResponse,
  imagesAsDataUrls,
  jsonResponse,
  normalizeBlock,
} from "../_shared/lesson-blocks.ts";

/** Уся Lektion за раз: Kursbuch-урок → Arbeitsbuch-тренування → фінальний тест. */
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

    const level = String(body?.level ?? lesson.level ?? "A2").slice(0, 5);
    const kursPaths: string[] = Array.isArray(body?.kursbuch_paths) ? body.kursbuch_paths.slice(0, 6).map(String) : [];
    const arbeitPaths: string[] = Array.isArray(body?.arbeitsbuch_paths) ? body.arbeitsbuch_paths.slice(0, 6).map(String) : [];
    if (kursPaths.length === 0 && arbeitPaths.length === 0) {
      return jsonResponse({ error: "Потрібні сторінки Kursbuch або Arbeitsbuch" }, 400);
    }

    const { count } = await admin
      .from("tutoring_lesson_blocks")
      .select("id", { count: "exact", head: true })
      .eq("lesson_id", lessonId);
    let order = count ?? 0;
    const created: Record<string, number> = { kursbuch: 0, arbeitsbuch: 0, test: 0 };
    const rows: any[] = [];
    const collectedText: string[] = [];

    const pass = async (paths: string[], focus: "kursbuch" | "arbeitsbuch", prefix: string) => {
      if (paths.length === 0) return;
      const urls = await imagesAsDataUrls(admin, paths);
      if (urls.length === 0) return;
      const ai = await askForBlocks(
        LOVABLE_API_KEY,
        urls,
        `Рівень: ${level}. Фокус: ${focus === "kursbuch" ? "Kursbuch — читання та аудіо" : "Arbeitsbuch — грамматика й тренування"}. Перетвори сторінки в інтерактивні блоки.`,
      );
      if (ai.status !== 200) throw Object.assign(new Error("gateway"), { status: ai.status, details: ai.error });
      const norm = ai.blocks.map(normalizeBlock).filter(Boolean) as any[];
      norm.slice(0, 10).forEach((b) => {
        if (b.type === "lesen" && b.payload?.text) collectedText.push(String(b.payload.text).slice(0, 1200));
        rows.push({
          lesson_id: lessonId,
          type: b.type,
          title: `${prefix}: ${b.title ?? b.type}`.slice(0, 200),
          payload: b.payload,
          sort_order: order++,
          source: "ai",
          visible_to_student: true,
        });
        created[focus]++;
      });
    };

    try {
      await pass(kursPaths, "kursbuch", "Kursbuch");
      await pass(arbeitPaths, "arbeitsbuch", "Arbeitsbuch");
    } catch (e: any) {
      if (e?.status) return gatewayErrorResponse(e.status, e.details);
      throw e;
    }

    // Фінальний тест за матеріалом лекції
    if (rows.length > 0) {
      const testPrompt = [
        `Рівень ${level}. За матеріалом цієї лекції склади ФІНАЛЬНИЙ ТЕСТ:`,
        `один блок "luecke" з 8 речень і один блок "satzbau" з 4 речень.`,
        collectedText.length ? `Текст лекції: ${collectedText.join("\n").slice(0, 3000)}` : "",
        `Теми вправ: ${rows.map((r) => r.title).join("; ").slice(0, 800)}`,
      ]
        .filter(Boolean)
        .join("\n");
      const ai = await askForBlocks(LOVABLE_API_KEY, [], testPrompt);
      if (ai.status === 200) {
        (ai.blocks.map(normalizeBlock).filter(Boolean) as any[])
          .filter((b) => b.type === "luecke" || b.type === "satzbau")
          .slice(0, 2)
          .forEach((b) => {
            rows.push({
              lesson_id: lessonId,
              type: b.type,
              title: `Тест: ${b.title ?? b.type}`.slice(0, 200),
              payload: b.payload,
              sort_order: order++,
              source: "ai",
              visible_to_student: true,
            });
            created.test++;
          });
      }
    }

    if (rows.length === 0) return jsonResponse({ error: "ШІ не знайшла завдань на цих сторінках" }, 422);

    const { error: insErr } = await admin.from("tutoring_lesson_blocks").insert(rows);
    if (insErr) {
      console.error("insert lektion blocks failed:", insErr);
      return jsonResponse({ error: insErr.message }, 500);
    }

    return jsonResponse({ ok: true, total: rows.length, created });
  } catch (e) {
    console.error("generate-lektion-pipeline error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
