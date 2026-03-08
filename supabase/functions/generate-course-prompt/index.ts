import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const adminSupabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: hasRole } = await adminSupabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, courseName, level, lessonsCount, topics, description, jsonData } =
      await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (action === "generate_prompt") {
      // AI generates an optimized prompt for Claude
      const systemPrompt = `Ты — эксперт по созданию обучающего контента для немецкого языка (DaF). 
Твоя задача — сгенерировать ПОДРОБНЫЙ промпт, который пользователь скопирует в Claude для создания полноценного курса.
Промпт должен быть максимально детальным и структурированным, чтобы Claude выдал идеальный JSON.
Отвечай ТОЛЬКО промптом, без пояснений.`;

      const userPrompt = `Создай промпт для Claude для генерации курса немецкого языка со следующими параметрами:

Название курса: ${courseName}
Уровень: ${level}
Количество уроков: ${lessonsCount}
Описание/цель курса: ${description || "не указано"}
Темы уроков: ${topics?.length ? topics.join(", ") : "определи сам по теме курса"}

Промпт должен требовать от Claude вернуть JSON в таком формате:
{
  "course": {
    "title": "название курса",
    "description": "описание курса",
    "level": "${level}"
  },
  "lessons": [
    {
      "title": "название урока",
      "theory": "теория в markdown (правила, объяснения, таблицы)",
      "exercises": {
        "vocab_cards": [
          { "german": "слово", "russian": "перевод", "ukrainian": "переклад", "article": "der/die/das или null", "example": "пример" }
        ],
        "grammar_questions": [
          { "question": "вопрос с ___", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "объяснение" }
        ],
        "reading": {
          "title": "название",
          "text": "текст для чтения",
          "questions": [{ "question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..." }]
        }
      }
    }
  ]
}

Важно включить в промпт:
- Требование уровня ${level} CEFR для всех материалов
- Каждый урок должен содержать 10-20 слов, 5-8 грамматических вопросов, 1 текст для чтения с 4-6 вопросами
- Теория должна объяснять грамматику урока простым языком с примерами
- Все переводы на русский И украинский для vocab_cards
- JSON должен быть без markdown-обёрток
- Темы уроков должны быть связаны между собой и постепенно усложняться`;

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Payment required" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        throw new Error(`AI error ${response.status}: ${t}`);
      }

      const data = await response.json();
      const prompt = data.choices?.[0]?.message?.content || "";

      return new Response(JSON.stringify({ prompt }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "validate_json") {
      // AI validates and cleans the JSON from Claude
      const systemPrompt = `Ты — валидатор JSON для курсов немецкого языка.
Проверь входной JSON и верни:
1. Если JSON валидный — верни его в чистом виде с полем "valid": true
2. Если есть ошибки — исправь их и верни с полем "valid": true, "fixes": ["описание исправления"]
3. Если JSON совсем сломан — верни { "valid": false, "error": "описание проблемы" }

Ожидаемая структура:
- course: { title, description, level }
- lessons: [{ title, theory, exercises: { vocab_cards?, grammar_questions?, reading? } }]

Верни ТОЛЬКО JSON, без markdown.`;

      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Проверь и валидируй этот JSON курса:\n\n${jsonData}` },
            ],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const t = await response.text();
        throw new Error(`AI error ${response.status}: ${t}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "";
      
      // Clean markdown wrappers
      content = content.trim();
      if (content.startsWith("```json")) content = content.slice(7);
      if (content.startsWith("```")) content = content.slice(3);
      if (content.endsWith("```")) content = content.slice(0, -3);
      content = content.trim();

      try {
        const parsed = JSON.parse(content);
        return new Response(JSON.stringify(parsed), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ valid: false, error: "AI returned invalid JSON" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-course-prompt error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
