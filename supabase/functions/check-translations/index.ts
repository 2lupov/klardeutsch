import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { action, fixes } = await req.json();

    // ACTION: scan — fetch all vocab cards + translation overrides and check with AI
    if (action === "scan") {
      // Fetch data to check
      const [vocabRes, overridesRes, grammarRes, cafeRes] = await Promise.all([
        supabase.from("vocab_cards").select("id, german, russian, article, level, topic").order("level").limit(500),
        supabase.from("translation_overrides").select("id, key, lang, value").limit(500),
        supabase.from("grammar_questions").select("id, question, options, level").limit(200),
        supabase.from("cafe_scenarios").select("id, barista_line, hint_ru, hint_uk, level").limit(100),
      ]);

      const vocabCards = vocabRes.data ?? [];
      const overrides = overridesRes.data ?? [];
      const grammarQs = grammarRes.data ?? [];
      const cafeScenarios = cafeRes.data ?? [];

      // Build prompt for AI
      const vocabSample = vocabCards.map((c: any) =>
        `[VOCAB|${c.id}] DE: "${c.german}" (${c.article || "no article"}) → RU: "${c.russian}" [${c.level}]`
      ).join("\n");

      // Split overrides by language for clearer checking
      const ruOverrides = overrides.filter((o: any) => o.lang === "ru");
      const ukOverrides = overrides.filter((o: any) => o.lang === "uk");

      const ruOverrideSample = ruOverrides.map((o: any) =>
        `[OVERRIDE|${o.id}] key="${o.key}" lang="ru" value="${o.value}"`
      ).join("\n");

      const ukOverrideSample = ukOverrides.map((o: any) =>
        `[OVERRIDE|${o.id}] key="${o.key}" lang="uk" value="${o.value}"`
      ).join("\n");

      const grammarSample = grammarQs.map((q: any) =>
        `[GRAMMAR|${q.id}] Q: ${q.question} | Options: ${(q.options || []).join(" / ")} [${q.level}]`
      ).join("\n");

      const cafeSample = cafeScenarios.map((c: any) =>
        `[CAFE|${c.id}] DE: "${c.barista_line}" → RU: "${c.hint_ru}" | UK: "${c.hint_uk}" [${c.level}]`
      ).join("\n");

      const prompt = `You are a professional trilingual translator (German, Russian, Ukrainian) and language expert.
Analyze the following educational content for a German language learning app that supports BOTH Russian and Ukrainian users. Find ALL errors:

1. VOCAB CARDS — Check German→Russian translations. Check articles (der/die/das). Check spelling in both German and Russian.
2. UI TRANSLATIONS (RUSSIAN) — Check Russian UI translations for accuracy, grammar, and naturalness.
3. UI TRANSLATIONS (UKRAINIAN) — Check Ukrainian UI translations for accuracy, grammar, and naturalness. Make sure it's proper Ukrainian, NOT surzhyk or Russian words in Ukrainian text.
4. GRAMMAR QUESTIONS — Check German questions and options for correctness.
5. CAFÉ SCENARIOS — Check both Russian (hint_ru) and Ukrainian (hint_uk) hints for accuracy relative to the German barista line.

IMPORTANT: Pay special attention to Ukrainian translations — they must be natural, correct Ukrainian, not a word-by-word copy from Russian.

For each error found, return a JSON array of objects:
- "type": "vocab" | "override" | "grammar" | "cafe"
- "id": the ID from brackets
- "field": which field has the error (e.g. "russian", "german", "article", "value", "question", "options", "hint_ru", "hint_uk")
- "current": current wrong value
- "suggested": corrected value  
- "reason": brief explanation in Russian

ONLY report actual errors. If everything is correct, return an empty array.

=== VOCAB CARDS (German → Russian) ===
${vocabSample || "(none)"}

=== UI TRANSLATIONS — RUSSIAN ===
${ruOverrideSample || "(none)"}

=== UI TRANSLATIONS — UKRAINIAN ===
${ukOverrideSample || "(none)"}

=== GRAMMAR QUESTIONS ===
${grammarSample || "(none)"}

=== CAFÉ SCENARIOS (German → Russian + Ukrainian) ===
${cafeSample || "(none)"}

Return ONLY a valid JSON array. No markdown, no extra text.`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "You are a precise translation checker. Return only valid JSON arrays." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (!aiRes.ok) {
        const status = aiRes.status;
        if (status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded, try again later" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted, please top up" }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const errText = await aiRes.text();
        console.error("AI error:", status, errText);
        return new Response(JSON.stringify({ error: "AI gateway error" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const aiData = await aiRes.json();
      const content = aiData.choices?.[0]?.message?.content ?? "[]";

      // Parse JSON from response (strip markdown code fences if present)
      let errors: any[] = [];
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        errors = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse AI response:", content);
        errors = [];
      }

      return new Response(JSON.stringify({
        errors,
        scanned: { vocab: vocabCards.length, overrides: overrides.length, grammar: grammarQs.length, cafe: cafeScenarios.length },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ACTION: fix — apply suggested fixes
    if (action === "fix" && Array.isArray(fixes)) {
      const results: { id: string; success: boolean }[] = [];

      for (const fix of fixes) {
        try {
          if (fix.type === "vocab") {
            const update: any = {};
            update[fix.field] = fix.suggested;
            await supabase.from("vocab_cards").update(update).eq("id", fix.id);
            results.push({ id: fix.id, success: true });
          } else if (fix.type === "override") {
            await supabase.from("translation_overrides").update({ value: fix.suggested }).eq("id", fix.id);
            results.push({ id: fix.id, success: true });
          } else if (fix.type === "grammar") {
            const update: any = {};
            if (fix.field === "options" && Array.isArray(fix.suggested)) {
              update.options = fix.suggested;
            } else {
              update[fix.field] = fix.suggested;
            }
            await supabase.from("grammar_questions").update(update).eq("id", fix.id);
            results.push({ id: fix.id, success: true });
          } else if (fix.type === "cafe") {
            const update: any = {};
            update[fix.field] = fix.suggested;
            await supabase.from("cafe_scenarios").update(update).eq("id", fix.id);
            results.push({ id: fix.id, success: true });
          }
        } catch (e) {
          console.error("Fix error:", fix.id, e);
          results.push({ id: fix.id, success: false });
        }
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-translations error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
