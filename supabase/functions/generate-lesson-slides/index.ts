// Generate presentation slides for a course lesson via Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin only
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const lessonId: string = body.lesson_id;
    const extraPrompt: string = (body.prompt || "").trim();
    const targetSlides: number = Math.max(6, Math.min(20, Number(body.count) || 10));

    if (!lessonId) {
      return new Response(JSON.stringify({ error: "lesson_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lesson, error: lErr } = await supabase
      .from("course_lessons")
      .select("id, title, description, theory, content, exercises, course_id")
      .eq("id", lessonId)
      .maybeSingle();
    if (lErr || !lesson) {
      return new Response(JSON.stringify({ error: "lesson not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: course } = await supabase
      .from("courses")
      .select("title, level, target_language")
      .eq("id", lesson.course_id)
      .maybeSingle();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const theorySnippet = String(lesson.theory || "").slice(0, 4000);
    const exercisesSummary = Array.isArray(lesson.exercises)
      ? lesson.exercises.slice(0, 6).map((e: any) => `- ${e.question || e.type || ""}`).join("\n")
      : "";

    const systemPrompt = `Ти — методист, який робить лаконічні, гарні слайд-презентації уроків.
Створюєш JSON-масив слайдів для показу учням у браузері.

Формати слайдів (обирай доречні):
- { "type": "title",   "title": "...", "subtitle": "..." }             — обкладинка
- { "type": "bullets", "title": "...", "bullets": ["...","..."] }      — 3–5 коротких тез
- { "type": "vocab",   "title": "Словник", "words": [{"term":"","translation":"","example":""}] }
- { "type": "example", "title": "...", "text": "...", "note": "..." }  — приклад речення/правила
- { "type": "quiz",    "question": "...", "options": ["a","b","c"], "answer": "a" }
- { "type": "closing", "title": "...", "text": "..." }                 — підсумок / домашка

ПРАВИЛА:
- Мова слайдів — мова навчання (${course?.target_language || "de"}), пояснення українською де потрібно.
- Кожен слайд = ОДНА думка. Тексту мінімум, як у Apple keynote.
- Заголовки короткі (до 6 слів). Булети до 8 слів.
- 1 title слайд, 1 closing слайд, між ними — суміш bullets/vocab/example/quiz.
- Хоча б 1 vocab-слайд і 1 quiz-слайд, якщо матеріалу вистачає.

ВІДПОВІДАЙ ТІЛЬКИ валідним JSON:
{ "slides": [ ... ] }`;

    const userMsg = `Курс: "${course?.title || ""}" (рівень ${course?.level || "A1"}).
Урок: "${lesson.title}"${lesson.description ? ` — ${lesson.description}` : ""}.

Теорія уроку:
${theorySnippet || "(немає)"}

${exercisesSummary ? `Приклади вправ уроку:\n${exercisesSummary}\n` : ""}
${extraPrompt ? `Додаткові побажання вчителя: ${extraPrompt}\n` : ""}

Створи РІВНО ${targetSlides} слайдів. Тільки JSON.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";

    const tryParse = (s: string): any | null => {
      try { return JSON.parse(s); } catch {}
      const m = s.match(/\{[\s\S]*\}/);
      if (m) { try { return JSON.parse(m[0]); } catch {} }
      // Strip trailing commas
      const cleaned = s.replace(/,(\s*[}\]])/g, "$1");
      try { return JSON.parse(cleaned); } catch {}
      const m2 = cleaned.match(/\{[\s\S]*\}/);
      if (m2) { try { return JSON.parse(m2[0]); } catch {} }
      return null;
    };

    let parsed: any = tryParse(content);

    // Repair attempt: ask AI to return valid JSON only
    if (!parsed || !Array.isArray(parsed.slides)) {
      console.warn("First parse failed, attempting repair");
      const repairRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
        reasoning_effort: "low",
          messages: [
            { role: "system", content: 'Виправ і поверни ТІЛЬКИ валідний JSON у форматі {"slides":[...]}. Без пояснень, без markdown.' },
            { role: "user", content: content.slice(0, 12000) },
          ],
          response_format: { type: "json_object" },
        }),
      });
      if (repairRes.ok) {
        const rd = await repairRes.json();
        parsed = tryParse(rd.choices?.[0]?.message?.content || "{}");
      }
    }

    const slides = Array.isArray(parsed.slides) ? parsed.slides : [];
    if (slides.length === 0) {
      return new Response(JSON.stringify({ error: "AI returned no slides" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Merge into course_lessons.content.slides
    const prevContent = (lesson.content && typeof lesson.content === "object" && !Array.isArray(lesson.content))
      ? lesson.content as Record<string, unknown>
      : {};
    const nextContent = { ...prevContent, slides, slides_generated_at: new Date().toISOString() };

    const { error: upErr } = await supabase
      .from("course_lessons")
      .update({ content: nextContent })
      .eq("id", lessonId);
    if (upErr) {
      console.error(upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, slides }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
