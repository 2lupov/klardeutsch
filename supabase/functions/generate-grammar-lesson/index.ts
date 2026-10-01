import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const level = LEVELS.includes(body?.level) ? body.level : "A2";
    const topic = String(body?.topic ?? "").slice(0, 200).trim();
    const examples = Math.min(Math.max(Number(body?.examples) || 6, 3), 50);
    const practiceN = Math.min(Math.max(Number(body?.practice) || examples, 5), 50);
    const readingWords = Math.min(Math.max(Number(body?.reading_words) || 90, 40), 300);
    if (!topic) return json({ error: "Вкажіть тему граматики" }, 400);

    let ru = false;
    if (body?.student_id) {
      const { data: pr } = await sb.from("profiles").select("preferred_lang").eq("user_id", String(body.student_id)).maybeSingle();
      ru = (pr as any)?.preferred_lang === "ru";
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI не налаштовано" }, 500);

    const prompt = `Ти — найкращий викладач німецької мови. Підготуй міні-урок граматики для рівня ${level} на тему: "${topic}".

Вимоги:
- Пояснення українською, приклади німецькою з перекладом.
- 2-4 короткі правила: кожне = одна думка + за потреби маленька таблиця форм (масив рядків).
- РІВНО ${examples} прикладів речень із теми. У кожному прикладі познач ключову частину у полі "focus" (точний фрагмент із речення німецькою).
- РІВНО ${practiceN} завдань на практику: коротке речення з пропуском "___" та правильна відповідь і мікро-пояснення.
- Один зв'язний текст для читання (~${readingWords} слів) рівня ${level}, у якому ця граматика зустрічається багато разів, плюс 3 питання на розуміння німецькою.
- Ніякої води, жодних вступів.${ru ? "\n- ВАЖЛИВО: усі пояснення, назви, переклади, підказки й поля *_uk пиши РОСІЙСЬКОЮ мовою (учень не розуміє українську)." : ""}

Поверни СТРОГО JSON без markdown:
{"title":"назва уроку українською","title_de":"назва німецькою","level":"${level}","summary_uk":"1-2 речення, про що тема","rules":[{"title":"заголовок","explanation_uk":"пояснення","table":["рядок таблиці у форматі 'ich | gehe'"]}],"examples":[{"de":"речення німецькою","uk":"переклад","focus":"фрагмент із речення"}],"practice":[{"prompt":"речення з ___","answer":"правильна відповідь","hint_uk":"мікро-пояснення"}],"mistakes":["2-3 типові помилки учнів"],"vocab":[{"term":"слово","article":"der|die|das або null","translation":"переклад"}],"reading":{"title_de":"назва тексту","text_de":"текст з абзацами","questions":["питання німецькою"]}}`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      signal: req.signal,
      headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        input: prompt,
        stream: true,
        store: false,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      const msg = res.status === 402 ? "Закінчились AI-кредити" : res.status === 429 ? "Забагато запитів, спробуйте за хвилину" : `Помилка ШІ (${res.status})`;
      console.error("gateway", res.status, t.slice(0, 300));
      return json({ error: msg }, res.status);
    }

    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim();
        buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        const d = line.slice(5).trim();
        if (!d || d === "[DONE]") continue;
        try {
          const ev = JSON.parse(d);
          if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        } catch { /* ignore */ }
      }
    }
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "ШІ не повернув урок, спробуйте ще раз" }, 502);
    const lesson = JSON.parse(m[0]);
    return json({ lesson: { ...lesson, level, topic } });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Помилка" }, 500);
  }
});
