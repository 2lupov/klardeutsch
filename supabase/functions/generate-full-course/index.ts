import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const TOPICS: Record<string, string[]> = {
  A1: ["Begrüßung und Vorstellung","Zahlen und Alphabet","Familie und Freunde","Farben und Formen","Essen und Trinken","Tagesablauf","Wetter","Kleidung","Wohnung und Haus","Wegbeschreibung","Einkaufen","Körper und Gesundheit","Uhrzeit und Wochentage","Berufe","Hobbys und Freizeit","Verkehrsmittel","Beim Arzt","Im Restaurant","In der Schule","Tiere","Jahreszeiten und Monate","In der Stadt","Telefon und E-Mail","Feste und Feiertage","Wiederholung A1"],
  A2: ["Reisen und Urlaub","Wohnungssuche","Vorstellungsgespräch","Medien und Internet","Kochen und Rezepte","Sport und Fitness","Bank und Geld","Auf der Post","Auf dem Markt","Nachbarn und Zusammenleben","Feste und Feiern","Umwelt und Natur","Ausbildung und Schule","Kindheitserinnerungen","Pläne und Zukunft","Vergleiche","Gefühle und Emotionen","Deutsche Kultur","Unfälle und Notfälle","Behörden und Bürokratie","Musik und Kunst","Beziehungen","Technologie im Alltag","Traditionen und Bräuche","Wiederholung A2"],
  B1: ["Nachrichten und Medien","Arbeitsleben","Gesundheitssystem","Umwelt und Klima","Migration und Integration","Bildungssystem","Wirtschaft","Politik Grundlagen","Soziale Medien","Recht und Gesetze","Wohnungsmarkt","Familienmodelle","Gleichberechtigung","Ehrenamt und Freiwilligenarbeit","Literatur","Film und Theater","Philosophie des Alltags","Wissenschaft und Forschung","Globalisierung","Interkulturelle Kommunikation","Konfliktlösung","Finanzplanung","Karriereentwicklung","Deutsche Geschichte","Wiederholung B1"],
  B2: ["Wissenschaftliches Schreiben","Debatte und Argumentation","Medienanalyse","Wirtschaft vertieft","Politischer Diskurs","Rechtssprache","Medizinisches Deutsch","Technisches Deutsch","Geschäftskommunikation","Forschungsmethoden","Ethik","Psychologie","Soziologie","Kunstgeschichte","Architektur","Musiktheorie","Sprachphilosophie","Umweltpolitik","Internationale Beziehungen","Marketing","Journalismus","Übersetzungstheorie","Literaturanalyse","Kulturwissenschaften","Wiederholung B2"],
  C1: ["Wissenschaftliches Schreiben (Fortgeschritten)","Rhetorik","Linguistik","Grammatik-Feinheiten","Idiomatische Ausdrücke","Regionale Dialekte","Historische Sprachwissenschaft","Akademische Präsentationen","Kritische Analyse","Diskursanalyse","Pragmatik","Soziolinguistik","Psycholinguistik","Korpuslinguistik","Übersetzungswissenschaft","Vergleichende Literatur","Medientheorie","Politische Philosophie","Wirtschaftstheorie","Rechtsphilosophie","Ästhetik","Erkenntnistheorie","Ethik und Technologie","Deutsch im globalen Kontext","Wiederholung C1"],
};

const LANG_NAMES: Record<string, string> = {
  de: "німецька", en: "англійська", pl: "польська", es: "іспанська",
  fr: "французька", it: "італійська", uk: "українська", cs: "чеська",
};

