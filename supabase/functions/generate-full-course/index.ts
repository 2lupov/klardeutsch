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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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

    const systemPrompt = `Ты — лучший преподаватель немецкого как иностранного (DaF). Создавай уроки для уровня ${level}.

КРИТИЧЕСКИ ВАЖНО: Ответ — ТОЛЬКО валидный JSON-массив. Без markdown, без пояснений, без \`\`\`.

Каждый урок — объект с ОБЯЗАТЕЛЬНЫМИ полями (пропущенные = брак):

{
  "title": "Урок N: Тема",
  "theory": [массив TheoryBlock — см. ниже],
  "exercises": {
    "topic": "Тема",
    "vocabulary": [
      {"german": "слово", "russian": "перевод_рус", "ukrainian": "перевод_укр", "article": "der/die/das или null", "example": "Примерное предложение на немецком"}
    ],
    "exercises": [
      {"type": "cloze", "sentence": "Предложение с ___", "blank_index": 0, "options": ["A","B","C","D"], "correct": "правильный ответ"},
      {"type": "mc", "question": "Вопрос?", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "Объяснение"}
    ],
    "reading": {
      "title": "Название текста",
      "text": "Связный текст для чтения, 8-15 предложений, по теме урока",
      "questions": [
        {"question": "Вопрос по тексту?", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "Почему этот ответ правильный"}
      ]
    },
    "practice_dialog": {
      "dialog": [
        {"speaker": "A", "text_de": "Немецкий текст", "text_ru": "Русский перевод", "text_ua": "Украинский перевод"}
      ]
    },
    "cultural_notes": [
      {"title": {"ru": "Заголовок", "ua": "Заголовок"}, "content": {"ru": "Интересный факт о культуре", "ua": "Цікавий факт про культуру"}}
    ]
  }
}

TheoryBlock типы (используй разнообразно, 8-15 блоков на урок):
- {"type": "heading", "content": "Заголовок раздела", "emoji": "📖"}
- {"type": "text", "content": "Объясняющий текст на русском"}
- {"type": "rule", "title": "Название правила", "content": "Описание правила", "emoji": "📌"}
- {"type": "table", "headers": ["Столбец1", "Столбец2"], "rows": [["значение1", "значение2"]]}
- {"type": "example", "de": "Немецкий пример", "ru": "Русский перевод", "uk": "Украинский перевод", "highlight": ["выделенное_слово"]}
- {"type": "comparison", "items": [{"de": "...", "ru": "...", "uk": "..."}]}
- {"type": "tip", "variant": "info", "title": "Совет", "content": "Полезная подсказка"}
- {"type": "list", "items_list": ["пункт1", "пункт2"]}

ОБЯЗАТЕЛЬНЫЕ ТРЕБОВАНИЯ для КАЖДОГО урока:
✅ theory — 8-15 блоков (грамматика, таблицы, правила, примеры)
✅ vocabulary — 10-15 слов с article, example, russian, ukrainian
✅ exercises — 3-4 cloze + 3-4 mc = 6-8 упражнений
✅ reading — ОБЯЗАТЕЛЬНО! Связный текст 8-15 предложений + 4-5 вопросов
✅ practice_dialog — ОБЯЗАТЕЛЬНО! 6-10 реплик, жизненный диалог
✅ cultural_notes — ОБЯЗАТЕЛЬНО! 1-2 культурных факта с ru и ua
✅ Все переводы на РУССКОМ и УКРАИНСКОМ
✅ Строго уровень ${level}!

НЕ ПРОПУСКАЙ НИ ОДИН РАЗДЕЛ. Каждый урок ДОЛЖЕН содержать ВСЕ 6 разделов.`;

    const userPrompt = `Создай ${batchTopics.length} полных уроков для уровня ${level}:
${batchTopics.map((t, i) => `${lessonNumbers[i]}. ${t}`).join("\n")}

Ответь ТОЛЬКО JSON-массивом из ${batchTopics.length} объектов. Каждый объект ОБЯЗАН содержать ВСЕ поля: theory, vocabulary, exercises, reading, practice_dialog, cultural_notes.`;

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

    // Validate and ensure all sections exist
    const validatedLessons = lessons.map((lesson: any, i: number) => {
      const ex = lesson.exercises || {};
      
      // Ensure all required sections exist with fallbacks
      if (!ex.vocabulary || !Array.isArray(ex.vocabulary) || ex.vocabulary.length === 0) {
        console.warn(`Lesson ${batchStart + i + 1}: missing vocabulary`);
        ex.vocabulary = [];
      }
      if (!ex.exercises || !Array.isArray(ex.exercises) || ex.exercises.length === 0) {
        console.warn(`Lesson ${batchStart + i + 1}: missing exercises`);
        ex.exercises = [];
      }
      if (!ex.reading || !ex.reading.text) {
        console.warn(`Lesson ${batchStart + i + 1}: missing reading`);
        ex.reading = ex.reading || { title: batchTopics[i] || "Lesetext", text: "", questions: [] };
      }
      if (!ex.practice_dialog || !ex.practice_dialog.dialog) {
        console.warn(`Lesson ${batchStart + i + 1}: missing dialog`);
        ex.practice_dialog = ex.practice_dialog || { dialog: [] };
      }
      if (!ex.cultural_notes || !Array.isArray(ex.cultural_notes) || ex.cultural_notes.length === 0) {
        console.warn(`Lesson ${batchStart + i + 1}: missing cultural_notes`);
        ex.cultural_notes = ex.cultural_notes || [];
      }

      // Shuffle quiz options so the correct answer isn't always at the same position
      const shuffleEx = (q: any) => {
        if (!q || !Array.isArray(q.options) || q.options.length < 2) return q;
        const idx = q.options.map((_: any, i: number) => i);
        for (let i = idx.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        const newOptions = idx.map((i: number) => q.options[i]);
        const out: any = { ...q, options: newOptions };
        if (typeof q.correct_index === "number") {
          out.correct_index = idx.indexOf(q.correct_index);
        }
        // For cloze/mc with `correct` value — value stays correct, only position changes
        return out;
      };
      ex.exercises = (ex.exercises || []).map(shuffleEx);
      if (ex.reading?.questions) ex.reading.questions = ex.reading.questions.map(shuffleEx);
      if (ex.listening?.questions) ex.listening.questions = ex.listening.questions.map(shuffleEx);

      return { ...lesson, exercises: ex };
    });

    // Insert lessons into DB
    const inserts = validatedLessons.map((lesson: any, i: number) => {
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

    // Log completeness stats
    const stats = validatedLessons.map((l: any, i: number) => ({
      lesson: batchStart + i + 1,
      vocab: l.exercises.vocabulary?.length || 0,
      exercises: l.exercises.exercises?.length || 0,
      reading: l.exercises.reading?.text ? "✅" : "❌",
      dialog: l.exercises.practice_dialog?.dialog?.length || 0,
      culture: l.exercises.cultural_notes?.length || 0,
    }));
    console.log("Lesson completeness:", JSON.stringify(stats));

    return new Response(JSON.stringify({
      success: true,
      lessonsGenerated: inserts.length,
      batchStart,
      batchEnd: batchStart + inserts.length,
      stats,
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
