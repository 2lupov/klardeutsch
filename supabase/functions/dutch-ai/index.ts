import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createResponsesCall } from "../_shared/ai-responses.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Было (на украинском, несмотря на то что весь остальной интерфейс — русский):
// "Мета: за 2 тижні вільно спілкуватися з другом-голландцем" — нереалистичная
// рамка, которая не соответствует настоящей цели ученика и может сбивать ИИ
// на поверхностный разговорник вместо выстроенной системы.
const BASE = `Ты — личный репетитор нидерландского для носителя русского, который свободно знает немецкий (уровень C1).
Цель ученика: уверенный B2 за 3 месяца интенсивной практики — в основном через чтение и аудирование, без учебников.
Немецкий — главный рычаг: явно показывай звуковые и грамматические параллели (общие корни, порядок слов, спряжения),
где это ускоряет понимание, и отдельно отмечай ложных друзей (слова, которые выглядят похоже, но значат другое).
Нужен живой разговорный нидерландский (spreektaal, частицы nou/hoor/toch/joh, редукции) наравне с нормативной грамматикой —
ученику предстоит и понимать носителей, и говорить правильно.
Объяснения — по-русски, кратко и по делу, без воды.`;

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
    // A0 добавлен для модулей самого начала программы — раньше ["A1","A2","B1","B2"]
    // молча откатывал любой запрос A0 на A2, что для первого модуля курса было бы неверно.
    const level = ["A0", "A1", "A2", "B1", "B2"].includes(body.level) ? body.level : "A2";
    const topic = String(body.topic || "").slice(0, 300);

    let instructions = BASE;
    let messages: { role: "user" | "assistant"; content: string }[] = [];

    if (action === "module") {
      // Контент для модуля фиксированной программы (src/lib/curriculum.ts на клиенте):
      // тема и объём словаря заданы модулем, ИИ не выбирает их сам.
      const wordTarget = Math.min(Math.max(Number(body.wordTarget) || 25, 10), 50);
      const grammarPrompt = String(body.grammarPrompt || "").slice(0, 500);
      instructions += `\nЭто один модуль курса, а не свободная генерация — строго придерживайся заданной темы и уровня.
Составь: короткий связный текст для чтения (${wordTarget * 3}-${wordTarget * 5} слов, 1-2 абзаца, полностью понятный на уровне ${level}),
глоссарий значимых слов текста, 6-8 тестовых вопросов на понимание текста и словаря (НЕ только да/нет).
${grammarPrompt ? `Также объясни грамматику: ${grammarPrompt} И добавь 2-3 вопроса теста именно на эту грамматику.` : ""}
Отвечай ТОЛЬКО JSON:
{"title":"","text":"nl текст, абзацы через \\n\\n","text_ru":"перевод",
"glossary":[{"nl":"слово ровно в форме из текста","article":"de|het|","ru":"","de":"","en":"1-2 английских слова для подбора картинки, только для конкретных предметов/действий, иначе \\"\\""}],
${grammarPrompt ? `"grammar":{"rule":"объяснение правила по-русски","items":[{"q":"","options":["",""],"answer":0,"why":""}]},` : ""}
"quiz":[{"q_ru":"","options":["","","",""],"answer":0}]}`;
      messages = [{ role: "user", content: `Тема модуля: ${topic}. Уровень ${level}.` }];
    } else if (action === "reading") {
      // Длина текста растёт с уровнем — на A1 нужен короткий, полностью
      // понятный текст, на B2 уже связный рассказ на 400+ слов.
      const targetWords = level === "A1" ? 100 : level === "A2" ? 180 : level === "B1" ? 300 : 450;
      instructions += `\nСоздай связный текст для экстенсивного чтения (рассказ, пост в блоге, дневниковая запись или похожее —
выбери форму, которая подходит теме). Уровень ${level}, примерно ${targetWords} слов, 1-3 абзаца.
Текст должен быть полностью понятен на уровне ${level}, но 5-10% слов пусть будут чуть выше уровня — так ученик растёт
естественно (принцип i+1), не теряя нить. Отвечай ТОЛЬКО JSON:
{"title":"","text":"текст на nl, абзацы разделены \\n\\n","text_ru":"полный перевод на русский","glossary":[{"nl":"слово ровно в той форме, в которой оно встречается в тексте","article":"de|het|","ru":"","de":"","en":"1-2 английских слова для подбора картинки, только для конкретных предметов/действий, иначе \\"\\""}]}
В glossary включи ВСЕ значимые слова текста (существительные, глаголы, прилагательные, наречия) — по ним будут кликать прямо в тексте,
служебные слова (de, een, en, ik...) можно пропустить.`;
      messages = [{ role: "user", content: `Тема: ${topic || "на твой выбор — что-то живое и интересное"}. Уровень ${level}.` }];
    } else if (action === "words") {
      const count = Math.min(Math.max(Number(body.count) || 60, 10), 100);
      const known = Array.isArray(body.known) ? body.known.slice(0, 400).join(", ") : "";
      instructions += `\nОтвечай ТОЛЬКО JSON: {"words":[{"nl":"","article":"de|het|","de":"","ru":"","example":"","example_ru":""}]}.
article — только для существительных, иначе "". example — короткое живое предложение на nl.`;
      messages = [{ role: "user", content: `Тема: ${topic}. Уровень ${level}. Дай ${count} самых частых разговорных слов и выражений. Не повторяй: ${known}` }];
    } else if (action === "listening") {
      instructions += `\nСоздай аудирование. Отвечай ТОЛЬКО JSON:
{"title":"","summary_ru":"","lines":[{"speaker":"A|B","nl":"","ru":""}],"vocab":[{"nl":"","ru":"","de":""}],"particles":[{"nl":"","explain_ru":""}],
"quiz":[{"q_ru":"","options":["","","",""],"answer":0}],"gaps":[{"line":0,"word":""}]}
10-16 реплик, как сцена из фильма или разговор друзей, живая быстрая речь. 4 вопроса в quiz, 5 gaps (word точно есть в строке line).`;
      messages = [{ role: "user", content: `Уровень ${level}. Тема: ${topic || "двое друзей решают, какой фильм смотреть вечером"}` }];
    } else if (action === "chat") {
      const scenario = String(body.scenario || "свободный разговор с другом").slice(0, 300);
      instructions += `\nТы — Daan, голландский друг пользователя, 28 лет, из Утрехта. Сценарий: ${scenario}. Уровень речи ${level}.
Отвечай ТОЛЬКО JSON: {"reply":"твой ответ на nl, 1-3 предложения, живо, с встречным вопросом","reply_ru":"перевод",
"correction":"исправленная версия последней фразы пользователя на nl или \\"\\" если всё ок","explain_ru":"коротко почему, с немецкой параллелью или \\"\\"",
"suggestions":["3 варианта, что можно ответить на nl"]}
Если пользователь вставил русское/немецкое слово — подскажи нидерландское в explain_ru.`;
      const hist = Array.isArray(body.history) ? body.history.slice(-20) : [];
      messages = hist
        .filter((m: any) => m && typeof m.content === "string")
        .map((m: any) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.slice(0, 2000) }));
      if (!messages.length) messages = [{ role: "user", content: "(начни разговор первым)" }];
    } else if (action === "translate") {
      const query = String(body.query || "").slice(0, 500);
      if (!query.trim()) return json({ error: "Пустой запрос" }, 400);
      const direction = body.direction === "ru-nl" ? "ru-nl" : "nl-ru";
      instructions += `\nТы — разговорный словарь нидерландский↔русский. Отвечай ТОЛЬКО JSON:
{"input":"","detected":"nl|ru","entries":[{"nl":"","article":"de|het|","ru":"","de":"","en":"1-2 английских слова для подбора картинки (только если слово — конкретный предмет/действие, иначе \\"\\")","example":"","example_ru":"","note_ru":""}]}
${direction === "ru-nl" ? "Пользователь дал русское слово/фразу — дай 1-3 нидерландских перевода (разговорные варианты первыми)." : "Пользователь дал нидерландское слово/фразу — разбери и переведи на русский; если это фраза или сленг, объясни целиком."}
article — только для существительных. de — немецкая параллель. note_ru — сленг/частицы/ловушки (коротко) или "". example — короткое живое предложение на nl.`;
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
    return json({ error: status === 402 ? "Закончились AI-кредиты" : status === 429 ? "Слишком много запросов, попробуй через минуту" : "Ошибка генерации" }, status);
  }
});
