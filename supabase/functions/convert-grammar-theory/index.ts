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
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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

    const { id } = await req.json();

    // If id provided, convert just that lesson. Otherwise convert all non-JSON lessons.
    let lessons: any[] = [];
    if (id) {
      const { data } = await db.from("grammar_lessons").select("*").eq("id", id);
      lessons = data || [];
    } else {
      const { data } = await db.from("grammar_lessons").select("*").order("level").order("topic");
      // Filter out lessons that are already JSON
      lessons = (data || []).filter((l: any) => {
        try {
          const parsed = JSON.parse(l.theory);
          return !(Array.isArray(parsed) && parsed[0]?.type);
        } catch {
          return true; // Not JSON, needs conversion
        }
      });
    }

    if (lessons.length === 0) {
      return new Response(JSON.stringify({ success: true, converted: 0, message: "All lessons already in JSON format" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: { id: string; level: string; topic: string; status: string }[] = [];

    for (const lesson of lessons) {
      try {
        const prompt = `Convert this German grammar lesson (level ${lesson.level}, topic "${lesson.topic}") into a structured JSON array of TheoryBlock objects.

SOURCE THEORY (markdown):
${lesson.theory}

RULES:
1. Create a RICH, DETAILED structured theory — expand on the source material significantly
2. Use these block types: "heading", "text", "rule", "table", "example", "comparison", "tip", "list"
3. Start with a heading block with appropriate emoji
4. Add grammar tables where applicable (conjugation tables, declension tables, etc.)
5. Add multiple examples with German sentences + Russian translations
6. Add comparison blocks for German↔Russian parallels
7. Add tips with variant "info", "warning", or "remember"
8. Make the theory 3-5x more detailed than the source — add more examples, edge cases, common mistakes
9. All explanations in Russian, all examples in German with Russian translations
10. The content must be pedagogically excellent for ${lesson.level} level learners

OUTPUT FORMAT — JSON array of objects, each with "type" and relevant fields:

{"type":"heading","emoji":"📝","content":"Title here"}
{"type":"text","content":"Paragraph text"}
{"type":"rule","emoji":"📌","title":"Rule name","content":"Rule explanation"}
{"type":"table","headers":["Col1","Col2"],"rows":[["cell","cell"]]}
{"type":"example","de":"German sentence","ru":"Russian translation","highlight":["key","words"]}
{"type":"comparison","items":[{"de":"German","ru":"Russian"}]}
{"type":"tip","variant":"info|warning|remember","title":"Title","content":"Tip text"}
{"type":"list","items_list":["item1","item2"]}

Return ONLY the JSON array. No markdown wrapping.`;

        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error(`AI error for ${lesson.id}:`, res.status, errText);
          results.push({ id: lesson.id, level: lesson.level, topic: lesson.topic, status: `AI error: ${res.status}` });
          continue;
        }

        const aiData = await res.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        // Parse JSON from response
        const cleaned = content.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
        let blocks: any;
        try {
          blocks = JSON.parse(cleaned);
        } catch {
          const match = cleaned.match(/\[[\s\S]*\]/);
          if (match) {
            blocks = JSON.parse(match[0]);
          } else {
            throw new Error("Could not parse AI response as JSON");
          }
        }

        // Validate it's an array of blocks
        if (!Array.isArray(blocks) || blocks.length === 0 || !blocks[0].type) {
          throw new Error("Invalid TheoryBlock[] format");
        }

        // Update in DB
        const { error } = await db
          .from("grammar_lessons")
          .update({ theory: JSON.stringify(blocks) })
          .eq("id", lesson.id);

        if (error) throw error;

        results.push({ id: lesson.id, level: lesson.level, topic: lesson.topic, status: "ok" });
        console.log(`✅ Converted: ${lesson.level}/${lesson.topic}`);

        // Rate limit delay
        await new Promise(r => setTimeout(r, 1000));
      } catch (e: any) {
        console.error(`Error converting ${lesson.id}:`, e);
        results.push({ id: lesson.id, level: lesson.level, topic: lesson.topic, status: `error: ${e.message}` });
      }
    }

    const successCount = results.filter(r => r.status === "ok").length;

    return new Response(JSON.stringify({ 
      success: true, 
      converted: successCount, 
      total: lessons.length,
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("convert-grammar-theory error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
