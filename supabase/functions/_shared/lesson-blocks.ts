// Спільна логіка: розпізнавання сторінок підручника в інтерактивні блоки уроку.

export const blockCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...blockCors, "Content-Type": "application/json" },
  });

export const SYSTEM_BLOCKS = `Ти — методист німецької мови (DaF) і асистент викладача. На зображеннях — сторінки підручника Kursbuch або робочого зошита Arbeitsbuch.
Перетвори сторінки в послідовність ІНТЕРАКТИВНИХ БЛОКІВ уроку. Поверни ЛИШЕ JSON:

{ "topics": ["Genitiv", "Adjektivendungen"], "summary": "Один рядок українською: про що цей урок", "sections": [ { "title": "Genitiv", "summary": "Коротко про тему", "layout": "grammar", "blocks": [ { "type": "...", "title": "...", "payload": { ... } } ] } ], "blocks": [ { "type": "...", "title": "...", "payload": { ... } } ] }

"topics" — 1–5 коротких назв тем (граматика або лексичне поле), як їх шукав би викладач. "summary" — до 160 символів. Якщо на сторінках більше однієї теми, розділи матеріал на sections у тому самому порядку. Для однієї теми також поверни одну section. Кожна section має короткий заголовок і власні blocks. layout: grammar, reading, illustrated або practice. "blocks" на верхньому рівні — усі блоки у порядку секцій (для старих читачів).


Дозволені типи і форма payload:

"topic" — заголовок параграфа: { "chapter": "§ 1", "subtitle": "...", "intro": "..." }. title — назва теми німецькою.
"table" — граматична таблиця з правильними формами з джерела: { "columns": ["Form", "Beispiel"], "rows": [["ich", "hätte"]], "caption": "..." }. Виділяй закінчення **подвійними зірочками**.
"callout" — примітка або правило: { "tone": "note|warning|example", "markdown": "Коротке пояснення з **акцентами**" }.
"artikel" — тренування роду, тільки коли рід слів можна визначити з джерела: { "instructions": "укр", "article_items": [{ "word": "Haus", "article": "das" }] }. article: der, die, das або plural.
"transformation" — перетворення речення: { "instructions": "укр", "example": { "source": "...", "answer": "..." }, "transformations": [{ "source": "...", "answer": "...", "hint": "..." }] }.

0) "theorie" — коротке ПРАВИЛО перед вправами (граматика, лексичне поле, вживання).
payload: { "instructions": "укр", "markdown": "## Заголовок\n\nпояснення українською\n\n- пункт\n- пункт", "examples": [ { "de": "Ich gehe ins Kino.", "uk": "переклад" } ] }
Markdown: лише ## заголовки, абзаци, - списки та **жирне**. Пояснення українською, приклади німецькою. Додавай блок теорії перед вправами на нове правило.

1) "hoer" — тільки якщо в запиті підтверджено наявність доступного аудіофайлу й на сторінці є транскрипт.
payload: { "instructions": "укр", "transcript": [ { "t": 0, "de": "речення", "uk": "переклад" } ] }
Транскрипт відтвори лише з книги; не вигадуй діалог і не обіцяй відтворення відсутнього запису. t — приблизна секунда (крок 4–6 с).

2) "lesen" — якщо є текст для читання чи список лексики.
payload: { "instructions": "укр", "text": "німецький текст", "words": [ { "de": "Schrank", "uk": "шафа", "artikel": "der|die|das|plural", "plural": "die Schränke" } ] }
Слова у "words" мають зустрічатися в "text" у тій самій формі (без артикля).

3) "luecke" — якщо у вправі є пропуски (___ , точки, дужки) на відмінки, прийменники, закінчення.
payload: { "instructions": "укр", "mode": "select", "items": [ { "sentence": "Das Buch liegt ___ dem Tisch.", "answer": "auf", "options": ["auf","an","in","unter"], "synonyms": [], "hint": "Wo? → Dativ" } ] }
У кожному sentence РІВНО один "___". options — 4 варіанти, серед них правильний. hint — коротке правило українською (Dativ/Akkusativ, Adjektivendung тощо).

4) "paare" — якщо завдання на сопоставлення (A–F до 1–6, слово+переклад, дієслово+керування).
payload: { "instructions": "укр", "pairs": [ { "left": "warten", "right": "auf + Akk." } ] }

5) "satzbau" — якщо слова речення перемішані або треба скласти речення.
payload: { "instructions": "укр", "sentences": [ { "words": ["Ich","gehe","heute","ins","Kino"], "hint": "дієслово на 2 місці" } ] }
"words" — правильний порядок. Для Nebensatz дієслово в кінці.

6) "schreiben" — якщо є завдання на письмо або усну відповідь.
payload: { "instructions": "укр", "prompt": "німецьке завдання", "redemittel": ["фраза-клише"], "min_words": 30, "allow_voice": true }

Правила: інструкції та підказки — українською, увесь навчальний матеріал — німецькою. Не вигадуй вправ, яких немає на сторінці. Не генеруй ілюстрацій замість сторінок книги. Для нової теми використай "topic", за наявності правила додай "theorie", "table" або "callout". Не вигадуй текст аудіо. Поверни стільки блоків, скільки реально підтверджує джерело (до 12). Без пояснень поза JSON.`;

