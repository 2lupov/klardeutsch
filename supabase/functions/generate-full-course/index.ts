import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOPICS: Record<string, string[]> = {
  A1: ["Begrüßung und Vorstellung","Zahlen und Alphabet","Familie und Freunde","Farben und Formen","Essen und Trinken","Tagesablauf","Wetter","Kleidung","Wohnung und Haus","Wegbeschreibung","Einkaufen","Körper und Gesundheit","Uhrzeit und Wochentage","Berufe","Hobbys und Freizeit","Verkehrsmittel","Beim Arzt","Im Restaurant","In der Schule","Tiere","Jahreszeiten und Monate","In der Stadt","Telefon und E-Mail","Feste und Feiertage","Wiederholung A1"],
  A2: ["Reisen und Urlaub","Wohnungssuche","Vorstellungsgespräch","Medien und Internet","Kochen und Rezepte","Sport und Fitness","Bank und Geld","Auf der Post","Auf dem Markt","Nachbarn und Zusammenleben","Feste und Feiern","Umwelt und Natur","Ausbildung und Schule","Kindheitserinnerungen","Pläne und Zukunft","Vergleiche","Gefühle und Emotionen","Deutsche Kultur","Unfälle und Notfälle","Behörden und Bürokratie","Musik und Kunst","Beziehungen","Technologie im Alltag","Traditionen und Bräuche","Wiederholung A2"],
  B1: ["Nachrichten und Medien","Arbeitsleben","Gesundheitssystem","Umwelt und Klima","Migration und Integration","Bildungssystem","Wirtschaft","Politik Grundlagen","Soziale Medien","Recht und Gesetze","Wohnungsmarkt","Familienmodelle","Gleichberechtigung","Ehrenamt und Freiwilligenarbeit","Literatur","Film und Theater","Philosophie des Alltags","Wissenschaft und Forschung","Globalisierung","Interkulturelle Kommunikation","Konfliktlösung","Finanzplanung","Karriereentwicklung","Deutsche Geschichte","Wiederholung B1"],
  B2: ["Wissenschaftliches Schreiben","Debatte und Argumentation","Medienanalyse","Wirtschaft vertieft","Politischer Diskurs","Rechtssprache","Medizinisches Deutsch","Technisches Deutsch","Geschäftskommunikation","Forschungsmethoden","Ethik","Psychologie","Soziologie","Kunstgeschichte","Architektur","Musiktheorie","Sprachphilosophie","Umweltpolitik","Internationale Beziehungen","Marketing","Journalismus","Übersetzungstheorie","Literaturanalyse","Kulturwissenschaften","Wiederholung B2"],
  C1: ["Wissenschaftliches Schreiben (Fortgeschritten)","Rhetorik","Linguistik","Grammatik-Feinheiten","Idiomatische Ausdrücke","Regionale Dialekte","Historische Sprachwissenschaft","Akademische Präsentationen","Kritische Analyse","Diskursanalyse","Pragmatik","Soziolinguistik","Psycholinguistik","Korpuslinguistik","Übersetzungswissenschaft","Vergleichende Literatur","Medientheorie","Politische Philosophie","Wirtschaftstheorie","Rechtsphilosophie","Ästhetik","Erkenntnistheorie","Ethik und Technologie","Deutsch im globalen Kontext","Wiederholung C1"],
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role client for inserts
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { courseId, level, batchStart, batchSize } = await req.json();
    if (!courseId || !level || batchStart === undefined || !batchSize) {
      return new Response(JSON.stringify({ error: "Missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const topics = TOPICS[level];
    if (!topics) {
      return new Response(JSON.stringify({ error: "Invalid level" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const batchTopics = topics.slice(batchStart, batchStart + batchSize);
    if (batchTopics.length === 0) {
      return new Response(JSON.stringify({ error: "No topics for this batch" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const lessonNumbers = batchTopics.map((_, i) => batchStart + i + 1);

    const systemPrompt = `Du bist ein erstklassiger DaF-Experte (Deutsch als Fremdsprache). Erstelle Lektionen für Niveau ${level}.
Antworte NUR mit validem JSON — kein Markdown, keine Erklärungen.

Das JSON muss ein Array von Lektionsobjekten sein, jedes mit:
{
  "title": "Lektion N: Thema",
  "theory": <TheoryBlock[] als JSON-Array>,
  "exercises": {
    "topic": "Thema",
    "vocabulary": [{"german":"...","russian":"...","ukrainian":"...","article":"der/die/das/null","example":"Beispielsatz"}],
    "exercises": [
      {"type":"cloze","sentence":"Satz mit ___","blank_index":0,"options":["A","B","C","D"],"correct":"richtige Antwort"},
      {"type":"mc","question":"Frage?","options":["A","B","C","D"],"correct_index":0,"explanation":"Erklärung"}
    ],
    "reading": {"title":"Titel","text":"Lesetext (8-15 Sätze)","questions":[{"question":"?","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]},
    "practice_dialog": {"dialog":[{"speaker":"A","text_de":"...","text_ru":"...","text_ua":"..."}]},
    "cultural_notes": [{"title":{"ru":"...","ua":"..."},"content":{"ru":"...","ua":"..."}}]
  }
}

TheoryBlock types:
- {"type":"heading","content":"...","emoji":"📖"}
- {"type":"text","content":"..."}
- {"type":"rule","title":"...","content":"...","emoji":"📌"}
- {"type":"table","headers":["..."],"rows":[["..."]]}
- {"type":"example","de":"...","ru":"...","uk":"...","highlight":["word"]}
- {"type":"comparison","items":[{"de":"...","ru":"...","uk":"..."}]}
- {"type":"tip","variant":"info|warning|remember","title":"...","content":"..."}
- {"type":"list","items_list":["..."]}

Anforderungen:
- Theory: 8-15 Blöcke mit Grammatikregeln, Beispielen, Tabellen, Vergleichen. Alle Übersetzungen auf Russisch UND Ukrainisch.
- Vocabulary: 10-15 Wörter passend zum Thema und Niveau ${level}
- Exercises: 3-4 Cloze + 3-4 MC = 6-8 total
- Reading: Ein zusammenhängender Text zum Thema mit 4-5 Verständnisfragen
- Dialog: 6-10 Zeilen, alltagsnah
- Cultural notes: 1-2 Fakten über deutsche Kultur zum Thema
- Alle Übersetzungen: Russisch + Ukrainisch
- Niveau ${level} strikt einhalten!`;

    const userPrompt = `Erstelle ${batchTopics.length} Lektionen für Niveau ${level}:
${batchTopics.map((t, i) => `${lessonNumbers[i]}. ${t}`).join("\n")}

Antworte NUR mit einem JSON-Array von ${batchTopics.length} Lektionsobjekten.`;

    console.log(`Generating ${batchTopics.length} lessons for ${level}, batch starting at ${batchStart}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, try again in a minute" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required — add credits" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      throw new Error(`AI error ${response.status}: ${t}`);
    }

    const aiData = await response.json();
    let content = aiData.choices?.[0]?.message?.content || "";

    // Clean markdown wrappers
    content = content.trim();
    if (content.startsWith("```json")) content = content.slice(7);
    if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    content = content.trim();

    let lessons: any[];
    try {
      const parsed = JSON.parse(content);
      lessons = Array.isArray(parsed) ? parsed : parsed.lessons || [parsed];
    } catch (e) {
      console.error("Failed to parse AI response:", content.slice(0, 500));
      throw new Error("AI returned invalid JSON");
    }

    // Insert lessons into DB
    const inserts = lessons.map((lesson: any, i: number) => {
      // Ensure theory is a string (JSON)
      let theory = lesson.theory;
      if (typeof theory !== "string") {
        theory = JSON.stringify(theory);
      }

      return {
        course_id: courseId,
        title: lesson.title || `Lektion ${batchStart + i + 1}: ${batchTopics[i]}`,
        theory,
        exercises: lesson.exercises || {},
        sort_order: batchStart + i,
      };
    });

    const { error: insertErr } = await supabase.from("course_lessons").insert(inserts);
    if (insertErr) {
      console.error("Insert error:", insertErr);
      throw new Error("Failed to insert lessons: " + insertErr.message);
    }

    console.log(`Successfully inserted ${inserts.length} lessons for ${level}`);

    return new Response(JSON.stringify({
      success: true,
      lessonsGenerated: inserts.length,
      batchStart,
      batchEnd: batchStart + inserts.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("generate-full-course error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
