// Generate full tutoring lesson content (theory, words, exercises, homework) via Lovable AI
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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isTeacher = roles?.some((r: any) => r.role === "teacher" || r.role === "admin");
    if (!isTeacher) {
      return new Response(JSON.stringify({ error: "Only teachers can generate lessons" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      topic,
      level,
      focus,
      studentNotes,
      freePrompt,
      wordsCount = 10,
      exercisesCount = 8,
      exerciseTypes = ["quiz", "cloze", "translation"],
      vocabulary = [],
      theoryTemplate,
    } = await req.json();

    if (!topic && !freePrompt) {
      return new Response(JSON.stringify({ error: "topic or freePrompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const finalLevel = level || "A1";
    const finalTopic = topic || "Allgemein";

    const vocabHint = vocabulary.length
      ? `\n- ОБЯЗАТЕЛЬНО включи и активно используй эти слова: ${vocabulary.map((v: any) => typeof v === "string" ? v : v.german).join(", ")}`
      : "";

    const exTypesAllowed = Array.isArray(exerciseTypes) && exerciseTypes.length
      ? exerciseTypes
      : ["quiz", "cloze", "translation"];

    const systemPrompt = `Du bist ein erfahrener Deutschlehrer. Erstelle eine vollständige, strukturierte Online-Unterrichtsstunde auf Deutsch (CEFR-Niveau ${finalLevel}).

Thema: "${finalTopic}"
${freePrompt ? `\nЧТО НУЖНО СЕГОДНЯ (от учителя):\n${freePrompt}\n` : ""}

Antworte NUR mit gültigem JSON ohne Markdown:
{
  "title": "Короткий точний заголовок (3-6 слів)",
  "presentation": [
    {"slide": 1, "heading": "Введение", "content": "Що сьогодні вчимо, навіщо це потрібно (2-3 речення)."},
    {"slide": 2, "heading": "Тема дня", "content": "..."},
    {"slide": 3, "heading": "Ключові слова", "content": "..."},
    {"slide": 4, "heading": "Граматика / правила", "content": "..."},
    {"slide": 5, "heading": "Приклади", "content": "..."},
    {"slide": 6, "heading": "Підсумок", "content": "..."}
  ],
  "theory": "Структурована теорія російською з Markdown (## заголовки, списки, **bold**, > цитати, приклади на німецькій). 400-700 слів. Включи: вступ, правила, приклади, типові помилки, підказки.",
  "words": [
    {"german": "...", "article": "der|die|das|null", "russian": "перевод", "example": "Полное немецкое предложение."}
  ],
  "exercises": [
    {"type": "quiz", "question": "...", "options": ["A","B","C","D"], "correct_answer": "A", "explanation": "..."},
    {"type": "cloze", "question": "Ich ___ nach Berlin.", "correct_answer": "fahre", "explanation": "..."},
    {"type": "translation", "question": "Переведи: Я иду домой.", "correct_answer": "Ich gehe nach Hause.", "explanation": "..."}
  ],
  "homework": [
    {"description": "Конкретне завдання для самостійної роботи (рос. + приклади на німецькій)."}
  ]
}

Требования:
- Ровно ${wordsCount} слов в словарі (±2)
- Ровно ${exercisesCount} вправ (±1) ТІЛЬКИ цих типів: ${exTypesAllowed.join(", ")}
- 2-3 домашніх завдання
- 6 слайдів презентації
- Уровень строго ${finalLevel}${vocabHint}
${focus ? `- Особливий фокус: ${focus}` : ""}
${theoryTemplate ? `- Шаблон теорії (адаптуй під тему): ${theoryTemplate}` : ""}
${studentNotes ? `- Враховуй замітки про учня: ${studentNotes}` : ""}`;

    const userMsg = freePrompt
      ? `Підготуй заняття згідно інструкції: "${freePrompt}". Тема: ${finalTopic}, рівень ${finalLevel}.`
      : `Створи урок: тема "${finalTopic}", рівень ${finalLevel}.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    return new Response(JSON.stringify({ success: true, lesson: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
