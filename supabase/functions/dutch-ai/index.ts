import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createResponsesCall } from "../_shared/ai-responses.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BASE = `Ти — особистий репетитор нідерландської для носія російської/української, який вільно знає німецьку.
Мета: за 2 тижні вільно спілкуватися з другом-голландцем, дивитися фільми й серіали. Жодної бюрократії й переїзду.
Живий розмовний нідерландський (spreektaal), сленг, частки (nou, hoor, toch, joh, hè, even, maar), редукції.
Пояснення — російською. Завжди давай німецьку паралель, якщо вона допомагає.`;

function parse(text: string) {
  try { return JSON.parse(text); } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("bad json");
    return JSON.parse(m[0]);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims } = await sb.auth.getClaims(auth.slice(7));
    const uid = claims?.claims?.sub;
    if (!uid) return json({ error: "Unauthorized" }, 401);
    const { data: isAdmin } = await sb.rpc("has_role", { _user_id: uid, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const level = ["A1", "A2", "B1", "B2"].includes(body.level) ? body.level : "A2";
    const topic = String(body.topic || "").slice(0, 300);

    let instructions = BASE;
    let messages: { role: "user" | "assistant"; content: string }[] = [];

    if (action === "words") {
      const count = Math.min(Math.max(Number(body.count) || 60, 10), 100);
      const known = Array.isArray(body.known) ? body.known.slice(0, 400).join(", ") : "";
      instructions += `\nВідповідай ЛИШЕ JSON: {"words":[{"nl":"","article":"de|het|","de":"","ru":"","example":"","example_ru":""}]}.
article — тільки для іменників, інакше "". example — коротке живе речення nl.`;
      messages = [{ role: "user", content: `Тема: ${topic}. Рівень ${level}. Дай ${count} найчастіших розмовних слів і виразів. Не повторюй: ${known}` }];
    } else if (action === "listening") {
      instructions += `\nСтвори аудіювання. Відповідай ЛИШЕ JSON:
{"title":"","summary_ru":"","lines":[{"speaker":"A|B","nl":"","ru":""}],"vocab":[{"nl":"","ru":"","de":""}],"particles":[{"nl":"","explain_ru":""}],
"quiz":[{"q_ru":"","options":["","","",""],"answer":0}],"gaps":[{"line":0,"word":""}]}
10-16 реплік, як сцена з фільму або розмова друзів, природна швидка мова. 4 питання quiz, 5 gaps (word точно є у рядку line).`;
      messages = [{ role: "user", content: `Рівень ${level}. Тема: ${topic || "двоє друзів вирішують, який фільм дивитися ввечері"}` }];
    } else if (action === "chat") {
      const scenario = String(body.scenario || "вільна розмова з другом").slice(0, 300);
      instructions += `\nТи — Daan, голландський друг користувача, 28 років, з Утрехта. Сценарій: ${scenario}. Рівень мовлення ${level}.
Відповідай ЛИШЕ JSON: {"reply":"твоя відповідь nl, 1-3 речення, живо, з питанням назад","reply_ru":"переклад",
"correction":"виправлена версія останньої фрази користувача nl або \\"\\" якщо все ок","explain_ru":"коротко чому, з німецькою паралеллю або \\"\\"",
"suggestions":["3 варіанти, що можна відповісти nl"]}
Якщо користувач вставив російське/німецьке слово — підкажи нідерландське в explain_ru.`;
      const hist = Array.isArray(body.history) ? body.history.slice(-20) : [];
      messages = hist
        .filter((m: any) => m && typeof m.content === "string")
        .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.slice(0, 2000) }));
      if (!messages.length) messages = [{ role: "user", content: "(почни розмову першим)" }];
    } else if (action === "translate") {
      const query = String(body.query || "").slice(0, 500);
      if (!query.trim()) return json({ error: "Пустой запрос" }, 400);
      const direction = body.direction === "ru-nl" ? "ru-nl" : "nl-ru";
      instructions += `\nТи — розмовний словник нідерландська↔російська. Відповідай ЛИШЕ JSON:
{"input":"","detected":"nl|ru","entries":[{"nl":"","article":"de|het|","ru":"","de":"","example":"","example_ru":"","note_ru":""}]}
${direction === "ru-nl" ? "Користувач дав російське слово/фразу — дай 1-3 нідерландські переклади (розмовні варіанти першими)." : "Користувач дав нідерландське слово/фразу — розбери і переклади російською; якщо це фраза чи сленг, поясни цілком."}
article — тільки для іменників. de — німецька паралель. note_ru — сленг/частки/пастки (коротко) або "". example — коротке живе речення nl.`;
      messages = [{ role: "user", content: query }];
    } else {
      return json({ error: "Unknown action" }, 400);
    }

    const result = createResponsesCall(req, apiKey, instructions, messages);
    const text = await result.text;
    return json(parse(text));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const status = /429/.test(msg) ? 429 : /402/.test(msg) ? 402 : 500;
    console.error("dutch-ai", msg);
    return json({ error: status === 402 ? "Закінчились AI-кредити" : status === 429 ? "Забагато запитів, спробуйте за хвилину" : "Помилка генерації" }, status);
  }
});
