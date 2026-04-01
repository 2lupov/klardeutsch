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

    const systemPrompt = `Ты — немецко-${uiLang} словарь. Пользователь вводит немецкое слово. Верни СТРОГО JSON без markdown.`;

    const userPrompt = `Слово: "${word.trim()}". Верни JSON объект с полями. Отвечай на ${uiLang}.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "show_word_info",
          description: "Display detailed information about a German word",
          parameters: {
            type: "object",
            properties: {
              word: { type: "string", description: "The German word" },
              article: { type: "string", description: "Article if noun (der/die/das), empty string otherwise" },
              translation: { type: "string", description: `Translation in ${uiLang}` },
              part_of_speech: { type: "string", description: "Part of speech in German (Verb, Nomen, Adjektiv, etc.)" },
              part_of_speech_translation: { type: "string", description: `Part of speech translated to ${uiLang}` },
              level: { type: "string", description: "CEFR level (A1, A2, B1, B2, C1, C2)" },
              meanings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    meaning: { type: "string", description: `Meaning in ${uiLang}` },
                    example_de: { type: "string", description: "Example sentence in German" },
                    example_translation: { type: "string", description: `Example translation in ${uiLang}` }
                  },
                  required: ["meaning", "example_de", "example_translation"]
                }
              },
              conjugation: {
                type: "object",
                description: "Verb conjugation (only for verbs)",
                properties: {
                  präsens: {
                    type: "object",
                    properties: {
                      ich: { type: "string" }, du: { type: "string" }, er_sie_es: { type: "string" },
                      wir: { type: "string" }, ihr: { type: "string" }, sie_Sie: { type: "string" }
                    },
                    required: ["ich", "du", "er_sie_es", "wir", "ihr", "sie_Sie"]
                  },
                  präteritum: {
                    type: "object",
                    properties: {
                      ich: { type: "string" }, du: { type: "string" }, er_sie_es: { type: "string" },
                      wir: { type: "string" }, ihr: { type: "string" }, sie_Sie: { type: "string" }
                    },
                    required: ["ich", "du", "er_sie_es", "wir", "ihr", "sie_Sie"]
                  },
                  perfekt: { type: "string", description: "Partizip II form with auxiliary verb, e.g. 'hat gefunden'" },
                  governing: { type: "string", description: `Verb governing info (Akkusativ, Dativ, etc.) in ${uiLang}` }
                },
                required: ["präsens", "präteritum", "perfekt"]
              },
              noun_forms: {
                type: "object",
                description: "Noun forms (only for nouns)",
                properties: {
                  singular: { type: "string" },
                  plural: { type: "string" },
                  genitiv: { type: "string" }
                },
                required: ["singular", "plural", "genitiv"]
              },
              synonyms: {
                type: "array",
                items: { type: "string" },
                description: "2-3 synonyms"
              }
            },
            required: ["word", "translation", "part_of_speech", "part_of_speech_translation", "level", "meanings"],
            additionalProperties: false
          }
        }
      }
    ];

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
            { role: "user", content: userPrompt },
          ],
          tools,
          tool_choice: { type: "function", function: { name: "show_word_info" } },
          temperature: 0.3,
          max_tokens: 3000,
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI error: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract structured data from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const structured = JSON.parse(toolCall.function.arguments);
      return new Response(
        JSON.stringify({ structured }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fallback to content
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
