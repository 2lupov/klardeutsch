import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { blockCors, jsonResponse } from "../_shared/lesson-blocks.ts";

const esc = (v: unknown) =>
  String(v ?? "—").slice(0, 300).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Авто-звіт після уроку: бали, теми, помилки — у Telegram учню і викладачу. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: blockCors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anon.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = String((claims.claims as any).sub);

    const body = await req.json().catch(() => ({}));
    const lessonId = String(body?.lesson_id ?? "");
    if (!lessonId) return jsonResponse({ error: "lesson_id is required" }, 400);

    const { data: lesson } = await admin
      .from("tutoring_lessons")
      .select("id, title, level, teacher_id, student_id, topic")
      .eq("id", lessonId)
      .maybeSingle();
    if (!lesson) return jsonResponse({ error: "Урок не знайдено" }, 404);
    if (lesson.teacher_id !== userId && lesson.student_id !== userId) {
      return jsonResponse({ error: "Немає доступу до цього уроку" }, 403);
    }

    const { data: blocks } = await admin
      .from("tutoring_lesson_blocks")
      .select("id, title, type")
      .eq("lesson_id", lessonId)
      .order("sort_order");
    const blockIds = (blocks ?? []).map((b: any) => b.id);
    if (blockIds.length === 0) return jsonResponse({ error: "У цьому уроці ще немає блоків" }, 400);

    const { data: answers } = await admin
      .from("tutoring_block_answers")
      .select("block_id, score, max_score")
      .in("block_id", blockIds)
      .eq("student_id", lesson.student_id);

    let score = 0;
    let max = 0;
    const weak: string[] = [];
    (answers ?? []).forEach((a: any) => {
      score += a.score ?? 0;
      max += a.max_score ?? 0;
      if ((a.max_score ?? 0) > 0 && (a.score ?? 0) / a.max_score < 0.7) {
        const b = (blocks ?? []).find((x: any) => x.id === a.block_id);
        if (b?.title) weak.push(b.title);
      }
    });
    const percent = max > 0 ? Math.round((score / max) * 100) : 0;

    const { data: profs } = await admin
      .from("profiles")
      .select("user_id, display_name, telegram_chat_id")
      .in("user_id", [lesson.student_id, lesson.teacher_id]);
    const student = (profs ?? []).find((p: any) => p.user_id === lesson.student_id);
    const teacher = (profs ?? []).find((p: any) => p.user_id === lesson.teacher_id);

    const text = [
      "📊 <b>Звіт після уроку</b>",
      "",
      `👤 Учень: ${esc(student?.display_name)}`,
      `📚 Урок: ${esc(lesson.title)} (${esc(lesson.level)})`,
      lesson.topic ? `🎯 Тема: ${esc(lesson.topic)}` : "",
      `✅ Результат: <b>${score}/${max}</b> (${percent}%)`,
      weak.length ? `⚠️ Варто повторити: ${esc(weak.slice(0, 4).join(", "))}` : "🌟 Помилок майже немає!",
      `🕐 ${new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })} (Kyiv)`,
    ]
      .filter(Boolean)
      .join("\n");

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) return jsonResponse({ ok: true, sent: 0, report: { score, max, percent }, note: "Telegram не налаштований" });

    const chats = [student?.telegram_chat_id, teacher?.telegram_chat_id].filter(Boolean);
    let sent = 0;
    for (const chat of chats) {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chat, text, parse_mode: "HTML", disable_web_page_preview: true }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok && d?.ok) sent++;
      else console.error("telegram send failed:", JSON.stringify(d).slice(0, 300));
    }

    return jsonResponse({ ok: true, sent, report: { score, max, percent, weak } });
  } catch (e) {
    console.error("notify-lesson-report error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
