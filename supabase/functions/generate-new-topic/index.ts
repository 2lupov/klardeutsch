import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { level, topicName, topicEmoji } = await req.json();
    
    if (!level || !topicName) {
      return new Response(
        JSON.stringify({ error: "level and topicName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if topic already exists
    const { data: existingTopic } = await supabase
      .from("topics")
      .select("id")
      .eq("level", level)
      .eq("name", topicName)
      .single();

    if (existingTopic) {
      return new Response(
        JSON.stringify({ error: "Тема уже существует" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the topic first
    const { data: newTopic, error: topicError } = await supabase
      .from("topics")
      .insert({ level, name: topicName, emoji: topicEmoji || "📚" })
      .select()
      .single();

    if (topicError) {
      throw new Error(`Failed to create topic: ${topicError.message}`);
    }

    const results = {
      topic: newTopic,
      vocab: 0,
      grammar: 0,
      reading: 0,
      listening: 0,
    };

    // Generate vocabulary (15 words)
    const vocabPrompt = `Generate 15 German vocabulary words for level ${level} on topic "${topicName}".
Return ONLY a valid JSON array, no other text:
[
  {
    "german": "das Wort",
    "russian": "слово",
    "ukrainian": "слово",
    "article": "das",
    "example": "Ich lerne ein neues Wort."
  }
]
Requirements:
- Words must match ${level} level complexity
- Include articles for nouns (der/die/das)
- Include practical example sentences
- russian and ukrainian translations must be accurate`;

    const vocabRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a German language expert. Return only valid JSON arrays." },
          { role: "user", content: vocabPrompt },
        ],
      }),
    });

    if (vocabRes.ok) {
      const vocabData = await vocabRes.json();
      const content = vocabData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const words = JSON.parse(jsonMatch[0]);
          const insertData = words.map((w: any, i: number) => ({
            level,
            topic: topicName,
            german: w.german,
            russian: w.russian,
            ukrainian: w.ukrainian || w.russian,
            article: w.article || null,
            example: w.example || null,
            sort_order: i,
          }));
          const { error } = await supabase.from("vocab_cards").insert(insertData);
          if (!error) results.vocab = insertData.length;
        }
      } catch (e) {
        console.error("Vocab parse error:", e);
      }
    }

    // Generate grammar lesson with exercises
    const grammarPrompt = `Create a grammar lesson for German level ${level} related to topic "${topicName}".
Return ONLY valid JSON:
{
  "theory": "Markdown formatted theory explaining one grammar concept relevant to this topic. Include tables, examples, and rules.",
  "questions": [
    {
      "question": "Wählen Sie die richtige Form: Ich ___ nach Hause.",
      "options": ["gehe", "geht", "gehen", "gehst"],
      "correct_index": 0,
      "explanation": "Nach 'ich' verwendet man die Form 'gehe'."
    }
  ]
}
Generate 10 questions. Make sure correct_index matches the position of the correct answer in options (0-based).`;

    const grammarRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a German grammar expert. Return only valid JSON." },
          { role: "user", content: grammarPrompt },
        ],
      }),
    });

    if (grammarRes.ok) {
      const grammarData = await grammarRes.json();
      const content = grammarData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const lesson = JSON.parse(jsonMatch[0]);
          
          // Insert grammar lesson
          await supabase.from("grammar_lessons").insert({
            level,
            topic: topicName,
            theory: lesson.theory || `# ${topicName}\n\nГрамматика для темы ${topicName}.`,
          });

          // Insert questions
          if (lesson.questions?.length > 0) {
            const questionsData = lesson.questions.map((q: any, i: number) => ({
              level,
              topic: topicName,
              question: q.question,
              options: q.options,
              correct_index: q.correct_index,
              explanation: q.explanation || null,
              sort_order: i,
            }));
            const { error } = await supabase.from("grammar_questions").insert(questionsData);
            if (!error) results.grammar = questionsData.length;
          }
        }
      } catch (e) {
        console.error("Grammar parse error:", e);
      }
    }

    // Generate reading text with questions
    const readingPrompt = `Create a reading text for German level ${level} about "${topicName}".
Return ONLY valid JSON:
{
  "title": "Title in German",
  "text": "German text (150-300 words for ${level})",
  "questions": [
    {
      "question": "Question about the text in German",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Explanation why this is correct"
    }
  ]
}
Generate 5 comprehension questions.`;

    const readingRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a German language teacher. Return only valid JSON." },
          { role: "user", content: readingPrompt },
        ],
      }),
    });

    if (readingRes.ok) {
      const readingData = await readingRes.json();
      const content = readingData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const reading = JSON.parse(jsonMatch[0]);
          
          const { data: newReading, error: readingError } = await supabase
            .from("reading_texts")
            .insert({
              level,
              topic: topicName,
              title: reading.title,
              text: reading.text,
            })
            .select()
            .single();

          if (!readingError && newReading && reading.questions?.length > 0) {
            const questionsData = reading.questions.map((q: any, i: number) => ({
              reading_id: newReading.id,
              question: q.question,
              options: q.options,
              correct_index: q.correct_index,
              explanation: q.explanation || null,
              sort_order: i,
            }));
            const { error } = await supabase.from("reading_questions").insert(questionsData);
            if (!error) results.reading = questionsData.length;
          }
        }
      } catch (e) {
        console.error("Reading parse error:", e);
      }
    }

    // Generate listening text with questions
    const listeningPrompt = `Create a listening exercise for German level ${level} about "${topicName}".
Return ONLY valid JSON:
{
  "title": "Title in German",
  "text": "German text suitable for listening (100-200 words for ${level}). This will be converted to audio.",
  "questions": [
    {
      "question": "Comprehension question in German",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "explanation": "Why this answer is correct"
    }
  ]
}
Generate 5 questions about the audio content.`;

    const listeningRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a German language teacher. Return only valid JSON." },
          { role: "user", content: listeningPrompt },
        ],
      }),
    });

    if (listeningRes.ok) {
      const listeningData = await listeningRes.json();
      const content = listeningData.choices?.[0]?.message?.content || "";
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const listening = JSON.parse(jsonMatch[0]);
          
          const { data: newListening, error: listeningError } = await supabase
            .from("listening_texts")
            .insert({
              level,
              topic: topicName,
              title: listening.title,
              text: listening.text,
            })
            .select()
            .single();

          if (!listeningError && newListening && listening.questions?.length > 0) {
            const questionsData = listening.questions.map((q: any, i: number) => ({
              listening_id: newListening.id,
              question: q.question,
              options: q.options,
              correct_index: q.correct_index,
              explanation: q.explanation || null,
              sort_order: i,
            }));
            const { error } = await supabase.from("listening_questions").insert(questionsData);
            if (!error) results.listening = questionsData.length;
          }
        }
      } catch (e) {
        console.error("Listening parse error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        topic: topicName,
        level,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
