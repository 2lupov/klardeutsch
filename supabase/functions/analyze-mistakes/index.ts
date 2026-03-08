import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { mistakes, level, category, lang } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isUk = lang === "uk";

    const systemPrompt = isUk
      ? `Ти — викладач німецької мови для україномовних студентів рівня ${level}. 
Учень щойно допустив помилки у вправі з категорії "${category}".
Проаналізуй кожну помилку коротко та зрозуміло:
- Поясни ЧОМУ відповідь неправильна (1-2 речення)
- Дай мнемонічне правило або асоціацію для запам'ятовування
- Наведи 1 додатковий приклад на це правило

Відповідай УКРАЇНСЬКОЮ. Використовуй markdown для форматування. Будь доброзичливим та мотивуючим.
Не повторюй умову завдання — одразу переходь до пояснення.`
      : `Ты — преподаватель немецкого языка для русскоговорящих студентов уровня ${level}. 
Ученик только что допустил ошибки в упражнении по категории "${category}".
Проанализируй каждую ошибку кратко и понятно:
- Объясни ПОЧЕМУ ответ неправильный (1-2 предложения)
- Дай мнемоническое правило или ассоциацию для запоминания
- Приведи 1 дополнительный пример на это правило

Отвечай на русском. Используй markdown для форматирования. Будь дружелюбным и мотивирующим.
Не повторяй условие задания — сразу переходи к объяснению.`;

    const errorLabel = isUk ? "Помилка" : "Ошибка";
    const questionLabel = isUk ? "Запитання" : "Вопрос";
    const studentAnswer = isUk ? "Відповідь учня" : "Ответ ученика";
    const correctLabel = isUk ? "Правильна відповідь" : "Правильный ответ";
    const hintLabel = isUk ? "Підказка" : "Подсказка";

    const userPrompt = mistakes.map((m: any, i: number) => 
      `${errorLabel} ${i + 1}:\n${questionLabel}: ${m.question}\n${studentAnswer}: ${m.userAnswer}\n${correctLabel}: ${m.correctAnswer}${m.explanation ? `\n${hintLabel}: ${m.explanation}` : ""}`
    ).join("\n\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: isUk ? "Забагато запитів, спробуйте пізніше" : "Слишком много запросов, попробуйте позже" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: isUk ? "Перевищено ліміт AI-запитів" : "Превышен лимит AI-запросов" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("analyze-mistakes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
