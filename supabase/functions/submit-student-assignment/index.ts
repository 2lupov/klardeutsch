import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_CHAT_ID = "5109895086";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const esc = (v: unknown) =>
  String(v ?? "—").slice(0, 400).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const TYPE_LABEL: Record<string, string> = {
  test: "🧪 Тест",
  homework: "📚 Домашка",
  writing: "✍️ Письмо",
  audio: "🎙 Аудіо / вимова",
};

async function notifyTelegram(text: string) {
  const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN not set");
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) console.error(`Telegram failed [${res.status}]:`, JSON.stringify(data));
  } catch (e) {
    console.error("Telegram error:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = String((claimsData.claims as any).sub);

    const body = await req.json().catch(() => ({}));
    const assignmentId = String(body?.assignment_id ?? "");
    if (!assignmentId) return json({ error: "assignment_id is required" }, 400);

    const answers = Array.isArray(body?.answers) ? body.answers : null;
    const textAnswer = body?.text ? String(body.text).slice(0, 20000) : null;
    const files = Array.isArray(body?.files) ? body.files.slice(0, 10) : [];
    const audioPath = body?.audio_path ? String(body.audio_path) : null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: assignment, error: aErr } = await admin
      .from("student_assignments")
      .select("*")
      .eq("id", assignmentId)
      .maybeSingle();

    if (aErr || !assignment) return json({ error: "Завдання не знайдено" }, 404);
    if (assignment.student_id !== userId) return json({ error: "Немає доступу" }, 403);

    // Server-side test scoring
    let autoScore: number | null = null;
    let correctCount = 0;
    let totalCount = 0;
    const mistakes: Array<{ q: string; given: string; correct: string }> = [];

    if (assignment.type === "test") {
      const questions = ((assignment.payload as any)?.questions ?? []) as any[];
      totalCount = questions.length;
      questions.forEach((q, i) => {
        const given = answers?.[i];
        const ok = Number(given) === Number(q.correct_index);
        if (ok) correctCount++;
        else {
          mistakes.push({
            q: String(q.question ?? ""),
            given: given == null ? "—" : String(q.options?.[Number(given)] ?? given),
            correct: String(q.options?.[Number(q.correct_index)] ?? ""),
          });
        }
      });
      autoScore = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : null;
    }

    // AI feedback for writing
    let aiFeedback: string | null = null;
    if (assignment.type === "writing" && textAnswer) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Ти — викладач мовної школи KLAR. Перевір письмову роботу учня рівня ${assignment.level ?? "A1"}.
Відповідай УКРАЇНСЬКОЮ у markdown за структурою:
## 📝 Оцінка (1-10)
## ✅ Що добре
## ❌ Помилки (фраза → виправлення + коротке пояснення)
## 💪 Порада
На початку окремим рядком напиши: SCORE: <число 1-10>`,
              },
              {
                role: "user",
                content: `Завдання: ${assignment.title}\n${assignment.instructions ?? ""}\n\nТекст учня:\n${textAnswer}`,
              },
            ],
          }),
        });
        if (res.ok) {
          const data = await res.json();
          aiFeedback = data?.choices?.[0]?.message?.content ?? null;
        } else {
          const details = await res.text();
          console.error(`AI gateway error [${res.status}]: ${details}`);
        }
      }
    }

    const { data: submission, error: sErr } = await admin
      .from("student_submissions")
      .insert({
        assignment_id: assignmentId,
        student_id: userId,
        answers: answers,
        text: textAnswer,
        files,
        audio_path: audioPath,
        auto_score: autoScore,
        ai_feedback: aiFeedback,
        status: "submitted",
      })
      .select()
      .single();

    if (sErr) {
      console.error("insert submission failed:", sErr);
      return json({ error: sErr.message }, 500);
    }

    await admin
      .from("student_assignments")
      .update({ status: "submitted" })
      .eq("id", assignmentId);

    // Student name
    const { data: profile } = await admin
      .from("profiles")
      .select("display_name, nickname")
      .eq("user_id", userId)
      .maybeSingle();
    const studentName = profile?.display_name || profile?.nickname || "Учень";

    const lines: string[] = [
      "📥 <b>Нова здача завдання</b>",
      "",
      `👤 <b>Учень:</b> ${esc(studentName)}`,
      `${TYPE_LABEL[assignment.type] ?? assignment.type} <b>${esc(assignment.title)}</b>`,
    ];

    if (assignment.type === "test") {
      lines.push(`📊 <b>Результат:</b> ${correctCount}/${totalCount} (${autoScore ?? 0}%)`);
      if (mistakes.length) {
        lines.push("", "<b>Помилки:</b>");
        mistakes.slice(0, 6).forEach((m) => {
          lines.push(`• ${esc(m.q)}\n   ❌ ${esc(m.given)} → ✅ ${esc(m.correct)}`);
        });
        if (mistakes.length > 6) lines.push(`… та ще ${mistakes.length - 6}`);
      } else {
        lines.push("🎉 Без помилок!");
      }
    }

    if (assignment.type === "writing") {
      const scoreMatch = aiFeedback?.match(/SCORE:\s*(\d+)/i);
      if (scoreMatch) lines.push(`🤖 <b>AI-оцінка:</b> ${scoreMatch[1]}/10`);
      if (aiFeedback) lines.push("", esc(aiFeedback.replace(/SCORE:\s*\d+/i, "").slice(0, 700)));
    }

    if (assignment.type === "homework") {
      if (textAnswer) lines.push("", `💬 ${esc(textAnswer.slice(0, 500))}`);
      if (files.length) lines.push(`📎 Файлів: ${files.length}`);
    }

    if (assignment.type === "audio") {
      lines.push(audioPath ? "🎧 Аудіо-запис доданий" : "⚠️ Без аудіо");
    }

    lines.push("", "🔎 Перевірити: адмінка → Завдання");
    lines.push(`🕐 ${new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })} (Kyiv)`);

    await notifyTelegram(lines.join("\n"));

    return json({
      ok: true,
      submission_id: submission.id,
      auto_score: autoScore,
      correct: correctCount,
      total: totalCount,
      mistakes,
      ai_feedback: aiFeedback,
    });
  } catch (e) {
    console.error("submit-student-assignment error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
