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

interface ModuleReq {
  kind: "reading" | "writing" | "speaking" | "grammar" | "listening";
  count?: number;
  topic?: string;
}

const KIND_SPEC: Record<string, (c: number, topic: string) => string> = {
  reading: (c, topic) =>
    `{"kind":"reading","title":"...","text":"німецький текст 120-200 слів${topic ? ` на тему: ${topic}` : ""}","questions":[${c} питань {"question":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"українською"}]}`,
  listening: (c, topic) =>
    `{"kind":"listening","title":"...","script":"німецький Hörtext 80-150 слів${topic ? ` на тему: ${topic}` : ""}, лише мовлення без ремарок","questions":[${c} питань {"question":"...","options":["...","...","...","..."],"correct_index":0,"explanation":"українською"}]}`,
  grammar: (c, topic) =>
    `{"kind":"grammar","title":"...","questions":[${c} завдань. Кожне або {"format":"choice","question":"...","options":["..","..","..",".."],"correct_index":0,"explanation":"українською"} або {"format":"gap","question":"речення з ___ замість слова","answer":"правильне слово","explanation":"українською"}${topic ? `. Тема: ${topic}` : ""}]}`,
  writing: (_c, topic) =>
    `{"kind":"writing","title":"...","topic":"тема письма${topic ? `: ${topic}` : ""}","criteria":["3-5 критеріїв українською"],"min_words":80}`,
  speaking: (c, topic) =>
    `{"kind":"speaking","title":"...","topic":"тема монологу${topic ? `: ${topic}` : ""}","questions":["${c} опорних питань німецькою"]}`,
};

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
    const prompt = String(body?.prompt ?? "").slice(0, 2000);
    const level = String(body?.level ?? "A1");
    const modules: ModuleReq[] = Array.isArray(body?.modules) ? body.modules.slice(0, 6) : [];
    if (modules.length === 0) return json({ error: "Оберіть хоча б один модуль" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY не налаштовано" }, 500);

    const spec = modules
      .map((m) => KIND_SPEC[m.kind]?.(Math.max(1, Math.min(20, Number(m.count) || 5), ), String(m.topic ?? "")))
      .filter(Boolean)
      .join(",\n");

    const system = `Ти — методист мовної школи KLAR. Створюєш індивідуальні завдання та тести з німецької мови для рівня ${level}.
Пояснення, критерії та інструкції — УКРАЇНСЬКОЮ. Навчальний матеріал (тексти, речення, питання Lesen/Hören/Sprechen) — НІМЕЦЬКОЮ, відповідно до рівня ${level}.
Поверни ЛИШЕ валідний JSON без markdown-огорожі у форматі:
{"title":"назва завдання українською","instructions":"вказівки для учня українською","modules":[
${spec}
]}
Порядок модулів збережи. Не додавай зайвих полів.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        max_tokens: 16000,
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: prompt || `Створи завдання рівня ${level} із зазначених модулів.`,
          },
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

    const cleanModules = (Array.isArray(parsed?.modules) ? parsed.modules : []).filter(
      (m: any) => m && typeof m.kind === "string",
    );
    if (cleanModules.length === 0) return json({ error: "AI не створив модулів" }, 502);

    return json({
      title: String(parsed?.title ?? "").slice(0, 200),
      instructions: String(parsed?.instructions ?? "").slice(0, 2000),
      modules: cleanModules,
    });
  } catch (e) {
    console.error("generate-standalone-assignment error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
