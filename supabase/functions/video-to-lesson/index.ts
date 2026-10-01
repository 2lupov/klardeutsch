import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createResponsesCall } from "../_shared/ai-responses.ts";
import { normalizeBlock } from "../_shared/lesson-blocks.ts";

const headers = { ...corsHeaders, "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
const YOUTUBE_ID = /^[A-Za-z0-9_-]{6,20}$/;
const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1"]);
const MODES = new Set(["lesson", "exercises", "summary"]);

function videoId(value: unknown) {
  const raw = String(value ?? "").trim();
  try {
    const url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    let id: string | null = host === "youtu.be" ? url.pathname.split("/").filter(Boolean)[0] ?? null : null;
    if (["youtube.com", "m.youtube.com"].includes(host)) {
      id = url.searchParams.get("v");
      if (!id) { const parts = url.pathname.split("/").filter(Boolean); if (["embed", "shorts", "live"].includes(parts[0] ?? "")) id = parts[1] ?? null; }
    }
    return id && YOUTUBE_ID.test(id) ? id : null;
  } catch { return null; }
}

async function fetchTranscript(id: string) {
  const watch = await fetch(`https://www.youtube.com/watch?v=${id}&hl=de`, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!watch.ok) return null;
  const html = await watch.text();
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match?.[1]) return null;
  let tracks: Array<{ baseUrl?: string; languageCode?: string; kind?: string }> = [];
  try { tracks = JSON.parse(match[1].replace(/\\u0026/g, "&")); } catch { return null; }
  const track = tracks.find((item) => item.languageCode === "de" && item.kind !== "asr")
    ?? tracks.find((item) => item.languageCode === "de")
    ?? tracks.find((item) => item.kind !== "asr")
    ?? tracks[0];
  if (!track?.baseUrl) return null;
  const response = await fetch(`${track.baseUrl}&fmt=json3`);
  if (!response.ok) return null;
  const payload = await response.json().catch(() => null);
  const lines = Array.isArray(payload?.events)
    ? payload.events.map((event: any) => Array.isArray(event?.segs) ? event.segs.map((seg: any) => String(seg?.utf8 ?? "")).join("") : "").filter(Boolean)
    : [];
  const text = lines.join(" ").replace(/\s+/g, " ").trim();
  return text.length >= 80 ? text : null;
}

