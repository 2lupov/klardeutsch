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

    // Verify teacher role
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

    const { topic, level, focus, studentNotes } = await req.json();
    if (!topic || !level) {
      return new Response(JSON.stringify({ error: "topic and level required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Du bist ein erfahrener Deutschlehrer. Erstelle eine vollständige Online-Unterrichtsstunde auf Deutsch (CEFR-Niveau ${level}) zum Thema "${topic}".

Antworte NUR mit gültigem JSON ohne Markdown:
{
  "title": "Kurzer Titel (3-6 Wörter)",
  "theory": "Strukturierte Theorie auf Russisch mit Markdown (заголовки, списки, **bold**, примеры на немецком). 300-600 слов. Включи: введение, правила, примеры, типичные ошибки.",
  "words": [
    {"german": "...", "article": "der|die|das|null", "russian": "перевод", "example": "Полное немецкое предложение с этим словом."}
  ],
  "exercises": [
    {"type": "quiz", "question": "Question text", "options": ["A","B","C","D"], "correct_answer": "A", "explanation": "Why"},
    {"type": "cloze", "question": "Ich ___ nach Berlin.", "correct_answer": "fahre", "explanation": "..."},
    {"type": "translation", "question": "Переведи: Я иду домой.", "correct_answer": "Ich gehe nach Hause.", "explanation": "..."}
  ],
  "homework": [
    {"description": "Конкретное задание для самостоятельной работы (на русском с примерами на немецком)."}
  ]
}

Требования:
- 8-12 слов в словнике
- 6-10 упражнений разных типов
- 2-3 домашних задания
- Уровень строго ${level}
${focus ? `- Особый фокус: ${focus}` : ""}
${studentNotes ? `- Учитывай заметки об ученике: ${studentNotes}` : ""}`;

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
          { role: "user", content: `Создай урок: тема "${topic}", уровень ${level}.` },
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
