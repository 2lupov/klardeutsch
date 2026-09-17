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

    const imagePaths: string[] = Array.isArray(body?.image_paths) ? body.image_paths.slice(0, 8).map(String) : [];
    if (imagePaths.length === 0) return jsonResponse({ error: "Потрібно хоча б одну сторінку" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI не налаштований" }, 500);

    const dataUrls = await imagesAsDataUrls(admin, imagePaths);
    if (dataUrls.length === 0) return jsonResponse({ error: "Не вдалося прочитати сторінки" }, 400);

    const level = String(body?.level ?? lesson.level ?? "A2").slice(0, 5);
    const focus = body?.focus === "arbeitsbuch" ? "arbeitsbuch" : "kursbuch";
    const instructions = String(body?.instructions ?? "").slice(0, 1500);

    const userText = [
      `Рівень: ${level}. Фокус: ${focus === "arbeitsbuch" ? "Arbeitsbuch — грамматика й тренування (більше luecke, satzbau, paare)" : "Kursbuch — читання та аудіо (більше lesen, hoer)"}.`,
      instructions ? `Побажання викладача: ${instructions}` : "",
      "Перетвори ці сторінки в інтерактивні блоки уроку.",
    ]
      .filter(Boolean)
      .join("\n");

    const ai = await askForBlocks(LOVABLE_API_KEY, dataUrls, userText);
    if (ai.status !== 200) return gatewayErrorResponse(ai.status, ai.error);

    const normalized = ai.blocks.map(normalizeBlock).filter(Boolean).slice(0, 10) as Array<{
      type: string;
      title: string | null;
      payload: any;
    }>;
    if (normalized.length === 0) return jsonResponse({ error: "ШІ не знайшла завдань на цих сторінках" }, 422);

    const { count } = await admin
      .from("tutoring_lesson_blocks")
      .select("id", { count: "exact", head: true })
      .eq("lesson_id", lessonId);
    const base = count ?? 0;

    const rows = normalized.map((b, i) => ({
      lesson_id: lessonId,
      type: b.type,
      title: b.title,
      payload: b.payload,
      sort_order: base + i,
      source: "ai",
      visible_to_student: true,
    }));

    const { data: inserted, error: insErr } = await admin.from("tutoring_lesson_blocks").insert(rows).select("id");
    if (insErr) {
      console.error("insert blocks failed:", insErr);
      return jsonResponse({ error: insErr.message }, 500);
    }

    return jsonResponse({ ok: true, blocks: inserted?.length ?? 0, page_paths: imagePaths });
  } catch (e) {
    console.error("pdf-to-lesson-blocks error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
