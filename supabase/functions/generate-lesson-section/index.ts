import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { section, level, lesson_title, lesson_theory, existing_content } = await req.json();
    if (!section || !level) {
      return new Response(JSON.stringify({ error: "section and level required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const context = `Lesson: "${lesson_title || "Unknown"}"\nLevel: ${level}\n${lesson_theory ? `Theory context:\n${lesson_theory.slice(0, 2000)}` : ""}`;

    const sectionConfigs: Record<string, { prompt: string; tool: any }> = {
      vocab: {
        prompt: `${context}\n\nGenerate 10-15 vocabulary cards for this lesson. Each card needs: German word, article (der/die/das for nouns), Russian translation, Ukrainian translation, example sentence in German. Words should be relevant to the lesson topic and appropriate for ${level} level.${existing_content ? `\n\nExisting words (don't duplicate): ${JSON.stringify(existing_content)}` : ""}`,
        tool: {
          name: "generate_vocab",
          description: "Generate vocabulary cards",
          parameters: {
            type: "object",
            properties: {
              vocab_cards: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    german: { type: "string" },
                    russian: { type: "string" },
                    ukrainian: { type: "string" },
                    article: { type: "string", description: "der/die/das or empty" },
                    example: { type: "string", description: "Example sentence in German" },
                  },
                  required: ["german", "russian"],
                },
              },
            },
            required: ["vocab_cards"],
          },
        },
      },
      exercises: {
        prompt: `${context}\n\nGenerate 8-12 exercises for this lesson. Mix of types:\n- "cloze": fill-in-the-blank with a sentence containing ___, 4 options, and the correct answer\n- "mc": multiple choice question with 4 options and correct_index\nExercises should test the grammar and vocabulary from the lesson. Questions in German, explanations in Russian.${existing_content ? `\n\nExisting exercises (add more, don't duplicate): ${JSON.stringify(existing_content)}` : ""}`,
        tool: {
          name: "generate_exercises",
          description: "Generate exercises",
          parameters: {
            type: "object",
            properties: {
              exercises: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", enum: ["cloze", "mc"] },
                    sentence: { type: "string", description: "For cloze: sentence with ___" },
                    blank_index: { type: "integer", description: "For cloze: index of blank word" },
                    options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                    correct: { type: "string", description: "For cloze: correct word" },
                    question: { type: "string", description: "For mc: question text" },
                    correct_index: { type: "integer", description: "For mc: index of correct option" },
                    explanation: { type: "string", description: "Explanation in Russian" },
                  },
                  required: ["type", "options"],
                },
              },
            },
            required: ["exercises"],
          },
        },
      },
      grammar: {
        prompt: `${context}\n\nGenerate 5-8 grammar questions for this lesson. Each question should have 4 options and test grammar concepts. Questions in German, explanations in Russian.${existing_content ? `\n\nExisting questions (add more, don't duplicate): ${JSON.stringify(existing_content)}` : ""}`,
        tool: {
          name: "generate_grammar",
          description: "Generate grammar questions",
          parameters: {
            type: "object",
            properties: {
              grammar_questions: {
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
            required: ["grammar_questions"],
          },
        },
      },
      reading: {
        prompt: `${context}\n\nGenerate a reading text for this lesson with 3-5 comprehension questions. The text should be appropriate for ${level} level, 100-200 words. Questions should have 4 options each. Text in German, explanations in Russian.`,
        tool: {
          name: "generate_reading",
          description: "Generate reading exercise",
          parameters: {
            type: "object",
            properties: {
              reading: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  text: { type: "string" },
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                        correct_index: { type: "integer" },
                        explanation: { type: "string" },
                      },
                      required: ["question", "options", "correct_index"],
                    },
                  },
                },
                required: ["title", "text", "questions"],
              },
            },
            required: ["reading"],
          },
        },
      },
      dialog: {
        prompt: `${context}\n\nGenerate a practice dialog for this lesson (6-10 lines). Two speakers (A and B) in a realistic everyday situation relevant to the lesson topic. Each line needs: speaker, German text, Russian translation, Ukrainian translation. Level: ${level}.`,
        tool: {
          name: "generate_dialog",
          description: "Generate practice dialog",
          parameters: {
            type: "object",
            properties: {
              dialog: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    speaker: { type: "string", enum: ["A", "B"] },
                    text_de: { type: "string" },
                    text_ru: { type: "string" },
                    text_ua: { type: "string" },
                  },
                  required: ["speaker", "text_de", "text_ru"],
                },
              },
            },
            required: ["dialog"],
          },
        },
      },
      culture: {
        prompt: `${context}\n\nGenerate 2-3 cultural notes related to this lesson's topic about German culture, customs, or practical life tips. Each note needs a title and content in both Russian and Ukrainian.`,
        tool: {
          name: "generate_culture",
          description: "Generate cultural notes",
          parameters: {
            type: "object",
            properties: {
              cultural_notes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: {
                      type: "object",
                      properties: { ru: { type: "string" }, ua: { type: "string" } },
                      required: ["ru"],
                    },
                    content: {
                      type: "object",
                      properties: { ru: { type: "string" }, ua: { type: "string" } },
                      required: ["ru"],
                    },
                  },
                  required: ["title", "content"],
                },
              },
            },
            required: ["cultural_notes"],
          },
        },
      },
    };

    const config = sectionConfigs[section];
    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown section: ${section}` }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: `You are an expert German language teacher. Generate high-quality educational content for level ${level}. Always use proper German grammar and accurate translations.` },
          { role: "user", content: config.prompt },
        ],
        tools: [{ type: "function", function: config.tool }],
        tool_choice: { type: "function", function: { name: config.tool.name } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (status === 402) return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "AI generation failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = JSON.parse(toolCall.function.arguments);

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
    if (Array.isArray(result?.exercises)) result.exercises = result.exercises.map(shuffleQ);
    if (Array.isArray(result?.grammar_questions)) result.grammar_questions = result.grammar_questions.map(shuffleQ);
    if (result?.reading?.questions) result.reading.questions = result.reading.questions.map(shuffleQ);
    if (result?.listening?.questions) result.listening.questions = result.listening.questions.map(shuffleQ);

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lesson-section error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
