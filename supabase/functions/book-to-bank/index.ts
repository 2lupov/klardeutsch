// "AI-librarian": reads everything recognised in a textbook (theory + exercises),
// decides which folders the materials bank needs, imports the book content there
// and generates similar extra exercises. Admin / teacher only.
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

const CATEGORIES = ["grammar", "reading", "listening", "tasks", "vocab", "theory"];
const isTheory = (t: any) => t?.kind === "theory" || t?.content?.format === "theory";

/** Render a recognised theory block as plain markdown-ish text for the bank. */
function theoryBody(t: any): string {
  const c = t.content || {};
  const out: string[] = [];
  if (c.summary) out.push(String(c.summary));
  for (const r of (c.rules || [])) if (r) out.push(`• ${r}`);
  const tb = c.table;
  if (tb?.rows?.length) {
    if (tb.headers?.length) out.push(tb.headers.filter(Boolean).join(" | "));
    for (const row of tb.rows) out.push((row || []).map((x: any) => x ?? "").join(" | "));
  }
  for (const e of (c.examples || [])) if (e?.de) out.push(`${e.de}${e.uk ? ` — ${e.uk}` : ""}`);
  for (const p of (c.phrases || [])) if (p?.de) out.push(`${p.de}${p.uk ? ` — ${p.uk}` : ""}`);
  if (c.note) out.push(String(c.note));
  if (!out.length && t.instructions) out.push(String(t.instructions));
  return out.join("\n");
}

function taskDigest(t: any, pageNo: number | null): string {
  const c = t.content || {};
  const bits = [
    `#${t._idx}`,
    pageNo ? `с.${pageNo}` : null,
    t.code ? `${t.code}` : null,
    isTheory(t) ? "ТЕОРІЯ" : `вправа/${c.format || t.kind || "?"}`,
    t.title || null,
  ].filter(Boolean).join(" · ");
  const detail = isTheory(t)
    ? theoryBody(t).slice(0, 320)
    : [String(t.instructions || "").slice(0, 160),
       (c.items || []).slice(0, 2).map((i: any) => i?.prompt).filter(Boolean).join(" / ").slice(0, 200),
       (c.items || []).length ? `(питань: ${c.items.length})` : null].filter(Boolean).join(" | ");
  return `${bits}\n   ${detail}`;
}