async function authorize(req: Request, classId: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: json({ error: "Потрібна авторизація" }, 401) };
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !anonKey) return { error: json({ error: "Сервер не налаштований" }, 500) };
  const admin = createClient(url, serviceKey);
  const anon = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: claims, error } = await anon.auth.getClaims(authHeader.slice(7));
  if (error || !claims?.claims?.sub) return { error: json({ error: "Сесію завершено" }, 401) };
  const userId = String(claims.claims.sub);
  const { data: liveClass } = await admin.from("live_classes").select("id, teacher_id, title").eq("id", classId).maybeSingle();
  if (!liveClass) return { error: json({ error: "Живий урок не знайдено" }, 404) };
  if (liveClass.teacher_id !== userId) {
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) return { error: json({ error: "Лише викладач цього уроку може створювати матеріали" }, 403) };
  }
  return { userId, liveClass };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const classId = String(body?.class_id ?? "");
    if (!classId) return json({ error: "class_id is required" }, 400);
    const guard = await authorize(req, classId);
    if (guard.error) return guard.error;
    const id = videoId(body?.video_url);
    if (!id) return json({ error: "Перевірте посилання YouTube" }, 400);

    if (body?.action === "transcript") {
      const transcript = await fetchTranscript(id);
      return json({ transcript, source: transcript ? "youtube" : "manual" });
    }

    const level = String(body?.level ?? "A2").toUpperCase();
    if (!LEVELS.has(level)) return json({ error: "Невідомий рівень" }, 400);
    const modes = Array.isArray(body?.modes) ? body.modes.map(String).filter((mode: string) => MODES.has(mode)) : [];
    if (!modes.length) return json({ error: "Виберіть хоча б один тип матеріалу" }, 400);
    let transcript = String(body?.transcript ?? "").replace(/\s+/g, " ").trim();
    if (transcript.length < 80) transcript = await fetchTranscript(id) ?? "";
    if (transcript.length < 80) return json({ error: "Не вдалося отримати субтитри. Вставте транскрипт вручну." }, 422);
    transcript = transcript.slice(0, 60000);
    const wishes = String(body?.instructions ?? "").trim().slice(0, 1200);
    const requested = [
      modes.includes("summary") ? "конспект, ключові тези та тематичний словник у блоках topic/theorie/lesen" : "",
      modes.includes("exercises") ? "вправи luecke, paare, satzbau та schreiben на розуміння змісту, лексику й доречну граматику" : "",
      modes.includes("lesson") ? "повний послідовний урок: вступ, зміст, словник, пояснення і різноманітна практика" : "",
    ].filter(Boolean).join("; ");
    const system = `Ти методист німецької мови DaF. Створи урок ВИКЛЮЧНО за наданим транскриптом YouTube-відео. Не вигадуй фактів, цитат або подій поза транскриптом. Інструкції й пояснення українською, навчальний матеріал німецькою. Рівень ${level}. Потрібно: ${requested}. Поверни лише JSON-об'єкт: {"title":"...","summary":"...","topics":["..."],"sections":[{"title":"...","summary":"...","layout":"reading|grammar|practice","blocks":[{"type":"topic|theorie|lesen|luecke|paare|satzbau|schreiben|artikel|transformation|callout|table","title":"...","payload":{}}]}]}. Для lesen: payload text і words [{de,uk,artikel,plural}]. Для luecke: instructions, mode, items [{sentence з рівно одним ___,answer,options з 4 варіантів,synonyms,hint}]. Для paare: pairs [{left,right}]. Для satzbau: sentences [{words у правильному порядку,hint}]. Для schreiben: prompt,redemittel,min_words,allow_voice. Для theorie: markdown,examples [{de,uk}]. Зроби 6–10 якісних блоків без повторів.`;
    const user = `${wishes ? `Побажання викладача: ${wishes}\n\n` : ""}Транскрипт:\n${transcript}`;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "Lovable AI не налаштовано" }, 500);
    const result = createResponsesCall(req, apiKey, [{ role: "system", content: system }, { role: "user", content: user }]);
    const text = await result.text;
    let parsed: any;
    try { parsed = JSON.parse(text); } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return json({ error: "ШІ не повернув структуру уроку" }, 422);
      parsed = JSON.parse(match[0]);
    }
    const sections = (Array.isArray(parsed?.sections) ? parsed.sections : []).slice(0, 8).map((section: any, index: number) => ({
      id: crypto.randomUUID(),
      title: String(section?.title ?? `Тема ${index + 1}`).slice(0, 120),
      summary: String(section?.summary ?? "").slice(0, 300),
      emoji: "🎬",
      layout: ["reading", "grammar", "practice"].includes(String(section?.layout)) ? section.layout : "practice",
      blocks: (Array.isArray(section?.blocks) ? section.blocks : []).map(normalizeBlock).filter(Boolean),
    })).filter((section: any) => section.blocks.length);
    const blocks = sections.flatMap((section: any) => section.blocks).slice(0, 12);
    if (!blocks.length) return json({ error: "ШІ не створив придатних завдань" }, 422);
    return json({
      draft: {
        title: String(parsed?.title ?? `Урок за відео · ${guard.liveClass.title}`).slice(0, 160),
        level,
        source: "youtube",
        focus: "kursbuch",
        notes: String(body.video_url).slice(0, 500),
        page_paths: [],
        blocks,
        sections,
        topics: Array.isArray(parsed?.topics) ? parsed.topics.slice(0, 5).map((topic: unknown) => String(topic).slice(0, 60)) : [],
        summary: String(parsed?.summary ?? "").slice(0, 300),
        kind: "lesson",
      },
      transcript_source: String(body?.transcript ?? "").trim() ? "manual" : "youtube",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return json({ error: "Генерацію зупинено" }, 499);
    const status = Number((error as any)?.statusCode ?? (error as any)?.status ?? 500);
    const message = error instanceof Error ? error.message : "Не вдалося створити урок";
    console.error("video-to-lesson failed", status, message);
    return json({ error: message }, status >= 400 && status < 600 ? status : 500);
  }
});
