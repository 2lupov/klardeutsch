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
    const words = Math.min(Math.max(Number(body?.words) || 120, 40), 500);
    const theme = String(body?.theme ?? "").slice(0, 200);
    const avoid = String(body?.avoid ?? "").slice(0, 200);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI не налаштовано" }, 500);

    const prompt = `Ти — викладач німецької мови. Напиши ОДИН цікавий, життєвий текст для читання (Lesen) рівня ${level}, приблизно ${words} слів.
${theme ? `Тема: "${theme}".` : "Тему вибери сам — щось із реального життя (робота, побут, подорожі, місто, здоров'я, навчання)."}
${avoid ? `Не повторюй текст на тему: "${avoid}".` : ""}
Граматика і лексика — строго відповідно до рівня ${level}. Абзаци розділяй порожнім рядком.
Поверни СТРОГО JSON без markdown:
{"title_de":"назва німецькою","text_de":"текст німецькою з абзацами","summary_uk":"про що текст, 1-2 речення українською","grammar_focus":["2-4 граматичні конструкції з тексту, коротко німецькою + пояснення українською"],"vocab":[{"term":"слово","article":"der|die|das або null","translation":"переклад українською"}],"questions":["2-4 питання німецькою на розуміння"],"word_count":число}
У vocab дай 6-10 найважливіших слів із тексту.`;

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
    if (!m) return json({ error: "ШІ не повернув текст, спробуйте ще раз" }, 502);
    const topic = JSON.parse(m[0]);
    return json({ topic: { ...topic, level, target_words: words } });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Помилка" }, 500);
  }
});