async function callAI(apiKey: string, system: string, user: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.7-flash",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error("AI error", res.status, txt);
    if (res.status === 429) throw new Error("Перевищено ліміт AI-запитів, спробуйте за хвилину");
    if (res.status === 402) throw new Error("Закінчились AI-кредити");
    if (res.status === 403) throw new Error("AI недоступний для цього воркспейсу");
    throw new Error("Помилка AI-шлюзу");
  }
  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(raw); } catch {
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

    const body = await req.json().catch(() => ({}));
    const bookId: string = String(body.book_id || "");
    const lektionId: string | null = body.lektion_id ? String(body.lektion_id) : null;
    const variants = Math.max(0, Math.min(10, Number(body.variants ?? 4)));
    if (!bookId) return json({ error: "book_id required" }, 400);

    const { data: book } = await supabase
      .from("books").select("id, title, kind, level, language").eq("id", bookId).maybeSingle();
    if (!book) return json({ error: "book not found" }, 404);

    const [{ data: pages }, { data: lektionen }, { data: allTasks }] = await Promise.all([
      supabase.from("book_pages").select("id, page_number, lektion_id").eq("book_id", bookId).order("page_number"),
      supabase.from("book_lektionen").select("id, number, title").eq("book_id", bookId).order("number"),
      supabase.from("book_tasks").select("*").eq("book_id", bookId).order("sort_order"),
    ]);

    const pageById = new Map((pages || []).map((p: any) => [p.id, p]));
    const lektion = (lektionen || []).find((l: any) => l.id === lektionId) || null;

    let tasks = (allTasks || []).filter((t: any) => pageById.has(t.page_id));
    if (lektionId) tasks = tasks.filter((t: any) => pageById.get(t.page_id)?.lektion_id === lektionId);
    if (!tasks.length) {
      return json({ error: "У книзі ще немає розпізнаного матеріалу. Спершу натисніть «Розпізнати вправи» на сторінках." }, 400);
    }
    tasks = tasks.slice(0, 220);
    tasks.forEach((t: any, i: number) => { t._idx = i; });

    const level = book.level || "A1";
    const scope = lektion ? `Lektion ${lektion.number}${lektion.title ? ` «${lektion.title}»` : ""}` : "уся книга";

    /* ── 1. AI studies the book and plans the folder structure ── */
    const catalog = tasks.map((t: any) => taskDigest(t, pageById.get(t.page_id)?.page_number ?? null)).join("\n");

    const planSystem = `Ти — головний методист мовної школи, який відповідає за банк матеріалів.
Тобі дають ПОВНИЙ перелік того, що розпізнано в підручнику: теорія (правила, таблиці, Redemittel) і вправи.
Твоє завдання — вивчити, ЩО саме є в книзі, і спроєктувати папки банку матеріалів, а потім розкласти по них матеріал книги.

Категорії папок (лише ці): grammar, reading, listening, tasks, vocab, theory.

ВІДПОВІДАЙ СУВОРО валідним JSON без markdown:
{
  "summary": "3-5 речень українською: які теми, граматика, лексика і типи вправ є в цьому матеріалі",
  "folders": [
    {
      "name": "Коротка зрозуміла назва папки українською (з рівнем і темою)",
      "category": "grammar|reading|listening|tasks|vocab|theory",
      "description": "1-2 речення, що всередині",
      "tags": ["тема", "граматика"],
      "task_indexes": [0, 3, 7]
    }
  ]
}

Правила:
- 3-7 папок, кожна з логічною темою (не «Різне»). Теорію і вправи розкладай у відповідні за змістом папки.
- КОЖЕН індекс із переліку має потрапити щонайменше в одну папку. Індекси беруться з "#N".
- Не вигадуй індексів, яких немає.`;

    const planUser = `Підручник: «${book.title}» (${book.kind}), рівень ${level}. Обсяг: ${scope}.
Розпізнаний матеріал:
${catalog.slice(0, 26000)}

Спроєктуй папки і розклади матеріал. Тільки JSON.`;

    const plan = await callAI(Deno.env.get("LOVABLE_API_KEY")!, planSystem, planUser);
    const planned: any[] = Array.isArray(plan.folders) ? plan.folders.slice(0, 8) : [];
    if (!planned.length) return json({ error: "AI не змогла спроєктувати папки, спробуйте ще раз" }, 502);

    /* ── 2. create / reuse folders ── */
    const { data: existingFolders } = await supabase
      .from("material_folders").select("id, name, category, level");

    const result: any[] = [];
    const base = Date.now();

    for (const [fi, pf] of planned.entries()) {
      const name = String(pf.name || "").trim().slice(0, 120);
      if (!name) continue;
      const category = CATEGORIES.includes(pf.category) ? pf.category : "tasks";
      const tags = Array.isArray(pf.tags) ? pf.tags.map((x: any) => String(x)).slice(0, 6) : [];

      let folder = (existingFolders || []).find(
        (f: any) => f.name.toLowerCase() === name.toLowerCase() && f.level === level,
      );
      if (!folder) {
        const { data: created, error: fErr } = await supabase
          .from("material_folders")
          .insert({
            owner_id: user.id,
            name,
            category,
            level,
            description: String(pf.description || "").slice(0, 400) || null,
            tags: [...tags, book.title].slice(0, 8),
          })
          .select("id, name, category, level")
          .single();
        if (fErr) { console.error("folder insert", fErr); continue; }
        folder = created;
      }

      /* ── 3. import book material into the folder ── */
      const idxs: number[] = Array.isArray(pf.task_indexes)
        ? pf.task_indexes.map((n: any) => Number(n)).filter((n: number) => tasks[n])
        : [];
      const picked = idxs.map((n) => tasks[n]);

      const rows: any[] = [];
      let order = (base % 1000000) + fi * 1000;

      for (const t of picked) {
        const pageNo = pageById.get(t.page_id)?.page_number ?? null;
        const srcTags = [book.title, pageNo ? `с. ${pageNo}` : null, t.code || null]
          .filter(Boolean).map(String).slice(0, 4);

        if (isTheory(t)) {
          const bodyText = theoryBody(t);
          if (!bodyText) continue;
          rows.push({
            folder_id: folder.id, owner_id: user.id, kind: "text",
            title: (t.title || "Теорія з підручника").slice(0, 160),
            content: { body: bodyText },
            level, tags: srcTags, source: "book", sort_order: order++,
          });
          continue;
        }

        const items = Array.isArray(t.content?.items) ? t.content.items.slice(0, 12) : [];
        if (!items.length) {
          const bodyText = [t.title, t.instructions].filter(Boolean).join("\n");
          if (bodyText) {
            rows.push({
              folder_id: folder.id, owner_id: user.id, kind: "text",
              title: (t.title || t.code || "Завдання з підручника").slice(0, 160),
              content: { body: bodyText },
              level, tags: srcTags, source: "book", sort_order: order++,
            });
          }
          continue;
        }

        for (const it of items) {
          const q = String(it?.prompt || "").trim();
          if (!q) continue;
          const options = Array.isArray(it?.options) ? it.options.map((o: any) => String(o)) : [];
          const correct = typeof it?.correct_index === "number" && options[it.correct_index]
            ? options[it.correct_index]
            : String(it?.answer ?? "");
          rows.push({
            folder_id: folder.id, owner_id: user.id, kind: "question",
            title: [t.code, t.title].filter(Boolean).join(" · ").slice(0, 160) || null,
            content: { question: q, options, correct, explanation: t.instructions || "" },
            level, tags: srcTags, source: "book", sort_order: order++,
          });
        }
      }

      let imported = 0;
      for (let i = 0; i < rows.length; i += 100) {
        const { data: ins, error } = await supabase
          .from("material_items").insert(rows.slice(i, i + 100)).select("id");
        if (error) console.error("items insert", error);
        imported += ins?.length || 0;
      }

      /* ── 4. AI generates similar extra exercises for this folder ── */
      let generated = 0;
      if (variants > 0) {
        try {
          const sample = picked.slice(0, 14)
            .map((t: any) => taskDigest(t, pageById.get(t.page_id)?.page_number ?? null))
            .join("\n").slice(0, 9000);

          const genSystem = `Ти — досвідчений викладач німецької. Ти бачиш матеріал із підручника і робиш ДОДАТКОВІ вправи такого ж типу й складності.
Типи елементів:
- "text" — теорія / текст. content: { "body": "..." }
- "question" — питання. content: { "question": "...", "options": ["4 варіанти або []"], "correct": "правильна відповідь", "explanation": "коротке пояснення українською" }
- "word" — слово. content: { "term": "нім. слово з артиклем", "article": "der|die|das|", "translation": "укр. переклад", "example": "нім. приклад" }

ВІДПОВІДАЙ СУВОРО валідним JSON: { "items": [ { "kind": "...", "title": "...", "content": { ... } } ] }`;

          const genUser = `Папка: «${name}» (категорія ${category}), рівень ${level}, підручник «${book.title}».
Матеріал книги як зразок:
${sample}

Створи РІВНО ${variants} НОВИХ схожих елементів (та сама тема й лексика, інші приклади). Тільки JSON.`;

          const gen = await callAI(Deno.env.get("LOVABLE_API_KEY")!, genSystem, genUser);
          const list: any[] = (Array.isArray(gen.items) ? gen.items : [])
            .filter((i: any) => i && ["text", "question", "word"].includes(i.kind) && i.content && typeof i.content === "object")
            .slice(0, variants);

          if (list.length) {
            const { data: ins, error } = await supabase.from("material_items").insert(
              list.map((i: any, k: number) => ({
                folder_id: folder!.id, owner_id: user.id, kind: i.kind,
                title: (i.title || null) as string | null,
                content: i.content, level,
                tags: [book.title, "AI"], source: "ai", sort_order: order + k,
              })),
            ).select("id");
            if (error) console.error("gen insert", error);
            generated = ins?.length || 0;
          }
        } catch (e) {
          console.error("generate variants failed", e);
        }
      }

      result.push({ folder_id: folder.id, name, category, imported, generated });
    }

    return json({
      summary: String(plan.summary || ""),
      folders: result,
      imported: result.reduce((s, r) => s + r.imported, 0),
      generated: result.reduce((s, r) => s + r.generated, 0),
    });
  } catch (e: any) {
    console.error("book-to-bank error", e);
    return json({ error: e?.message || "unknown error" }, 500);
  }
});
