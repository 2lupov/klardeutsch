// Builds a complete lesson plan out of a textbook Lektion:
// theory -> exercises -> audio (Hören) -> classroom tasks -> homework.
// Admin / teacher only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const isTheory = (t: any) => t?.kind === "theory" || t?.content?.format === "theory";

function theoryBody(t: any): string {
  const c = t.content || {};
  const out: string[] = [];
  if (c.summary) out.push(String(c.summary));
  for (const r of c.rules || []) if (r) out.push(`• ${r}`);
  const tb = c.table;
  if (tb?.rows?.length) {
    if (tb.headers?.length) out.push(tb.headers.filter(Boolean).join(" | "));
    for (const row of tb.rows) out.push((row || []).map((x: any) => x ?? "").join(" | "));
  }
  for (const e of c.examples || []) if (e?.de) out.push(`${e.de}${e.uk ? ` — ${e.uk}` : ""}`);
  for (const p of c.phrases || []) if (p?.de) out.push(`${p.de}${p.uk ? ` — ${p.uk}` : ""}`);
  if (!out.length && t.instructions) out.push(String(t.instructions));
  return out.join("\n");
}

function digest(t: any, pageNo: number | null): string {
  const c = t.content || {};
  const head = [
    `id:${t.id}`,
    pageNo ? `с.${pageNo}` : null,
    t.code ? `№${t.code}` : null,
    isTheory(t) ? "ТЕОРІЯ" : `вправа/${c.format || t.kind || "?"}`,
    t.title || null,
  ].filter(Boolean).join(" · ");
  const detail = isTheory(t)
    ? theoryBody(t).slice(0, 300)
    : [
        String(t.instructions || "").slice(0, 160),
        (c.items || []).slice(0, 2).map((i: any) => i?.prompt).filter(Boolean).join(" / ").slice(0, 180),
        (c.items || []).length ? `(питань: ${c.items.length})` : null,
      ].filter(Boolean).join(" | ");
  return `${head}\n   ${detail}`;
}

