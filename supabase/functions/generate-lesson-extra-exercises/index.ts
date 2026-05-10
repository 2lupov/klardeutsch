// Generate additional exercises for an existing tutoring lesson via Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_TYPES = [
  "quiz", "cloze", "translation", "article", "word_order",
  "conjugation", "plural", "error_correction", "synonym", "antonym",
  "question_formation", "dictation",
];

const TYPE_GLOSSARY = `
ДОВІДНИК ТИПІВ ВПРАВ (використовуй ТОЧНО ці значення в полі "type"):
- "quiz" — питання + 4 варіанти у options, 1 правильний у correct_answer.
- "cloze" — речення з ___ , у correct_answer тільки слово/форма для пропуску.
- "translation" — у question російське/українське речення "Переведи: ...", correct_answer — повне нім. речення.
- "article" — quiz з 3 options ["der","die","das"], question = іменник без артикля, correct_answer = правильний артикль.
- "word_order" — у question слова через " / " у випадковому порядку, correct_answer — правильно складене речення.
- "conjugation" — question формату "Спрягай: ich (gehen) heute ins Kino", correct_answer — правильна форма.
- "plural" — question = іменник в однині з артиклем, correct_answer = форма множини з артиклем.
- "error_correction" — question містить нім. речення з 1 помилкою + "Виправ помилку:", correct_answer — виправлене речення.
- "synonym" — question = "Синонім до: <слово>", correct_answer — нім. синонім.
- "antonym" — question = "Антонім до: <слово>", correct_answer — нім. антонім.
- "question_formation" — question = "Утвори питання до: <речення>", correct_answer — нім. питання зі знаком "?".
- "dictation" — question = "Запиши почуте: <нім. речення>", correct_answer = саме це речення.

Для всіх типів КРІМ "quiz" поле options НЕ ставити (або []). explanation — обов'язково російською (1-2 речення).
Для quiz перемішуй правильну відповідь — вона НЕ повинна завжди бути першою.
`;

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

    const body = await req.json();
    const lessonId: string = body.lesson_id;
    const prompt: string = (body.prompt || "").trim();
    const requestedTypes: string[] = Array.isArray(body.types) && body.types.length
      ? body.types.filter((t: string) => ALLOWED_TYPES.includes(t))
      : ["quiz", "cloze", "translation"];
    const count: number = Math.max(1, Math.min(40, Number(body.count) || 5));

    if (!lessonId) {
      return new Response(JSON.stringify({ error: "lesson_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load lesson + verify teacher access
    const { data: lesson, error: lErr } = await supabase
      .from("tutoring_lessons")
      .select("id, teacher_id, level, topic, title, theory")
      .eq("id", lessonId)
      .maybeSingle();
    if (lErr || !lesson) {
      return new Response(JSON.stringify({ error: "lesson not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (lesson.teacher_id !== user.id) {
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      const isAdmin = roles?.some((r: any) => r.role === "admin");
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Pull existing exercises + words for context (so AI doesn't duplicate)
    const [{ data: existingEx }, { data: lessonWords }] = await Promise.all([
      supabase.from("tutoring_lesson_exercises")
        .select("question, exercise_type, sort_order")
        .eq("lesson_id", lessonId)
        .order("sort_order"),
      supabase.from("tutoring_lesson_words")
        .select("german, russian")
        .eq("lesson_id", lessonId)
        .limit(30),
    ]);

    const existingSummary = (existingEx || [])
      .slice(0, 30)
      .map((e: any) => `[${e.exercise_type}] ${String(e.question).slice(0, 80)}`)
      .join("\n");
    const wordsSummary = (lessonWords || [])
      .map((w: any) => `${w.german} — ${w.russian}`).join(", ");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `Ти — досвідчений вчитель німецької. Створюєш ДОДАТКОВІ вправи до існуючого уроку.
${TYPE_GLOSSARY}

ВІДПОВІДАЙ СУВОРО валідним JSON без Markdown:
{
  "exercises": [
    {
      "type": "quiz | cloze | translation | article | word_order | conjugation | plural | error_correction | synonym | antonym | question_formation | dictation",
      "question": "...",
      "options": ["..."],
      "correct_answer": "...",
      "explanation": "Пояснення російською"
    }
  ]
}`;

    const userMsg = `Урок: "${lesson.title}" (рівень ${lesson.level}${lesson.topic ? `, тема: ${lesson.topic}` : ""}).
${lesson.theory ? `Коротко з теорії:\n${String(lesson.theory).slice(0, 1500)}\n` : ""}
${wordsSummary ? `Слова уроку: ${wordsSummary}\n` : ""}
${existingSummary ? `Вже є вправи (НЕ дублюй їх):\n${existingSummary}\n` : ""}
ЗАВДАННЯ ВЧИТЕЛЯ: ${prompt || "Створи ще додаткові вправи на закріплення матеріалу."}

Створи РІВНО ${count} нових вправ, ТІЛЬКИ цих типів: ${requestedTypes.join(", ")}.
Розподіли типи якомога рівномірніше. Відповідай тільки JSON.`;

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
    try { parsed = JSON.parse(content); }
    catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    let list: any[] = Array.isArray(parsed.exercises) ? parsed.exercises : [];
    list = list.filter((e) => e && typeof e.question === "string" && ALLOWED_TYPES.includes(e.type));

    // Shuffle quiz options (правильна не завжди першою)
    list = list.map((ex) => {
      if (ex.type === "quiz" && Array.isArray(ex.options) && ex.options.length > 1 && ex.correct_answer != null) {
        const arr = [...ex.options];
        for (let i = arr.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        if (!arr.includes(ex.correct_answer) && ex.options.includes(ex.correct_answer)) {
          arr[0] = ex.correct_answer;
        }
        ex.options = arr;
      }
      return ex;
    });

    if (list.length === 0) {
      return new Response(JSON.stringify({ error: "AI returned no exercises" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert into DB
    const baseOrder = (existingEx?.length || 0);
    const rows = list.map((ex, i) => ({
      lesson_id: lessonId,
      exercise_type: ex.type,
      question: ex.question,
      options: Array.isArray(ex.options) ? ex.options : [],
      correct_answer: ex.correct_answer ?? null,
      explanation: ex.explanation ?? null,
      sort_order: baseOrder + i,
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("tutoring_lesson_exercises")
      .insert(rows)
      .select();
    if (insErr) {
      console.error(insErr);
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, exercises: inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