export interface RawBlock {
  type?: string;
  title?: string;
  payload?: Record<string, unknown>;
}

const ALLOWED = ["topic", "table", "callout", "artikel", "transformation", "theorie", "hoer", "lesen", "luecke", "paare", "satzbau", "schreiben"];
const str = (v: unknown, max: number) => (v === null || v === undefined ? null : String(v).slice(0, max));

/** Валідує блок і повертає нормалізований payload або null. */
export function normalizeBlock(raw: RawBlock): { type: string; title: string | null; payload: any } | null {
  const type = String(raw?.type ?? "");
  if (!ALLOWED.includes(type)) return null;
  const p: any = raw?.payload ?? {};
  const payload: any = { instructions: str(p.instructions, 800) };

  switch (type) {
    case "topic": {
      payload.chapter = str(p.chapter, 50) ?? "";
      payload.subtitle = str(p.subtitle, 200) ?? "";
      payload.intro = str(p.intro, 1200) ?? "";
      break;
    }
    case "table": {
      const columns = Array.isArray(p.columns) ? p.columns.slice(0, 8).map((x: unknown) => str(x, 100) ?? "") : [];
      const rows = Array.isArray(p.rows) ? p.rows.slice(0, 30).filter(Array.isArray).map((row: unknown[]) => columns.map((_, i) => str(row[i], 300) ?? "")) : [];
      if (!columns.length || !rows.length) return null;
      payload.columns = columns;
      payload.rows = rows;
      payload.caption = str(p.caption, 250) ?? "";
      break;
    }
    case "callout": {
      if (!p.markdown) return null;
      payload.markdown = str(p.markdown, 1800);
      payload.tone = ["note", "warning", "example"].includes(String(p.tone)) ? p.tone : "note";
      break;
    }
    case "artikel": {
      const items = Array.isArray(p.article_items) ? p.article_items.slice(0, 25).map((x: any) => ({ word: str(x?.word, 100) ?? "", article: String(x?.article ?? ""), hint: str(x?.hint, 200) })).filter((x: any) => x.word && ["der", "die", "das", "plural"].includes(x.article)) : [];
      if (!items.length) return null;
      payload.article_items = items;
      break;
    }
    case "transformation": {
      const items = Array.isArray(p.transformations) ? p.transformations.slice(0, 20).map((x: any) => ({ source: str(x?.source, 300) ?? "", answer: str(x?.answer, 300) ?? "", hint: str(x?.hint, 200) })).filter((x: any) => x.source && x.answer) : [];
      if (!items.length) return null;
      payload.transformations = items;
      payload.example = { source: str(p.example?.source, 300) ?? "", answer: str(p.example?.answer, 300) ?? "" };
      break;
    }
    case "theorie": {
      const markdown = str(p.markdown, 6000);
      if (!markdown) return null;
      payload.markdown = markdown;
      payload.examples = Array.isArray(p.examples)
        ? p.examples
            .slice(0, 12)
            .map((x: any) => ({ de: str(x?.de, 300) ?? "", uk: str(x?.uk, 300) }))
            .filter((x: any) => x.de)
        : [];
      break;
    }
    case "hoer": {
      const transcript = Array.isArray(p.transcript)
        ? p.transcript
            .slice(0, 40)
            .map((l: any) => ({ t: Number.isFinite(Number(l?.t)) ? Number(l.t) : null, de: str(l?.de, 400) ?? "", uk: str(l?.uk, 400) }))
            .filter((l: any) => l.de)
        : [];
      if (transcript.length === 0) return null;
      payload.transcript = transcript;
      break;
    }
    case "lesen": {
      const text = str(p.text, 6000);
      if (!text) return null;
      payload.text = text;
      payload.words = Array.isArray(p.words)
        ? p.words
            .slice(0, 40)
            .map((w: any) => ({
              de: str(w?.de, 80) ?? "",
              uk: str(w?.uk, 120) ?? "",
              artikel: ["der", "die", "das", "plural"].includes(String(w?.artikel)) ? String(w.artikel) : null,
              plural: str(w?.plural, 120),
            }))
            .filter((w: any) => w.de && w.uk)
        : [];
      break;
    }
    case "luecke": {
      const items = Array.isArray(p.items)
        ? p.items
            .slice(0, 25)
            .map((it: any) => ({
              sentence: str(it?.sentence, 400) ?? "",
              answer: str(it?.answer, 120) ?? "",
              options: Array.isArray(it?.options) ? it.options.slice(0, 6).map((o: any) => str(o, 120)).filter(Boolean) : [],
              synonyms: Array.isArray(it?.synonyms) ? it.synonyms.slice(0, 6).map((o: any) => str(o, 120)).filter(Boolean) : [],
              hint: str(it?.hint, 300),
            }))
            .filter((it: any) => it.sentence.includes("___") && it.answer)
        : [];
      if (items.length === 0) return null;
      items.forEach((it: any) => {
        it.options = [it.answer, ...new Set(it.options.filter((option: string) => option !== it.answer))].slice(0, 4);
      });
      // Never present a one-option multiple-choice question as a four-option exercise.
      payload.mode = p.mode === "input" || items.some((it: any) => it.options.length < 4) ? "input" : "select";
      payload.items = items;
      break;
    }
    case "paare": {
      const pairs = Array.isArray(p.pairs)
        ? p.pairs
            .slice(0, 20)
            .map((x: any) => ({ left: str(x?.left, 200) ?? "", right: str(x?.right, 200) ?? "" }))
            .filter((x: any) => x.left && x.right)
        : [];
      if (pairs.length < 2) return null;
      payload.pairs = pairs;
      break;
    }
    case "satzbau": {
      const sentences = Array.isArray(p.sentences)
        ? p.sentences
            .slice(0, 15)
            .map((s: any) => ({
              words: Array.isArray(s?.words)
                ? s.words.slice(0, 20).map((w: any) => str(w, 60)).filter(Boolean)
                : String(s?.sentence ?? "").split(/\s+/).filter(Boolean).slice(0, 20),
              hint: str(s?.hint, 300),
            }))
            .filter((s: any) => s.words.length >= 3)
        : [];
      if (sentences.length === 0) return null;
      payload.sentences = sentences;
      break;
    }
    case "schreiben": {
      payload.prompt = str(p.prompt, 800) ?? "";
      if (!payload.prompt) return null;
      payload.redemittel = Array.isArray(p.redemittel) ? p.redemittel.slice(0, 10).map((r: any) => str(r, 200)).filter(Boolean) : [];
      payload.min_words = Number.isFinite(Number(p.min_words)) ? Math.min(200, Math.max(5, Number(p.min_words))) : 30;
      payload.allow_voice = p.allow_voice !== false;
      break;
    }
  }

  return { type, title: str(raw?.title, 200), payload };
}