async function callAI(apiKey: string, system: string, user: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
        reasoning_effort: "low",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("AI error", res.status, txt.slice(0, 400));
    if (res.status === 429) throw new Error("Перевищено ліміт AI-запитів, спробуйте за хвилину");
    if (res.status === 402) throw new Error("Закінчились AI-кредити");
    if (res.status === 403) throw new Error("AI недоступний для цього воркспейсу");
    throw new Error(`Помилка AI-шлюзу (${res.status})`);
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}/);
    return m ? JSON.parse(m[0]) : {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return json({ error: "forbidden" }, 403);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI ключ не налаштований" }, 500);

    const body = await req.json().catch(() => ({}));
    const bookId = String(body.book_id || "");
    const lektionId: string | null = body.lektion_id ? String(body.lektion_id) : null;
    const minutes = Math.max(30, Math.min(180, Number(body.minutes ?? 60)));
    const notes = String(body.notes || "").slice(0, 800);
    if (!bookId) return json({ error: "book_id required" }, 400);

    const { data: book } = await supabase
      .from("books").select("id, title, kind, level, language").eq("id", bookId).maybeSingle();
    if (!book) return json({ error: "Підручник не знайдено" }, 404);

    const [{ data: pages }, { data: lektionen }, { data: allTasks }, { data: audio }] = await Promise.all([
      supabase.from("book_pages").select("id, page_number, lektion_id").eq("book_id", bookId).order("page_number"),
      supabase.from("book_lektionen").select("id, number, title, page_from, page_to").eq("book_id", bookId).order("number"),
      supabase.from("book_tasks").select("*").eq("book_id", bookId).order("sort_order"),
      supabase.from("book_audio").select("id, title, track_no, lektion_id").eq("book_id", bookId).order("track_no"),
    ]);

    const lektion = (lektionen || []).find((l: any) => l.id === lektionId) || null;
    const pageById = new Map((pages || []).map((p: any) => [p.id, p]));

    let scopedPages = pages || [];
    if (lektion) {
      scopedPages = (pages || []).filter(
        (p: any) =>
          p.lektion_id === lektion.id ||
          (lektion.page_from != null && lektion.page_to != null &&
            p.page_number >= lektion.page_from && p.page_number <= lektion.page_to),
      );
    }
    const scopedIds = new Set(scopedPages.map((p: any) => p.id));
    const tasks = (allTasks || []).filter((t: any) => scopedIds.has(t.page_id));
    if (tasks.length === 0) {
      return json({ error: "У цьому розділі ще нічого не розпізнано — спершу натисніть «Розпізнати вправи та теорію»" }, 400);
    }
    const tracks = (audio || []).filter((a: any) => (lektion ? a.lektion_id === lektion.id : true));

    const theoryList = tasks.filter(isTheory);
    const exerciseList = tasks.filter((t: any) => !isTheory(t));

    const catalogue = [
      "ТЕОРІЯ:",
      ...theoryList.map((t: any) => digest(t, pageById.get(t.page_id)?.page_number ?? null)),
      "",
      "ВПРАВИ:",
      ...exerciseList.map((t: any) => digest(t, pageById.get(t.page_id)?.page_number ?? null)),
      "",
      "АУДІО (Hören):",
      ...tracks.map((a: any) => `id:${a.id} · трек ${a.track_no ?? "—"} · ${a.title}`),
    ].join("\n");

    const system = `Ти — досвідчений методист німецької мови в українській школі KLAR.
Ти складаєш повний план уроку (${minutes} хв) з матеріалів підручника.
Пиши УКРАЇНСЬКОЮ (німецькі приклади залишай німецькою).
Використовуй ЛИШЕ ті id, які є в каталозі.
Відповідай лише JSON такої структури:
{
  "title": "назва уроку",
  "level": "A1",
  "summary": "1-2 речення про урок для учня",
  "goals": ["мета 1", "мета 2"],
  "vocabulary": [{"de":"das Haus","uk":"дім"}],
  "stages": [
    {
      "type": "warmup|theory|exercise|audio|speaking|writing|review",
      "title": "назва етапу",
      "minutes": 10,
      "student_text": "що робить учень, інструкція простою мовою",
      "teacher_note": "підказка для викладача",
      "task_ids": ["id вправи або теорії"],
      "audio_ids": ["id треку"]
    }
  ],
  "homework": {
    "instructions": "що зробити вдома",
    "task_ids": ["..."],
    "audio_ids": ["..."]
  }
}
Правила: 5-8 етапів, обов'язково є етап теорії (якщо теорія є), етап аудіо (якщо є треки), етап говоріння та етап повторення. Сума minutes ≈ ${minutes}. Домашка бере 2-4 вправи, які НЕ розібрані на уроці, якщо це можливо.`;

    const userMsg = `Підручник: ${book.title} (${book.kind}${book.level ? `, ${book.level}` : ""}).
Розділ: ${lektion ? `Lektion ${lektion.number}${lektion.title ? ` — ${lektion.title}` : ""}` : "уся книга"}.
Сторінки: ${scopedPages.map((p: any) => p.page_number).join(", ") || "—"}.
${notes ? `Побажання викладача: ${notes}` : ""}

КАТАЛОГ МАТЕРІАЛІВ:
${catalogue}`;

    const ai = await callAI(apiKey, system, userMsg);

    const validIds = new Set(tasks.map((t: any) => t.id));
    const validAudio = new Set(tracks.map((a: any) => a.id));
    const clean = (arr: any, set: Set<string>) =>
      Array.isArray(arr) ? arr.map(String).filter((x) => set.has(x)) : [];

    const stages = (Array.isArray(ai.stages) ? ai.stages : []).map((s: any, i: number) => ({
      type: String(s?.type || "exercise"),
      title: String(s?.title || `Етап ${i + 1}`),
      minutes: Number(s?.minutes) || Math.round(minutes / Math.max(1, ai.stages?.length || 6)),
      student_text: s?.student_text ? String(s.student_text) : null,
      teacher_note: s?.teacher_note ? String(s.teacher_note) : null,
      task_ids: clean(s?.task_ids, validIds),
      audio_ids: clean(s?.audio_ids, validAudio),
    })).filter((s: any) => s.title);

    if (stages.length === 0) return json({ error: "AI не змогла скласти план, спробуйте ще раз" }, 502);

    const plan = {
      title: String(ai.title || `${book.title}${lektion ? ` — Lektion ${lektion.number}` : ""}`),
      level: ai.level ? String(ai.level) : book.level,
      summary: ai.summary ? String(ai.summary) : null,
      goals: Array.isArray(ai.goals) ? ai.goals.map(String).slice(0, 8) : [],
      vocabulary: Array.isArray(ai.vocabulary)
        ? ai.vocabulary.slice(0, 40).map((v: any) => ({ de: String(v?.de || ""), uk: String(v?.uk || "") })).filter((v: any) => v.de)
        : [],
      minutes,
      stages,
      homework: {
        instructions: ai.homework?.instructions ? String(ai.homework.instructions) : null,
        task_ids: clean(ai.homework?.task_ids, validIds),
        audio_ids: clean(ai.homework?.audio_ids, validAudio),
      },
      book: { id: book.id, title: book.title, kind: book.kind, level: book.level },
      lektion: lektion ? { id: lektion.id, number: lektion.number, title: lektion.title } : null,
    };

    return json({ ok: true, plan });
  } catch (e) {
    console.error("generate-book-lesson-plan failed", e);
    return json({ error: e instanceof Error ? e.message : "Невідома помилка" }, 500);
  }
});
