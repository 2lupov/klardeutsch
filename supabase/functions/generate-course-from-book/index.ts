// Build a complete course from photos of a book / encyclopedia pages.
// Admin only. Multimodal AI (Gemini) reads the pages, then we create the course
// and its lessons (theory + vocabulary + exercises + reading + quiz).
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

Deno.serve(async (req) => {
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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const images: string[] = Array.isArray(body.images) ? body.images.slice(0, 50) : [];
    const paths: string[] = Array.isArray(body.paths) ? body.paths.slice(0, 50) : [];
    const level = String(body.level || "A1");
    const targetLanguage = String(body.targetLanguage || "de");
    const lessonCount = Math.min(Math.max(Number(body.lessonCount) || 3, 1), 8);
    const courseId: string | undefined = body.courseId || undefined;
    const hint = String(body.hint || "").slice(0, 1000);
    const price = Number(body.price) || 0;

    if (images.length === 0) return json({ error: "Немає зображень" }, 400);
    if (!/^[A-C][12]$/.test(level)) return json({ error: "Невірний рівень" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Ти — найкращий методист мовної школи. Ти отримуєш ФОТО сторінок книги/енциклопедії
і будуєш із них готовий "під ключ" курс рівня ${level} (мова курсу: ${targetLanguage}).

ВІДПОВІДАЙ ТІЛЬКИ валідним JSON без markdown і без пояснень.

Структура відповіді:
{
  "course": { "title": "Назва курсу українською", "description": "2-3 речення про курс", "summary": "що саме є в книзі" },
  "lessons": [
    {
      "title": "Урок 1: Тема",
      "theory": [TheoryBlock, ...],           // 8-15 блоків, побудованих на змісті фото
      "exercises": {
        "topic": "Тема",
        "vocabulary": [{"german":"слово","russian":"переклад рос","ukrainian":"переклад укр","article":"der/die/das або null","example":"речення"}],
        "exercises": [
          {"type":"cloze","sentence":"Речення з ___","blank_index":0,"options":["A","B","C","D"],"correct":"правильна"},
          {"type":"mc","question":"Питання?","options":["A","B","C","D"],"correct_index":0,"explanation":"Пояснення"}
        ],
        "reading": {"title":"Назва","text":"текст 8-15 речень зі змісту фото","questions":[{"question":"?","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}]},
        "quiz": [{"question":"Питання по матеріалу книги?","options":["A","B","C","D"],"correct_index":0,"explanation":"..."}],
        "cultural_notes": [{"title":{"ru":"...","ua":"..."},"content":{"ru":"...","ua":"..."}}]
      }
    }
  ]
}

TheoryBlock типи:
- {"type":"heading","content":"Заголовок","emoji":"📖"}
- {"type":"text","content":"Пояснення українською"}
- {"type":"rule","title":"Правило","content":"...","emoji":"📌"}
- {"type":"table","headers":["A","B"],"rows":[["1","2"]]}
- {"type":"example","de":"...","ru":"...","uk":"...","highlight":["слово"]}
- {"type":"tip","variant":"info","title":"Порада","content":"..."}
- {"type":"list","items_list":["пункт"]}
- {"type":"image","path":"ШЛЯХ_ФОТО","caption":"Що видно на цій сторінці"}

ПРАВИЛА:
✅ Використовуй ТІЛЬКИ факти, слова й ілюстрації зі фото. Нічого не вигадуй.
✅ Кожен урок ОБОВ'ЯЗКОВО має: theory (8-15), vocabulary (10-15), exercises (6-8), reading, quiz (5-8 питань), cultural_notes (1-2).
✅ У theory кожного уроку ОБОВ'ЯЗКОВО додай 1-2 блоки "image" з "path" рівно з цього списку шляхів фото:
${paths.map((p, i) => `${i + 1}. ${p}`).join("\n")}
✅ Рівно ${lessonCount} уроків. Строго рівень ${level}. Уся метамова — українська.`;

    const userContent: any[] = [
      {
        type: "text",
        text: `Побудуй курс з ${lessonCount} уроків за цими фото сторінок книги.${hint ? ` Побажання: ${hint}` : ""} Відповідь — тільки JSON.`,
      },
      ...images.map((url) => ({ type: "image_url", image_url: { url } })),
    ];

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      }),
    });

    if (!resp.ok) {
      if (resp.status === 429) return json({ error: "Занадто багато запитів, спробуй за хвилину" }, 429);
      if (resp.status === 402) return json({ error: "Закінчились AI-кредити" }, 402);
      const t = await resp.text();
      throw new Error(`AI error ${resp.status}: ${t.slice(0, 300)}`);
    }

    const aiData = await resp.json();
    let content: string = aiData.choices?.[0]?.message?.content || "";
    content = content.trim();
    if (content.startsWith("```json")) content = content.slice(7);
    if (content.startsWith("```")) content = content.slice(3);
    if (content.endsWith("```")) content = content.slice(0, -3);
    content = content.trim();

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("Invalid AI JSON:", content.slice(0, 500));
      throw new Error("AI повернув некорректний JSON — спробуй ще раз");
    }

    const lessons: any[] = Array.isArray(parsed?.lessons) ? parsed.lessons : [];
    if (lessons.length === 0) throw new Error("AI не створив уроків");

    // --- Course: reuse or create ---
    let finalCourseId = courseId;
    let existingLessons = 0;

    if (finalCourseId) {
      const { count } = await admin
        .from("course_lessons")
        .select("*", { count: "exact", head: true })
        .eq("course_id", finalCourseId);
      existingLessons = count || 0;
    } else {
      const { data: created, error: cErr } = await admin
        .from("courses")
        .insert({
          title: parsed?.course?.title || `Курс за книгою (${level})`,
          description: parsed?.course?.description || null,
          level,
          target_language: targetLanguage,
          price,
          available: false,
        } as any)
        .select("id")
        .single();
      if (cErr) throw new Error("Не вдалося створити курс: " + cErr.message);
      finalCourseId = created!.id;
    }

    const keepPath = (p: unknown) =>
      typeof p === "string" && paths.includes(p);

    const inserts = lessons.slice(0, lessonCount).map((lesson: any, i: number) => {
      let theory = Array.isArray(lesson.theory) ? lesson.theory : [];
      // Keep only image blocks that point to real uploaded photos
      theory = theory.filter((b: any) => b?.type !== "image" || keepPath(b.path));
      // Guarantee at least one page photo per lesson
      if (!theory.some((b: any) => b?.type === "image") && paths.length > 0) {
        theory.push({
          type: "image",
          path: paths[i % paths.length],
          caption: "Сторінка книги",
        });
      }
      const ex = lesson.exercises || {};
      ex.vocabulary = Array.isArray(ex.vocabulary) ? ex.vocabulary : [];
      ex.exercises = Array.isArray(ex.exercises) ? ex.exercises : [];
      ex.quiz = Array.isArray(ex.quiz) ? ex.quiz : [];
      ex.reading = ex.reading?.text ? ex.reading : { title: lesson.title, text: "", questions: [] };
      ex.cultural_notes = Array.isArray(ex.cultural_notes) ? ex.cultural_notes : [];
      ex.source_images = paths;

      return {
        course_id: finalCourseId,
        title: lesson.title || `Урок ${existingLessons + i + 1}`,
        theory: JSON.stringify(theory),
        exercises: ex,
        sort_order: existingLessons + i,
      };
    });

    const { error: insErr } = await admin.from("course_lessons").insert(inserts);
    if (insErr) throw new Error("Не вдалося зберегти уроки: " + insErr.message);

    return json({
      success: true,
      courseId: finalCourseId,
      courseTitle: parsed?.course?.title || null,
      lessonsCreated: inserts.length,
      lessons: inserts.map((l) => l.title),
    });
  } catch (e) {
    console.error("generate-course-from-book error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
