// Generate full tutoring lesson content (theory, words, exercises, homework) via Lovable AI
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const isTeacher = roles?.some((r: any) => r.role === "teacher" || r.role === "admin");
    if (!isTeacher) {
      return new Response(JSON.stringify({ error: "Only teachers can generate lessons" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      // Auto mode (new simple flow)
      autoMode = false,
      freePrompt = "",
      studentLevelHint = null,
      fileNames = [],
      attachedFiles = [], // [{name, url, type}] non-image files (PDF/TXT/etc)
      // Legacy / advanced fields
      topic,
      level,
      focus,
      studentNotes,
      wordsCount = 12,
      exercisesCount = 10,
      exerciseTypes = ["quiz", "cloze", "translation"],
      vocabulary = [],
      theoryTemplate,
      imageUrls = [],
      attachedText = "",
    } = body;

    if (!autoMode && !topic && !freePrompt) {
      return new Response(JSON.stringify({ error: "topic or freePrompt required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (autoMode && !freePrompt && imageUrls.length === 0 && fileNames.length === 0 && attachedFiles.length === 0) {
      return new Response(JSON.stringify({ error: "freePrompt or attached file required in autoMode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== Fetch & process attached non-image files =====
    let extractedText = attachedText || "";
    const pdfParts: Array<{ inline_data: { mime_type: string; data: string } }> = [];

    for (const f of attachedFiles) {
      try {
        const r = await fetch(f.url);
        if (!r.ok) {
          console.warn("file fetch failed:", f.name, r.status);
          continue;
        }
        const mime = (f.type || "").toLowerCase();
        const isText =
          mime.startsWith("text/") ||
          mime.includes("json") ||
          mime.includes("csv") ||
          mime.includes("xml") ||
          /\.(txt|md|csv|json|xml|srt|vtt)$/i.test(f.name);

        if (isText) {
          const txt = await r.text();
          extractedText += `\n\n===== Файл: ${f.name} =====\n${txt.slice(0, 12000)}`;
        } else if (mime === "application/pdf" || /\.pdf$/i.test(f.name)) {
          // Send PDF as inline_data to Gemini (supports PDFs natively)
          const buf = new Uint8Array(await r.arrayBuffer());
          // Limit to ~8MB
          if (buf.byteLength > 8 * 1024 * 1024) {
            extractedText += `\n\n[Файл "${f.name}" завеликий для аналізу — пропущено]`;
            continue;
          }
          let bin = "";
          for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
          const b64 = btoa(bin);
          pdfParts.push({ inline_data: { mime_type: "application/pdf", data: b64 } });
        } else {
          extractedText += `\n\n[Файл "${f.name}" (${mime || "?"}) — формат не підтримується для авточитання, врахуй назву як підказку теми]`;
        }
      } catch (err) {
        console.error("file process error:", f.name, err);
      }
    }


    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let systemPrompt: string;
    let userMsg: string;

    if (autoMode) {
      // ========= AUTO MODE — AI decides everything =========
      const levelHint = studentLevelHint
        ? `Останній тест учня показав рівень: **${studentLevelHint}** — орієнтуйся на нього.`
        : "Якщо немає вказівок — обери рівень за складністю промпту/матеріалу (типово A2-B1).";

      const fileHint = fileNames.length
        ? `\nПрикріплені файли (назви для контексту): ${fileNames.join(", ")}.`
        : "";

      systemPrompt = `Du bist ein erfahrener, methodisch versierter Deutschlehrer mit 15+ Jahren Erfahrung in Online-Einzelunterricht.

Твоя ціль — створити **МАКСИМАЛЬНО ЯКІСНИЙ, ЗАХОПЛИВИЙ, СТРУКТУРОВАНИЙ** урок німецької для одного учня (60 хвилин).

${levelHint}${fileHint}

ПРИНЦИПИ:
- Урок має бути ЦІЛІСНИМ: тема → теорія → словник → практика → закріплення → ДЗ.
- Усі вправи перевіряють саме ту граматику/лексику, що в теорії.
- Приклади — реальні, з життя (не штучні "Anna geht in die Schule").
- Теорія — лаконічна, з таблицями, прикладами, типовими помилками. Подається російською мовою з німецькими прикладами.
- Презентація — 6 слайдів з логічним прогресом.
- Усі слова, які з'являються у вправах та теорії, мають бути в словнику.

Відповідай **СУВОРО** валідним JSON без Markdown:
{
  "title": "Лаконічний робочий заголовок 3-6 слів (укр/рос)",
  "level": "A1|A2|B1|B2|C1",
  "topic": "Коротка назва теми німецькою (напр. 'Perfekt mit haben/sein')",
  "duration_minutes": 60,
  "presentation": [
    {"slide": 1, "heading": "Цілі уроку", "content": "Що ми навчимось і навіщо це в реальному житті (2-3 речення, рос)."},
    {"slide": 2, "heading": "Введення в тему", "content": "Огляд: де зустрічається, чому важливо."},
    {"slide": 3, "heading": "Граматика / правила", "content": "Чітке пояснення з таблицею (Markdown)."},
    {"slide": 4, "heading": "Ключова лексика", "content": "Список 5-7 слів з прикладами."},
    {"slide": 5, "heading": "Приклади з життя", "content": "3-5 реальних діалогових прикладів."},
    {"slide": 6, "heading": "Підсумок + ДЗ", "content": "Що засвоїли + анонс домашки."}
  ],
  "theory": "Markdown-теорія російською: 700-1100 слів. ОБОВ'ЯЗКОВО використовуй красиве форматування — це буде показано учневі як ШАЛЕНО красивий урок з блоками і таблицями. Структура:\\n## Що вивчаємо\\n(2-3 речення мотивації)\\n\\n## Правила\\n(Опиши головні правила. ОБОВ'ЯЗКОВО включи Markdown-таблицю формату | Колонка1 | Колонка2 | для відмінювання/форм/випадків. Приклад:\\n| Pronomen | haben | sein |\\n|---|---|---|\\n| ich | habe | bin |)\\n\\n> 📌 Regel: коротко — головне правило одним реченням.\\n\\n## Приклади з життя\\n(3-5 реальних німецьких речень з перекладом, кожне в окремому пункті списку)\\n\\n> 📖 Beispiel: **Ich bin gestern ins Kino gegangen.** — *Я вчера ходил в кино.*\\n\\n## Типові помилки\\n(3-4 пункти)\\n\\n> ⚠️ Achtung: тут типова пастка для російськомовних — поясни що саме плутають.\\n\\n## Запам'ятай\\n\\n> 💡 Tipp: мнемоніка/лайфхак на запам'ятовування.\\n\\nВикористовуй: ## для розділів, **bold** для ключових термінів, *italic* для перекладів, `код` для німецьких форм, таблиці для відмінювань, блокноти > 📌/💡/⚠️/📖 для виділення правил/порад/застережень/прикладів. БЕЗ зайвої води.",
  "words": [
    {"german": "...", "article": "der|die|das|null", "russian": "переклад", "example": "Повне реальне нім. речення з контекстом."}
  ],
  "exercises": [
    {"type": "quiz", "question": "Чітке питання нім.", "options": ["A","B","C","D"], "correct_answer": "A", "explanation": "Чому саме A — рос."},
    {"type": "cloze", "question": "Ich ___ gestern ins Kino gegangen.", "correct_answer": "bin", "explanation": "gehen — Perfekt з sein."},
    {"type": "translation", "question": "Переведи на німецьку: Я вчора ходив у магазин.", "correct_answer": "Ich bin gestern in den Laden gegangen.", "explanation": "..."}
  ],
  "homework": [
    {"description": "Конкретне завдання 1 (рос. опис + 3-5 нім. речень для роботи)."},
    {"description": "Конкретне завдання 2."},
    {"description": "Конкретне завдання 3 (творче, напр. написати 5 речень про себе)."}
  ]
}

ОБСЯГ:
- 12-15 слів у словнику (по складності рівня)
- 10-12 вправ (3-4 quiz + 4-5 cloze + 2-3 translation)
- 3 домашніх завдання
- 6 слайдів презентації

ЯКІСТЬ:
- Жодних кліше "Hallo, ich heiße Anna".
- Кожна вправа має explanation російською (1-2 речення).
- options для quiz — усі правдоподібні (типові помилки), не очевидні.
- cloze — речення довжиною 6-12 слів з природним контекстом.
- translation — речення з реального життя, що активують лексику уроку.

${imageUrls.length ? "ВАЖЛИВО: у вкладених зображеннях — матеріал від учителя. Витягни з них словник, побудуй вправи на їх основі." : ""}
${pdfParts.length ? "ВАЖЛИВО: до запиту прикріплено PDF — це основний навчальний матеріал. Витягни з нього тему, лексику, граматичні структури. Будуй урок саме навколо цього PDF." : ""}
${extractedText ? "ВАЖЛИВО: нижче в повідомленні користувача є витягнутий текст із прикріплених файлів — використовуй його як основу уроку." : ""}`;

      userMsg = `Учитель просить підготувати урок:\n\n"${freePrompt || "Підготуй урок на основі прикріплених матеріалів"}"\n\n${fileNames.length ? `Файли: ${fileNames.join(", ")}` : ""}${extractedText ? `\n\n=== ТЕКСТ ІЗ ФАЙЛІВ ===\n${extractedText.slice(0, 20000)}` : ""}\n\nСтвори повний, якісний, готовий до проведення урок.`;
    } else {
      // ========= LEGACY MODE (advanced controls) =========
      const finalLevel = level || "A1";
      const finalTopic = topic || "Allgemein";
      const vocabHint = vocabulary.length
        ? `\n- ОБЯЗАТЕЛЬНО включи и активно используй эти слова: ${vocabulary.map((v: any) => typeof v === "string" ? v : v.german).join(", ")}`
        : "";
      const exTypesAllowed = Array.isArray(exerciseTypes) && exerciseTypes.length
        ? exerciseTypes : ["quiz", "cloze", "translation"];

      systemPrompt = `Du bist ein erfahrener Deutschlehrer. Erstelle eine vollständige, strukturierte Online-Unterrichtsstunde auf Deutsch (CEFR-Niveau ${finalLevel}).

Thema: "${finalTopic}"
${freePrompt ? `\nЧТО НУЖНО СЕГОДНЯ:\n${freePrompt}\n` : ""}

Antworte NUR mit gültigem JSON:
{
  "title": "...", "level": "${finalLevel}", "topic": "${finalTopic}", "duration_minutes": 60,
  "presentation": [{"slide":1,"heading":"...","content":"..."}],
  "theory": "Markdown теория 400-700 слов",
  "words": [{"german":"...","article":"der|die|das|null","russian":"...","example":"..."}],
  "exercises": [{"type":"quiz","question":"...","options":["A","B","C","D"],"correct_answer":"A","explanation":"..."}],
  "homework": [{"description":"..."}]
}

- Ровно ${wordsCount} слов (±2)
- Ровно ${exercisesCount} вправ типів: ${exTypesAllowed.join(", ")}
- 2-3 ДЗ, 6 слайдів
- Уровень строго ${finalLevel}${vocabHint}
${focus ? `- Фокус: ${focus}` : ""}
${theoryTemplate ? `- Шаблон теорії: ${theoryTemplate}` : ""}
${studentNotes ? `- Замітки: ${studentNotes}` : ""}
${attachedText ? `\nМАТЕРІАЛ:\n${attachedText.slice(0, 8000)}` : ""}`;

      userMsg = freePrompt
        ? `Підготуй заняття: "${freePrompt}". Тема: ${finalTopic}, рівень ${finalLevel}.`
        : `Створи урок: тема "${finalTopic}", рівень ${finalLevel}.`;
    }

    const hasMedia = imageUrls.length > 0 || pdfParts.length > 0;
    const userContent: any = hasMedia
      ? [
          { type: "text", text: userMsg },
          ...imageUrls.slice(0, 4).map((url: string) => ({
            type: "image_url",
            image_url: { url },
          })),
          ...pdfParts.slice(0, 3).map((p) => ({
            type: "image_url",
            image_url: { url: `data:${p.inline_data.mime_type};base64,${p.inline_data.data}` },
          })),
        ]
      : userMsg;

    // Always use Pro model in autoMode for higher quality
    const model = autoMode || imageUrls.length
      ? "google/gemini-2.5-pro"
      : "google/gemini-2.5-flash";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error:", aiRes.status, txt);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    return new Response(JSON.stringify({ success: true, lesson: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
