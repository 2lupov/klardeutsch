const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { word, lang } = await req.json();

    if (!word || typeof word !== "string") {
      return new Response(
        JSON.stringify({ error: "word is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uiLang = lang === "uk" ? "украинский" : "русский";

    const systemPrompt = `Ты — немецко-${uiLang} словарь. Пользователь вводит немецкое слово. Дай подробную информацию:

1. **Слово** с артиклем (если существительное), перевод
2. **Часть речи** (Nomen, Verb, Adjektiv, Adverb, Präposition и т.д.)
3. **Значения** — все основные значения с переводом на ${uiLang}
4. **Примеры** — 3-4 примера предложений на немецком с переводом
5. **Если это глагол** — дай полное спряжение в Präsens, Präteritum, Perfekt (Partizip II + вспомогательный глагол). Укажи управление (с каким падежом/предлогом используется).
6. **Если это существительное** — дай формы: единственное и множественное число (Singular/Plural), родительный падеж (Genitiv).
7. **Синонимы** — 2-3 синонима если есть
8. **Уровень** — примерный уровень CEFR (A1-C2)

Отвечай на ${uiLang} языке, немецкие слова оставляй на немецком. Используй markdown форматирование.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: word.trim() },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: `AI error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return new Response(
      JSON.stringify({ result: content }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("lookup-word error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
