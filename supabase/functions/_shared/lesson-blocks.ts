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

{ "blocks": [ { "type": "...", "title": "...", "payload": { ... } } ] }

Дозволені типи і форма payload:

1) "hoer" — якщо біля завдання є значок аудіо / номер треку.
payload: { "instructions": "укр", "transcript": [ { "t": 0, "de": "речення", "uk": "переклад" } ] }
Транскрипт відтвори з книги; якщо тексту запису немає — склади правдоподібний діалог на 5–8 реплік за темою сторінки. t — приблизна секунда (крок 4–6 с).

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

Правила: інструкції та підказки — українською, увесь навчальний матеріал — німецькою. Не вигадуй вправ, яких немає на сторінці (виняток — транскрипт аудіо). Мінімум 3 блоки, максимум 10. Без пояснень поза JSON.`;

export interface RawBlock {
  type?: string;
  title?: string;
  payload?: Record<string, unknown>;
}

const ALLOWED = ["hoer", "lesen", "luecke", "paare", "satzbau", "schreiben"];
const str = (v: unknown, max: number) => (v === null || v === undefined ? null : String(v).slice(0, max));

/** Валідує блок і повертає нормалізований payload або null. */
export function normalizeBlock(raw: RawBlock): { type: string; title: string | null; payload: any } | null {
  const type = String(raw?.type ?? "");
  if (!ALLOWED.includes(type)) return null;
  const p: any = raw?.payload ?? {};
  const payload: any = { instructions: str(p.instructions, 800) };

  switch (type) {
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
        if (!it.options.includes(it.answer)) it.options = [it.answer, ...it.options].slice(0, 4);
      });
      payload.mode = p.mode === "input" ? "input" : "select";
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
  for (const path of paths.slice(0, 8)) {
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
): Promise<{ blocks: RawBlock[]; status: number; error?: string }> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.7-flash",
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
    return { blocks: [], status: res.status, error: details.slice(0, 300) };
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
  return { blocks: Array.isArray(parsed?.blocks) ? parsed.blocks : [], status: 200 };
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
