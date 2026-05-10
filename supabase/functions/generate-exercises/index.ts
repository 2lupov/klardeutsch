import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: hasRole } = await adminSupabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { content, level, types } = await req.json();
    if (!content || !level) {
      return new Response(JSON.stringify({ error: "content and level are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const enabledTypes = types || ["vocab", "grammar", "reading", "listening"];

    const systemPrompt = `You are an expert German language teacher creating exercises for level ${level}.
Given the source material, generate exercises in the requested categories.
Always respond in the structured format via the tool call. All content should be appropriate for ${level} level learners.
For vocab cards: extract German words with articles (der/die/das for nouns), Russian translations, and example sentences.
For grammar questions: create multiple-choice questions (4 options) testing grammar concepts from the material.
For reading: create a reading text based on the material with comprehension questions (4 options each).
For listening: create a text suitable for listening practice with comprehension questions (4 options each).
Make sure translations and explanations are in Russian. Questions and options should be in German or mixed German-Russian as appropriate for ${level}.`;

    const tools = [
      {
        type: "function",
        function: {
          name: "create_exercises",
          description: "Create structured exercises from the source material",
          parameters: {
            type: "object",
            properties: {
              vocab_cards: {
                type: "array",
                description: "Vocabulary cards (only if vocab type requested)",
                items: {
                  type: "object",
                  properties: {
                    german: { type: "string", description: "German word" },
                    russian: { type: "string", description: "Russian translation" },
                    article: { type: "string", description: "Article (der/die/das) or null" },
                    example: { type: "string", description: "Example sentence in German" },
                    topic: { type: "string", description: "Topic category" },
                  },
                  required: ["german", "russian"],
                },
              },
              grammar_questions: {
                type: "array",
                description: "Grammar quiz questions (only if grammar type requested)",
                items: {
                  type: "object",
                  properties: {
                    question: { type: "string" },
                    options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                    correct_index: { type: "integer", minimum: 0, maximum: 3 },
                    explanation: { type: "string", description: "Explanation in Russian" },
                    topic: { type: "string" },
                  },
                  required: ["question", "options", "correct_index"],
                },
              },
              reading_text: {
                type: "object",
                description: "Reading exercise (only if reading type requested)",
                properties: {
                  title: { type: "string" },
                  text: { type: "string" },
                  topic: { type: "string" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                        correct_index: { type: "integer", minimum: 0, maximum: 3 },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "correct_index"],
                    },
                  },
                },
                required: ["title", "text", "questions"],
              },
              listening_text: {
                type: "object",
                description: "Listening exercise (only if listening type requested)",
                properties: {
                  title: { type: "string" },
                  text: { type: "string" },
                  topic: { type: "string" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                        correct_index: { type: "integer", minimum: 0, maximum: 3 },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "correct_index"],
                    },
                  },
                },
                required: ["title", "text", "questions"],
              },
            },
            required: [],
          },
        },
      },
    ];

    const userPrompt = `Source material:\n\n${content}\n\nGenerate exercises for these types: ${enabledTypes.join(", ")}. Level: ${level}.
${enabledTypes.includes("vocab") ? "Generate 10-20 vocabulary cards." : ""}
${enabledTypes.includes("grammar") ? "Generate 5-10 grammar questions." : ""}
${enabledTypes.includes("reading") ? "Generate 1 reading text with 3-5 questions." : ""}
${enabledTypes.includes("listening") ? "Generate 1 listening text with 3-5 questions." : ""}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools,
        tool_choice: { type: "function", function: { name: "create_exercises" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Add credits to your workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const exercises = JSON.parse(toolCall.function.arguments);

    // Shuffle options so correct answer isn't always first
    const shuffleQ = (q: any) => {
      if (!q || !Array.isArray(q.options) || q.options.length < 2) return q;
      const ci = typeof q.correct_index === "number" ? q.correct_index : -1;
      const idx = q.options.map((_: any, i: number) => i);
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      return {
        ...q,
        options: idx.map((i: number) => q.options[i]),
        correct_index: ci >= 0 ? idx.indexOf(ci) : ci,
      };
    };
    if (Array.isArray(exercises?.grammar_questions)) {
      exercises.grammar_questions = exercises.grammar_questions.map(shuffleQ);
    }
    if (exercises?.reading?.questions) {
      exercises.reading.questions = exercises.reading.questions.map(shuffleQ);
    }
    if (exercises?.listening?.questions) {
      exercises.listening.questions = exercises.listening.questions.map(shuffleQ);
    }

    return new Response(JSON.stringify({ exercises }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-exercises error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
