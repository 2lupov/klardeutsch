// Analyze completed placement test with AI and notify the teacher
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { assignmentId } = await req.json();
    if (!assignmentId) {
      return new Response(JSON.stringify({ error: "assignmentId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load assignment (RLS allows teacher or student)
    const { data: a, error: aErr } = await supabase
      .from("tutoring_placement_assignments")
      .select("*")
      .eq("id", assignmentId)
      .single();
    if (aErr || !a) throw new Error(aErr?.message || "assignment not found");
    if (a.status !== "completed") {
      return new Response(JSON.stringify({ error: "test not completed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load questions (use admin client — bypass to ensure all)
    const { data: questions } = await admin
      .from("tutoring_placement_questions")
      .select("id, level, question_type, question, options, correct_index, explanation")
      .in("id", a.question_ids as string[]);

    if (!questions?.length) throw new Error("no questions");

    const qById = new Map(questions.map((q: any) => [q.id, q]));
    const ordered = (a.question_ids as string[]).map((id) => qById.get(id)).filter(Boolean);
    const answers = a.answers as number[];

    // Build per-skill stats and a list of mistakes
    const bySkill: Record<string, { correct: number; total: number }> = {};
    const mistakes: Array<{ level: string; type: string; q: string; chosen: string; correct: string }> = [];
    ordered.forEach((q: any, i: number) => {
      const sk = q.question_type;
      bySkill[sk] = bySkill[sk] || { correct: 0, total: 0 };
      bySkill[sk].total++;
      if (answers[i] === q.correct_index) bySkill[sk].correct++;
      else if (answers[i] !== undefined) {
        mistakes.push({
          level: q.level,
          type: q.question_type,
          q: q.question,
          chosen: q.options[answers[i]] ?? "—",
          correct: q.options[q.correct_index] ?? "—",
        });
      }
    });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Ты опытный методист немецкого языка. Анализируешь результат placement-теста для преподавателя индивидуальных занятий.

Твоя задача — дать преподавателю КОНКРЕТНЫЙ, ПРАКТИЧНЫЙ план работы с учеником на основе его ошибок.

Отвечай СТРОГО валидным JSON без Markdown:
{
  "summary": "1-2 предложения: общий уровень и впечатление о ученике (рус).",
  "strengths": ["Сильная сторона 1", "Сильная сторона 2"],
  "weaknesses": ["Конкретный пробел 1 (с грамматическим/лексическим описанием)", "Пробел 2", "Пробел 3"],
  "skill_breakdown": {
    "grammar": "Оценка по грамматике (1-2 предложения, с конкретными темами).",
    "vocab": "Оценка по лексике.",
    "cloze": "Оценка по заполнению пропусков.",
    "listening": "Оценка по аудированию (если были).",
    "reading": "Оценка по чтению (если было)."
  },
  "recommended_topics": [
    {"topic": "Konkrete grammatische Tema (нем.)", "why": "Почему именно это (рус)", "priority": "high|medium|low"},
    {"topic": "...", "why": "...", "priority": "..."}
  ],
  "first_3_lessons": [
    {"focus": "Тема урока 1", "goals": "Что освоить", "exercises": "Какие упражнения"},
    {"focus": "Тема урока 2", "goals": "...", "exercises": "..."},
    {"focus": "Тема урока 3", "goals": "...", "exercises": "..."}
  ],
  "warning": "Опционально: красный флаг (напр. 'отвечал случайно' или 'возможно использовал переводчик') или null."
}

ПРАВИЛА:
- Будь КОНКРЕТНЫМ: вместо "слабая грамматика" пиши "путает Akkusativ и Dativ после wechselpräpositionen".
- Анализируй ИМЕННО ошибки которые допустил ученик, не общие фразы.
- recommended_topics: 3-5 пунктов, отсортированы по приоритету.
- first_3_lessons: реальный, готовый к использованию план первых занятий.
- Если ученик отвечал явно случайно (например, на A1 ошибается, а на C1 правильно) — поставь warning.`;

    const userMsg = `Рекомендованный по %правил уровень: ${a.recommended_level}
Общий балл: ${a.total_score}/${a.total_questions}
Длительность: ${Math.floor((a.duration_seconds || 0) / 60)} мин
Включённые уровни: ${(a.selected_levels || []).join(", ")}

=== Результаты по уровням ===
${Object.entries(a.scores_by_level || {}).map(([l, s]: any) => `${l}: ${s.correct}/${s.total} (${Math.round(s.correct/s.total*100)}%)`).join("\n")}

=== Результаты по навыкам ===
${Object.entries(bySkill).map(([sk, s]) => `${sk}: ${s.correct}/${s.total} (${Math.round(s.correct/s.total*100)}%)`).join("\n")}

=== Ошибки ученика (всего ${mistakes.length}) ===
${mistakes.slice(0, 25).map((m, i) => `${i+1}. [${m.level}/${m.type}] "${m.q}" → выбрал "${m.chosen}" вместо "${m.correct}"`).join("\n")}

Дай план работы преподавателю.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error:", aiRes.status, t);
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error");
    }
    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let analysis: any;
    try { analysis = JSON.parse(content); }
    catch {
      const m = content.match(/\{[\s\S]*\}/);
      analysis = m ? JSON.parse(m[0]) : {};
    }

    // Save analysis (admin to bypass RLS — caller might be student)
    await admin
      .from("tutoring_placement_assignments")
      .update({ ai_analysis: analysis })
      .eq("id", assignmentId);

    // Notify teacher via Telegram (if configured)
    try {
      const TG_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
      const { data: tProfile } = await admin
        .from("profiles")
        .select("telegram_chat_id, display_name")
        .eq("user_id", a.teacher_id)
        .maybeSingle();
      const { data: sProfile } = await admin
        .from("profiles")
        .select("display_name, nickname")
        .eq("user_id", a.student_id)
        .maybeSingle();
      const studentName = sProfile?.display_name || sProfile?.nickname || "учня";

      if (TG_TOKEN && tProfile?.telegram_chat_id) {
        const pct = a.total_questions ? Math.round((a.total_score / a.total_questions) * 100) : 0;
        const text =
`🎓 *Учень "${studentName}" завершив тест*

📊 Результат: *${a.total_score}/${a.total_questions}* (${pct}%)
🎯 Рекомендований рівень: *${a.recommended_level}*
⏱ Час: ${Math.floor((a.duration_seconds || 0) / 60)} хв

🤖 *AI-аналіз:*
${analysis.summary || ""}

⚠️ Слабкі місця:
${(analysis.weaknesses || []).slice(0,3).map((w: string) => `• ${w}`).join("\n")}

Повний аналіз і план перших уроків — у платформі.`;
        await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: tProfile.telegram_chat_id,
            text,
            parse_mode: "Markdown",
          }),
        });
      }
    } catch (e) {
      console.error("TG notify failed:", e);
    }

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
