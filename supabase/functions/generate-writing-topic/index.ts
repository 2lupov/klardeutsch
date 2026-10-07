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
    const avoid = String(body?.avoid ?? "").slice(0, 200);
    const theme = String(body?.theme ?? "").slice(0, 200).trim();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI не налаштовано" }, 500);

    const prompt = `Ти — викладач німецької. Придумай ОДНУ ${theme ? "" : "випадкову, "}життєву тему письма (лист, повідомлення, e-mail) для рівня ${level} у стилі іспиту Goethe/telc.
${theme ? `Тема уроку: "${theme}" — завдання має бути саме про це.` : avoid ? `Не повторюй тему: "${avoid}".` : ""}
Поверни СТРОГО JSON без markdown:
{"title_de":"коротка назва німецькою","situation_uk":"ситуація українською, 1-2 речення","task_de":"завдання німецькою так, як в іспиті","points":["3-4 пункти німецькою, про що написати"],"redemittel":["4-6 корисних фраз німецькою"],"min_words":число}
min_words: A1≈30, A2≈50, B1≈80, B2≈150, C1≈200.`;

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

    // Читаємо SSE-потік і збираємо текст відповіді
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
    if (!m) return json({ error: "ШІ не повернув тему, спробуйте ще раз" }, 502);
    const topic = JSON.parse(m[0]);
    return json({ topic: { ...topic, level } });
  } catch (e) {
    if (req.signal.aborted) return new Response(null, { status: 499 });
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "Помилка" }, 500);
  }
});