/** Repair JSON that the model truncated mid-object (the classic failure). */
function repairJson(raw: string): any | null {
  const attempt = (s: string) => { try { return JSON.parse(s); } catch { return null; } };
  let direct = attempt(raw);
  if (direct) return direct;

  // Cut trailing garbage and close open brackets/strings.
  let s = raw;
  // drop an unterminated string tail
  const quotes = (s.match(/(?<!\\)"/g) || []).length;
  if (quotes % 2 === 1) s = s.slice(0, s.lastIndexOf('"'));
  s = s.replace(/[,\s]+$/, "");

  const stack: string[] = [];
  let inStr = false, esc = false;
  for (const ch of s) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let closed = s;
  for (let i = stack.length - 1; i >= 0; i--) closed += stack[i] === "{" ? "}" : "]";
  return attempt(closed);
}

function stripFence(content: string): string {
  let c = content.trim();
  if (c.startsWith("```json")) c = c.slice(7);
  else if (c.startsWith("```")) c = c.slice(3);
  if (c.endsWith("```")) c = c.slice(0, -3);
  return c.trim();
}

const shuffleEx = (q: any) => {
  if (!q || !Array.isArray(q.options) || q.options.length < 2) return q;
  const idx = q.options.map((_: any, i: number) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const out: any = { ...q, options: idx.map((i: number) => q.options[i]) };
  if (typeof q.correct_index === "number") out.correct_index = idx.indexOf(q.correct_index);
  return out;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await supabaseAuth.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await supabase
      .from("user_roles").select("role")
      .eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleData) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const {
      courseId,
      level,
      batchStart = 0,
      batchSize = 1,
      topics: customTopics,       // ["Тема 1", ...] — сам задаєш теми
      customPrompt,               // твій власний промпт (ціль курсу, стиль, правила)
      targetLanguage = "de",      // мова, яку вчать
      metaLanguage = "uk",        // мова пояснень
      preview = false,            // true → згенерувати і повернути БЕЗ збереження
      lessons: lessonsToSave,     // [{title, theory, exercises, sort_order}] → лише зберегти
    } = body;

    if (!courseId) return json({ error: "Missing params" }, 400);

    // ── Режим збереження вже переглянутих уроків (без запитів до AI)
    if (Array.isArray(lessonsToSave) && lessonsToSave.length > 0) {
      const rows = lessonsToSave.slice(0, 50).map((l: any, i: number) => ({
        course_id: courseId,
        title: String(l.title || `Урок ${i + 1}`).slice(0, 300),
        theory: typeof l.theory === "string" ? l.theory : JSON.stringify(l.theory ?? []),
        exercises: l.exercises ?? {},
        sort_order: Number.isFinite(l.sort_order) ? l.sort_order : batchStart + i,
      }));
      const { error: saveErr } = await supabase.from("course_lessons").insert(rows);
      if (saveErr) throw new Error("Не вдалося зберегти уроки: " + saveErr.message);
      return json({ success: true, saved: rows.length });
    }

    if (!level) return json({ error: "Missing params" }, 400);

    let batchTopics: string[];
    if (Array.isArray(customTopics) && customTopics.length > 0) {
      batchTopics = customTopics.map((t: any) => String(t).slice(0, 200)).slice(0, 5);
    } else {
      const all = TOPICS[level];
      if (!all) return json({ error: "Invalid level" }, 400);
      batchTopics = all.slice(batchStart, batchStart + Math.min(batchSize, 5));
    }
    if (batchTopics.length === 0) return json({ error: "No topics for this batch" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const targetName = LANG_NAMES[targetLanguage] || targetLanguage;
    const metaName = LANG_NAMES[metaLanguage] || "українська";

    const buildSystem = (compact: boolean) => `Ти — найкращий методист і викладач (${targetName} як іноземна). Рівень: ${level}.
Мова, яку вчить студент: ${targetName}. Мова пояснень і перекладів: ${metaName}.

${customPrompt ? `ГОЛОВНА ЦІЛЬ І ВИМОГИ ВІД ВИКЛАДАЧА (найвищий приоритет):\n${String(customPrompt).slice(0, 3000)}\n` : ""}
КРИТИЧНО: відповідь — ТІЛЬКИ один валідний JSON-обʼєкт одного уроку. Без markdown, без \`\`\`, без пояснень.

{
  "title": "Урок: Тема",
  "theory": [TheoryBlock, ...],
  "exercises": {
    "topic": "Тема",
    "vocabulary": [{"german":"слово","russian":"переклад рос","ukrainian":"переклад укр","article":"der/die/das або null","example":"речення мовою, що вивчається"}],
    "exercises": [
      {"type":"cloze","sentence":"Речення з ___","blank_index":0,"options":["A","B","C","D"],"correct":"правильна"},
      {"type":"mc","question":"Питання?","options":["A","B","C","D"],"correct_index":0,"explanation":"Пояснення"}
    ],
    "reading": {"title":"Назва","text":"звʼязний текст ${compact ? "6-8" : "8-15"} речень","questions":[{"question":"?","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]},
    "practice_dialog": {"dialog":[{"speaker":"A","text_de":"...","text_ru":"...","text_ua":"..."}]},
    "cultural_notes": [{"title":{"ru":"...","ua":"..."},"content":{"ru":"...","ua":"..."}}]
  }
}

TheoryBlock типи:
- {"type":"heading","content":"...","emoji":"📖"}
- {"type":"text","content":"..."}
- {"type":"rule","title":"...","content":"...","emoji":"📌"}
- {"type":"table","headers":["A","B"],"rows":[["1","2"]]}
- {"type":"example","de":"...","ru":"...","uk":"...","highlight":["слово"]}
- {"type":"comparison","items":[{"de":"...","ru":"...","uk":"..."}]}
- {"type":"tip","variant":"info","title":"...","content":"..."}
- {"type":"list","items_list":["..."]}

ОБОВʼЯЗКОВО в уроці: theory (${compact ? "6-8" : "8-15"} блоків), vocabulary (${compact ? "8-10" : "10-15"} слів),
exercises (${compact ? "5-6" : "6-8"}: cloze + mc), reading + ${compact ? "3" : "4-5"} питання,
practice_dialog (${compact ? "5-6" : "6-10"} реплік), cultural_notes (1-2).
Строго рівень ${level}. Пиши компактно, без води — головне, щоб JSON був ПОВНИЙ і закритий.`;

    const askForLesson = async (topic: string, lessonNo: number, compact: boolean) => {
      const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          max_tokens: 16000,
          messages: [
            { role: "system", content: buildSystem(compact) },
            {
              role: "user",
              content: `Створи ПОВНИЙ урок №${lessonNo} на тему: "${topic}". Відповідь — тільки JSON-обʼєкт уроку.`,
            },
          ],
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        const err: any = new Error(`AI error ${resp.status}: ${text.slice(0, 200)}`);
        err.status = resp.status;
        throw err;
      }

      const data = await resp.json();
      const raw = stripFence(data.choices?.[0]?.message?.content || "");
      const parsed = repairJson(raw);
      if (!parsed) {
        console.error(`Lesson ${lessonNo}: unparsable JSON, tail:`, raw.slice(-300));
        return null;
      }
      return Array.isArray(parsed) ? parsed[0] : parsed;
    };

    const generated: { topic: string; lessonNo: number; lesson: any }[] = [];
    const failed: { topic: string; reason: string }[] = [];

    for (let i = 0; i < batchTopics.length; i++) {
      const topic = batchTopics[i];
      const lessonNo = batchStart + i + 1;
      let lesson: any = null;
      try {
        lesson = await askForLesson(topic, lessonNo, false);
        if (!lesson) lesson = await askForLesson(topic, lessonNo, true); // retry, компактніше
      } catch (e: any) {
        if (e.status === 429) return json({ error: "Ліміт запитів — спробуй за хвилину" }, 429);
        if (e.status === 402) return json({ error: "Закінчились AI-кредити" }, 402);
        console.error(`Lesson ${lessonNo} failed:`, e.message);
        failed.push({ topic, reason: e.message });
        continue;
      }
      if (!lesson) {
        failed.push({ topic, reason: "AI повернув неповний JSON двічі" });
        continue;
      }
      generated.push({ topic, lessonNo, lesson });
    }

    if (generated.length === 0) {
      return json({ error: failed[0]?.reason || "AI не створив жодного уроку", failed }, 502);
    }

    const inserts = generated.map(({ topic, lessonNo, lesson }) => {
      const ex = lesson.exercises || {};
      ex.topic = ex.topic || topic;
      ex.vocabulary = Array.isArray(ex.vocabulary) ? ex.vocabulary : [];
      ex.exercises = (Array.isArray(ex.exercises) ? ex.exercises : []).map(shuffleEx);
      ex.reading = ex.reading?.text ? ex.reading : { title: topic, text: "", questions: [] };
      if (Array.isArray(ex.reading.questions)) ex.reading.questions = ex.reading.questions.map(shuffleEx);
      ex.practice_dialog = ex.practice_dialog?.dialog ? ex.practice_dialog : { dialog: [] };
      ex.cultural_notes = Array.isArray(ex.cultural_notes) ? ex.cultural_notes : [];

      const theory = typeof lesson.theory === "string" ? lesson.theory : JSON.stringify(lesson.theory || []);
      return {
        course_id: courseId,
        title: lesson.title || `Урок ${lessonNo}: ${topic}`,
        theory,
        exercises: ex,
        sort_order: lessonNo - 1,
      };
    });

    if (preview) {
      return json({
        success: true,
        preview: true,
        failed,
        lessons: inserts.map((l, i) => ({
          title: l.title,
          theory: l.theory,
          exercises: l.exercises,
          sort_order: l.sort_order,
          topic: generated[i].topic,
          lessonNo: generated[i].lessonNo,
        })),
      });
    }

    const { error: insertErr } = await supabase.from("course_lessons").insert(inserts);
    if (insertErr) {
      console.error("Insert error:", insertErr);
      throw new Error("Не вдалося зберегти уроки: " + insertErr.message);
    }

    const stats = inserts.map((l, i) => ({
      lesson: generated[i].lessonNo,
      title: l.title,
      vocab: (l.exercises as any).vocabulary?.length || 0,
      exercises: (l.exercises as any).exercises?.length || 0,
      reading: (l.exercises as any).reading?.text ? "✅" : "❌",
      dialog: (l.exercises as any).practice_dialog?.dialog?.length || 0,
      culture: (l.exercises as any).cultural_notes?.length || 0,
    }));
    console.log("Lesson completeness:", JSON.stringify(stats));

    return json({
      success: true,
      lessonsGenerated: inserts.length,
      batchStart,
      batchEnd: batchStart + inserts.length,
      failed,
      stats,
    });
  } catch (e) {
    console.error("generate-full-course error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
