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

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return json({ error: "Доступ лише для викладачів" }, 403);

    const body = await req.json().catch(() => ({}));
    const topic = String(body?.topic ?? "").slice(0, 1000);
    const level = String(body?.level ?? "A1").slice(0, 4);
    const kinds: string[] = Array.isArray(body?.kinds) ? body.kinds.slice(0, 6).map(String) : ["grammar", "vocab", "writing"];
    const count = Math.max(3, Math.min(20, Number(body?.count) || 8));
    const isKid = Boolean(body?.isKid);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY не налаштовано" }, 500);

    const kindMap: Record<string, string> = {
      grammar: "граматичні вправи (заповнити пропуски, поставити у правильну форму)",
      vocab: "лексика (переклад слів, склади речення зі словом)",
      writing: "письмове завдання (короткий текст)",
      reading: "невеликий текст німецькою + питання до нього",
      speaking: "усне завдання (підготувати монолог/відповіді)",
      translate: "переклад речень з української на німецьку",
    };
    const kindList = kinds.map((k) => kindMap[k] || k).join("; ");

    const system = `Ти — досвідчений методист мовної школи KLAR. Складаєш готову домашню роботу з німецької мови рівня ${level}${isKid ? " для дитини (простими словами, дружній тон, емодзі)" : ""}.
Інструкції та пояснення — УКРАЇНСЬКОЮ. Навчальний матеріал (речення, слова, тексти) — НІМЕЦЬКОЮ згідно рівня ${level}.
Типи завдань, які треба включити: ${kindList}. Загалом приблизно ${count} пунктів у сумі.
Поверни ЛИШЕ валідний JSON без markdown-огорожі:
{"title":"коротка назва домашки українською","intro":"1-2 речення мотивації та що повторити","level":"${level}","est_minutes":20,
"blocks":[{"heading":"назва блоку українською","instruction":"що зробити, українською","items":["пункти завдання, пронумеровувати не треба"]}],
"vocab":[{"de":"слово німецькою з артиклем","uk":"переклад"}],
"tips":["1-3 підсказки або нагадування правил українською"]}
Блоків 2-5. Не додавай зайвих полів, не давай відповідей учню.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        max_completion_tokens: 8000,
        messages: [
          { role: "system", content: system },
          { role: "user", content: topic || `Склади домашню роботу рівня ${level} на актуальну повсякденну тему.` },
        ],
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`AI gateway error [${res.status}]: ${details}`);
      if (res.status === 429) return json({ error: "Ліміт запитів AI. Спробуйте за хвилину." }, 429);
      if (res.status === 402) return json({ error: "Закінчилися AI-кредити workspace." }, 402);
      return json({ error: `AI помилка ${res.status}` }, 500);
    }

    const data = await res.json();
    let raw = String(data?.choices?.[0]?.message?.content ?? "").trim();
    raw = raw.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) raw = raw.slice(start, end + 1);

    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("JSON parse failed:", raw.slice(0, 500));
      return json({ error: "AI повернув некоректний JSON. Спробуйте ще раз." }, 502);
    }

    const blocks = (Array.isArray(parsed?.blocks) ? parsed.blocks : [])
      .filter((b: any) => b && (b.heading || b.instruction))
      .map((b: any) => ({
        heading: String(b.heading ?? "").slice(0, 200),
        instruction: String(b.instruction ?? "").slice(0, 500),
        items: (Array.isArray(b.items) ? b.items : []).map((i: any) => String(i).slice(0, 500)).slice(0, 30),
      }));
    if (blocks.length === 0) return json({ error: "AI не створив завдань" }, 502);

    return json({
      title: String(parsed?.title ?? "").slice(0, 200) || `Домашня робота ${level}`,
      intro: String(parsed?.intro ?? "").slice(0, 800),
      level,
      est_minutes: Math.max(5, Math.min(120, Number(parsed?.est_minutes) || 20)),
      blocks,
      vocab: (Array.isArray(parsed?.vocab) ? parsed.vocab : [])
        .map((v: any) => ({ de: String(v?.de ?? "").slice(0, 120), uk: String(v?.uk ?? "").slice(0, 120) }))
        .filter((v: any) => v.de)
        .slice(0, 20),
      tips: (Array.isArray(parsed?.tips) ? parsed.tips : []).map((x: any) => String(x).slice(0, 300)).slice(0, 5),
    });
  } catch (e) {
    console.error("generate-homework error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
