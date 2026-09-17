// ШІ читає зміст усього підручника і сам пропонує розбивку на теми + уточнюючі питання.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { blockCors, gatewayErrorResponse, jsonResponse } from "../_shared/lesson-blocks.ts";

const SYSTEM = `Ти — методист німецької мови (DaF) і асистент викладача. Тобі дають "карту" підручника: номери сторінок і фрагменти тексту з них.
Твоє завдання — самому зорієнтуватися: що це за книга, який рівень, і як розбити її на ТЕМИ (Lektionen / пункти) для інтерактивних уроків.

Поверни ЛИШЕ JSON:
{
  "book_title": "назва книги, якщо видно",
  "kind": "kursbuch" | "arbeitsbuch" | "grammatik",
  "level": "A1|A2|B1|B2|C1",
  "summary": "1–2 речення українською: що це за книга і що з неї варто зробити",
  "questions": [
    { "id": "short_key", "question": "коротке питання українською", "options": ["варіант 1", "варіант 2", "варіант 3"] }
  ],
  "topics": [
    { "title": "Тема українською (німецький термін у дужках)", "from": 12, "to": 15, "focus": "kursbuch|arbeitsbuch", "plan": ["theorie","luecke","satzbau"], "note": "що саме буде в уроці, 1 рядок" }
  ]
}

Правила:
- topics — від 4 до 25 тем, у порядку книги, діапазон сторінок 1–4 сторінки на тему (не більше 4!). Пропускай зміст, вступ, ключі до вправ, алфавітні покажчики.
- plan — типи блоків: theorie, hoer, lesen, luecke, paare, satzbau, schreiben.
- questions — 2–4 короткі питання, які реально впливають на результат (наприклад: скільки вправ на тему, чи додавати теорію, чи потрібне письмо, з якої теми почати). Кожне з 2–4 варіантами відповіді. Без питань про технічні речі.
- Усі формулювання українською, німецькі терміни залишай німецькою.
- Без тексту поза JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: blockCors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: claims, error: claimsError } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claims?.claims) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = String((claims.claims as any).sub);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return jsonResponse({ error: "Доступ лише для викладача" }, 403);

    const body = await req.json();
    const pages: Array<{ n: number; text: string }> = Array.isArray(body?.pages) ? body.pages.slice(0, 200) : [];
    if (pages.length === 0) return jsonResponse({ error: "Немає тексту сторінок" }, 400);

    const notes = String(body?.notes ?? "").slice(0, 1000);
    const answers = body?.answers && typeof body.answers === "object" ? body.answers : null;

    const map = pages
      .map((p) => `--- Сторінка ${p.n} ---\n${String(p.text ?? "").replace(/\s+/g, " ").slice(0, 700)}`)
      .join("\n");

    const parts = [
      `Карта підручника (${pages.length} сторінок):`,
      map,
      notes ? `Побажання викладача: ${notes}` : "",
      answers ? `Відповіді викладача на твої попередні питання: ${JSON.stringify(answers)}. Врахуй їх і більше не задавай питань — поверни "questions": [].` : "",
    ].filter(Boolean);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: parts.join("\n\n") },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`AI gateway error [${res.status}]: ${details.slice(0, 500)}`);
      return gatewayErrorResponse(res.status, details.slice(0, 200));
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const clean = (v: unknown, max: number) => (v === null || v === undefined ? "" : String(v).slice(0, max));
    const topics = (Array.isArray(parsed.topics) ? parsed.topics : [])
      .slice(0, 25)
      .map((t: any) => {
        const from = Math.max(1, Number(t?.from) || 1);
        const to = Math.min(from + 3, Math.max(from, Number(t?.to) || from));
        return {
          title: clean(t?.title, 200) || `Сторінки ${from}–${to}`,
          from,
          to,
          focus: t?.focus === "arbeitsbuch" ? "arbeitsbuch" : "kursbuch",
          plan: Array.isArray(t?.plan) ? t.plan.slice(0, 8).map((x: any) => clean(x, 20)) : [],
          note: clean(t?.note, 300),
        };
      })
      .filter((t: any) => t.title);

    const questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
      .slice(0, 4)
      .map((q: any, i: number) => ({
        id: clean(q?.id, 40) || `q${i}`,
        question: clean(q?.question, 300),
        options: (Array.isArray(q?.options) ? q.options : []).slice(0, 4).map((o: any) => clean(o, 120)).filter(Boolean),
      }))
      .filter((q: any) => q.question && q.options.length >= 2);

    return jsonResponse({
      book_title: clean(parsed.book_title, 200),
      kind: ["kursbuch", "arbeitsbuch", "grammatik"].includes(String(parsed.kind)) ? String(parsed.kind) : "kursbuch",
      level: ["A1", "A2", "B1", "B2", "C1"].includes(String(parsed.level)) ? String(parsed.level) : "A2",
      summary: clean(parsed.summary, 600),
      questions,
      topics,
    });
  } catch (e) {
    console.error("analyze-book-outline failed:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Помилка аналізу" }, 500);
  }
});
