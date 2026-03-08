import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    const { text, task, level, lang } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isUk = lang === "uk";
    const responseLang = isUk ? "українською мовою" : "на русском языке";

    const systemPrompt = isUk
      ? `Ти — доброзичливий викладач німецької мови для україномовних студентів рівня ${level}.

Студент виконав письмове завдання. Перевір його текст і дай зворотний зв'язок.

**Формат відповіді (строго markdown, українською):**

## 📝 Оцінка
Дай загальну оцінку від 1 до 10 та короткий коментар (1 речення).

## ✅ Що добре
Відзнач 1-3 вдалі моменти в тексті.

## ❌ Помилки
Для кожної помилки:
- **Помилка:** "фраза з помилкою" → **"виправлений варіант"**
- 💡 Пояснення правила (1-2 речення)

## 💪 Порада
Одна конкретна порада для покращення на цьому рівні.

## 📊 Підсумок
Коротко: граматика (/5), словниковий запас (/5), зв'язність (/5).

Будь конструктивним і мотивуючим. Не переписуй весь текст — тільки вказуй конкретні помилки.
ВАЖЛИВО: Вся відповідь ПОВИННА бути українською мовою!`
      : `Ты — дружелюбный преподаватель немецкого языка для русскоговорящих студентов уровня ${level}.

Студент выполнил письменное задание. Проверь его текст и дай обратную связь.

**Формат ответа (строго markdown):**

## 📝 Оценка
Дай общую оценку от 1 до 10 и краткий комментарий (1 предложение).

## ✅ Что хорошо
Отметь 1-3 удачных момента в тексте.

## ❌ Ошибки
Для каждой ошибки:
- **Ошибка:** "фраза с ошибкой" → **"исправленный вариант"**
- 💡 Объяснение правила (1-2 предложения)

## 💪 Совет
Один конкретный совет для улучшения на этом уровне.

## 📊 Итог
Кратко: грамматика (/5), словарный запас (/5), связность (/5).

Будь конструктивным и мотивирующим. Не переписывай весь текст — только указывай конкретные ошибки.`;

    const userPrompt = isUk
      ? `Завдання: ${task}\n\nТекст студента:\n${text}`
      : `Задание: ${task}\n\nТекст студента:\n${text}`;

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
    console.error("check-writing error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