/** Завантажує сторінки зі сховища і повертає data-URL для мультимодального запиту. */
export async function imagesAsDataUrls(admin: any, paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const path of paths.slice(0, 12)) {
    const { data: file, error } = await admin.storage.from("tutoring-materials").download(path);
    if (error || !file) continue;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 12 * 1024 * 1024) continue;
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const mime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
    out.push(`data:${mime};base64,${btoa(binary)}`);
  }
  return out;
}

/** Один мультимодальний виклик до AI Gateway, повертає масив сирих блоків. */
export async function askForBlocks(
  apiKey: string,
  dataUrls: string[],
  userText: string,
): Promise<{ blocks: RawBlock[]; sections: Array<{ title?: string; summary?: string; layout?: string; blocks?: RawBlock[] }>; topics: string[]; summary: string | null; status: number; error?: string }> {

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      messages: [
        { role: "system", content: SYSTEM_BLOCKS },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            ...dataUrls.map((url) => ({ type: "image_url", image_url: { url } })),
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const details = await res.text();
    console.error(`AI gateway error [${res.status}]: ${details.slice(0, 500)}`);
    return { blocks: [], sections: [], topics: [], summary: null, status: res.status, error: details.slice(0, 300) };
  }

  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "{}";
  let parsed: any = {};
  try {
    parsed = JSON.parse(raw);
  } catch {
    const m = String(raw).match(/\{[\s\S]*\}/);
    parsed = m ? JSON.parse(m[0]) : {};
  }
  const topics = Array.isArray(parsed?.topics)
    ? parsed.topics.slice(0, 5).map((t: any) => String(t).slice(0, 60)).filter(Boolean)
    : [];
  const summary = parsed?.summary ? String(parsed.summary).slice(0, 300) : null;
  const sections = Array.isArray(parsed?.sections) ? parsed.sections.slice(0, 8) : [];
  const blocks = Array.isArray(parsed?.blocks) && parsed.blocks.length
    ? parsed.blocks
    : sections.flatMap((s: any) => Array.isArray(s?.blocks) ? s.blocks : []);
  return { blocks, sections, topics, summary, status: 200 };
}

/** Перевіряє, що користувач — викладач цього уроку або адмін. */
export async function assertTeacher(admin: any, anon: any, authHeader: string, lessonId: string) {
  const token = authHeader.replace("Bearer ", "");
  const { data: claims, error } = await anon.auth.getClaims(token);
  if (error || !claims?.claims) return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  const userId = String((claims.claims as any).sub);

  const { data: lesson } = await admin
    .from("tutoring_lessons")
    .select("id, teacher_id, student_id, title, level")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return { error: jsonResponse({ error: "Урок не знайдено" }, 404) };

  if (lesson.teacher_id !== userId) {
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (!isAdmin) return { error: jsonResponse({ error: "Доступ лише для викладача уроку" }, 403) };
  }

  return { userId, lesson };
}

export function gatewayErrorResponse(status: number, details?: string) {
  if (status === 402) return jsonResponse({ error: "Закінчились AI-кредити робочого простору. Поповніть баланс." }, 402);
  if (status === 429) return jsonResponse({ error: "Забагато запитів до ШІ. Спробуйте за хвилину." }, 429);
  return jsonResponse({ error: `ШІ не змогла обробити сторінки (код ${status}). ${details ?? ""}` }, 502);
}
