import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Shuffle options + remap correct_index so the right answer isn't always first
function shuffleQuestion(q: any): any {
  if (!q || !Array.isArray(q.options) || q.options.length < 2) return q;
  const n = q.options.length;
  const ci = typeof q.correct_index === "number" ? q.correct_index : -1;
  const idx = q.options.map((_: any, i: number) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const newOptions = idx.map((i: number) => q.options[i]);
  const newCorrect = ci >= 0 && ci < n ? idx.indexOf(ci) : ci;
  return { ...q, options: newOptions, correct_index: newCorrect };
}

/**
 * Bulk generate +10 exercises for a given level + topic + type.
 * Body: { level, topic, type: "grammar" | "vocab" | "reading_questions" | "listening_questions" }
 * Generates content via AI and inserts directly into DB.
 */
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

    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: hasRole } = await db.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!hasRole) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { level, topic, type } = await req.json();
    if (!level || !topic || !type) {
      return new Response(JSON.stringify({ error: "level, topic, type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let prompt = "";
    let insertCount = 0;

    if (type === "grammar") {
      // Get existing questions to avoid duplicates
      const { data: existing } = await db
        .from("grammar_questions")
        .select("question")
        .eq("level", level)
        .eq("topic", topic);
      
      const existingQs = (existing || []).map((q: any) => q.question).join("\n- ");

      prompt = `You are an expert German language teacher. Generate exactly 10 NEW multiple-choice grammar questions for level ${level}, topic "${topic}".

Each question must have exactly 4 options, one correct answer, and a brief explanation in Russian.
Questions and options should be in German. Explanations in Russian.
Level ${level} means: ${levelDescription(level)}.
Topic "${topic}" — questions must be relevant to this topic.

EXISTING questions (DO NOT duplicate):
- ${existingQs || "none"}

Respond with a JSON array of 10 objects:
[{"question": "...", "options": ["a","b","c","d"], "correct_index": 0, "explanation": "..."}]

ONLY return the JSON array, nothing else.`;

      const result = await callAI(LOVABLE_API_KEY, prompt);
      const questions = parseJSON(result);
      
      if (questions && questions.length > 0) {
        const maxSort = await getMaxSort(db, "grammar_questions", level, topic);
        const rows = questions.map(shuffleQuestion).map((q: any, i: number) => ({
          level,
          topic,
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation || null,
          sort_order: maxSort + i + 1,
        }));
        const { error } = await db.from("grammar_questions").insert(rows);
        if (error) throw error;
        insertCount = rows.length;
      }
    } else if (type === "vocab") {
      const { data: existing } = await db
        .from("vocab_cards")
        .select("german")
        .eq("level", level)
        .eq("topic", topic);
      
      const existingWords = (existing || []).map((w: any) => w.german).join(", ");

      prompt = `You are an expert German language teacher. Generate exactly 10 NEW vocabulary cards for level ${level}, topic "${topic}".

Each card needs: german word, russian translation, ukrainian translation, article (der/die/das or null for non-nouns), example sentence in German.
Level ${level} means: ${levelDescription(level)}.

EXISTING words (DO NOT duplicate): ${existingWords || "none"}

Respond with a JSON array of 10 objects:
[{"german": "...", "russian": "...", "ukrainian": "...", "article": "der|die|das|null", "example": "..."}]

ONLY return the JSON array, nothing else.`;

      const result = await callAI(LOVABLE_API_KEY, prompt);
      const cards = parseJSON(result);

      if (cards && cards.length > 0) {
        const maxSort = await getMaxSort(db, "vocab_cards", level, topic);
        const rows = cards.map((c: any, i: number) => ({
          level,
          topic,
          german: c.german,
          russian: c.russian,
          ukrainian: c.ukrainian || "",
          article: c.article === "null" ? null : (c.article || null),
          example: c.example || null,
          sort_order: maxSort + i + 1,
        }));
        const { error } = await db.from("vocab_cards").insert(rows);
        if (error) throw error;
        insertCount = rows.length;
      }
    } else if (type === "reading") {
      // Generate a new reading text + 10 questions
      prompt = `You are an expert German language teacher. Create 1 reading text for level ${level}, topic "${topic}" with exactly 10 comprehension questions.

The text should be ${level === "A1" ? "50-80" : level === "A2" ? "80-120" : level === "B1" ? "120-180" : level === "B2" ? "180-250" : "250-350"} words long.
Each question: 4 options, 1 correct, explanation in Russian. Questions in German.
Level ${level} means: ${levelDescription(level)}.

Respond as JSON:
{"title": "...", "text": "...", "questions": [{"question": "...", "options": ["a","b","c","d"], "correct_index": 0, "explanation": "..."}]}

ONLY return JSON, nothing else.`;

      const result = await callAI(LOVABLE_API_KEY, prompt);
      const reading = parseJSON(result);

      if (reading && reading.title) {
        const maxSort = await getMaxSort(db, "reading_texts", level, topic);
        const { data: inserted, error: rtErr } = await db.from("reading_texts").insert({
          level, topic, title: reading.title, text: reading.text, sort_order: maxSort + 1,
        }).select("id").single();
        if (rtErr) throw rtErr;

        if (reading.questions?.length > 0) {
          const qRows = reading.questions.map(shuffleQuestion).map((q: any, i: number) => ({
            reading_id: inserted.id,
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation || null,
            sort_order: i + 1,
          }));
          const { error: rqErr } = await db.from("reading_questions").insert(qRows);
          if (rqErr) throw rqErr;
          insertCount = qRows.length;
        }
      }
    } else if (type === "listening") {
      prompt = `You are an expert German language teacher. Create 1 listening text for level ${level}, topic "${topic}" with exactly 10 comprehension questions.

The text should be ${level === "A1" ? "40-70" : level === "A2" ? "70-100" : level === "B1" ? "100-150" : level === "B2" ? "150-200" : "200-300"} words, written as natural spoken German.
Each question: 4 options, 1 correct, explanation in Russian.
Level ${level} means: ${levelDescription(level)}.

Respond as JSON:
{"title": "...", "text": "...", "questions": [{"question": "...", "options": ["a","b","c","d"], "correct_index": 0, "explanation": "..."}]}

ONLY return JSON, nothing else.`;

      const result = await callAI(LOVABLE_API_KEY, prompt);
      const listening = parseJSON(result);

      if (listening && listening.title) {
        const maxSort = await getMaxSort(db, "listening_texts", level, topic);
        const { data: inserted, error: ltErr } = await db.from("listening_texts").insert({
          level, topic, title: listening.title, text: listening.text, sort_order: maxSort + 1,
        }).select("id").single();
        if (ltErr) throw ltErr;

        if (listening.questions?.length > 0) {
          const qRows = listening.questions.map((q: any, i: number) => ({
            listening_id: inserted.id,
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation || null,
            sort_order: i + 1,
          }));
          const { error: lqErr } = await db.from("listening_questions").insert(qRows);
          if (lqErr) throw lqErr;
          insertCount = qRows.length;
        }
      }
    }

    return new Response(JSON.stringify({ success: true, inserted: insertCount, level, topic, type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("bulk-generate error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function levelDescription(level: string): string {
  const map: Record<string, string> = {
    A1: "Beginner — basic phrases, present tense, simple sentences",
    A2: "Elementary — daily situations, past tense (Perfekt), modal verbs",
    B1: "Intermediate — opinions, Konjunktiv II, relative clauses, Passiv",
    B2: "Upper intermediate — complex grammar, subjunctive, academic language",
    C1: "Advanced — nuanced expression, idiomatic usage, complex syntax",
  };
  return map[level] || level;
}

async function getMaxSort(db: any, table: string, level: string, topic: string): Promise<number> {
  const { data } = await db
    .from(table)
    .select("sort_order")
    .eq("level", level)
    .eq("topic", topic)
    .order("sort_order", { ascending: false })
    .limit(1);
  return data?.[0]?.sort_order ?? 0;
}

async function callAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("AI error:", res.status, errText);
    throw new Error(`AI call failed: ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

function parseJSON(text: string): any {
  // Extract JSON from potential markdown code blocks
  const cleaned = text.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to find JSON array or object
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch {}
    }
    console.error("Failed to parse AI response:", cleaned.slice(0, 200));
    return null;
  }
}
