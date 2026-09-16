import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const topic = String(body?.topic ?? "").trim();
    const level = String(body?.level ?? "A1").trim();
    const count = Math.min(Math.max(Number(body?.count) || 10, 1), 25);
    const language = String(body?.language ?? "de").trim();
    const extra = String(body?.extra ?? "").trim();

    if (!topic) return json({ error: "Вкажіть тему тесту" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const systemPrompt = `Ти — методист мовної школи KLAR. Створюєш тести для учнів.
Мова, яку вивчає учень: ${language}. Рівень: ${level}.
Питання та варіанти — мовою вивчення (${language}), а пояснення — УКРАЇНСЬКОЮ мовою.
Повертай ЛИШЕ валідний JSON без markdown-огорожі, у форматі:
{"title":"...","questions":[{"question":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"..."}]}
Рівно ${count} питань, у кожного 4 варіанти, лише один правильний.`;

    const userPrompt = `Тема: ${topic}\nРівень: ${level}\nКількість питань: ${count}${extra ? `\nДодаткові вимоги: ${extra}` : ""}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`AI gateway error [${response.status}]: ${details}`);
      if (response.status === 429) return json({ error: "Забагато запитів до AI, спробуйте за хвилину" }, 429);
      if (response.status === 402) return json({ error: "Недостатньо AI-кредитів. Поповніть баланс у Lovable." }, 402);
      if (response.status === 403) return json({ error: "AI заблоковано налаштуваннями робочого простору" }, 403);
      return json({ error: "Помилка AI", status: response.status, details }, 500);
    }

    const data = await response.json();
    let raw = data?.choices?.[0]?.message?.content ?? "";
    raw = String(raw).replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) return json({ error: "AI повернув некорректний формат" }, 500);
      parsed = JSON.parse(raw.slice(start, end + 1));
    }

    const questions = Array.isArray(parsed?.questions) ? parsed.questions : [];
    const clean = questions
      .filter((q: any) => q?.question && Array.isArray(q?.options) && q.options.length >= 2)
      .map((q: any) => ({
        question: String(q.question),
        options: q.options.slice(0, 6).map((o: any) => String(o)),
        correct_index: Math.max(0, Math.min(Number(q.correct_index) || 0, q.options.length - 1)),
        explanation: q.explanation ? String(q.explanation) : "",
      }));

    if (!clean.length) return json({ error: "AI не створив питань, спробуйте змінити тему" }, 500);

    return json({ title: parsed?.title ? String(parsed.title) : topic, questions: clean });
  } catch (e) {
    console.error("generate-student-test error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
