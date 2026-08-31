// AI reads a textbook and creates its Lektionen (chapters), links pages and audio tracks.
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

const SYSTEM = `Ти — методист, який аналізує структуру підручника німецької мови.
На вході — перелік сторінок книги з тим, що на них розпізнано (заголовки теорії та вправ, інструкції), і/або скани перших сторінок.
Твоє завдання: визначити РОЗДІЛИ книги (Lektion / Kapitel / Einheit / Modul) і межі сторінок кожного розділу.

Правила:
- number — номер розділу як у книзі (ціле число).
- title — коротка назва розділу (німецькою, як у книзі; якщо назви немає — тема українською).
- page_from / page_to — номери сторінок у нашій системі (як у переліку), безперервно і без перекриттів.
- Якщо структура не очевидна — розбий книгу на логічні розділи по темах, приблизно рівні за обсягом.
- Не вигадуй розділів більше, ніж є сторінок.

Поверни ЛИШЕ JSON:
{ "lektionen": [ { "number": 1, "title": "...", "page_from": 1, "page_to": 12 } ], "summary": "1-2 речення українською" }`;

function lektionNumberFromText(text: string): number | null {
  const t = text.toLowerCase();
  const m =
    t.match(/lekt?i?on\s*_?-?\s*(\d{1,2})/) ||
    t.match(/kapitel\s*_?-?\s*(\d{1,2})/) ||
    t.match(/\bl\s*_?-?\s*(\d{1,2})\b/) ||
    t.match(/\b(?:ab|kb)\s*_?-?\s*(\d{1,2})\b/);
  return m ? Number(m[1]) : null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await anon.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = String((claims.claims as any).sub);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return json({ error: "Доступ лише для викладачів" }, 403);

    const body = await req.json().catch(() => ({}));
    const bookId = String(body?.book_id ?? "");
    const replace = body?.replace !== false;
    if (!bookId) return json({ error: "book_id is required" }, 400);

    const { data: book } = await admin
      .from("books")
      .select("id, title, kind, level")
      .eq("id", bookId)
      .maybeSingle();
    if (!book) return json({ error: "Книгу не знайдено" }, 404);

    const { data: pages } = await admin
      .from("book_pages")
      .select("id, page_number, image_path")
      .eq("book_id", bookId)
      .order("page_number");
    if (!pages?.length) return json({ error: "У книзі ще немає сторінок" }, 400);

    const { data: tasks } = await admin
      .from("book_tasks")
      .select("page_id, kind, code, title, instructions")
      .eq("book_id", bookId);

    const byPage = new Map<string, string[]>();
    for (const t of tasks ?? []) {
      const line = `${t.kind === "theory" ? "теорія" : "вправа"}${t.code ? ` ${t.code}` : ""}: ${
        (t.title ?? "").toString().slice(0, 90)
      }${t.instructions ? ` — ${String(t.instructions).slice(0, 90)}` : ""}`;
      const arr = byPage.get(t.page_id) ?? [];
      arr.push(line);
      byPage.set(t.page_id, arr);
    }

    const index = pages
      .map((p) => {
        const lines = byPage.get(p.id) ?? [];
        return `Стор. ${p.page_number}: ${lines.length ? lines.join(" | ").slice(0, 400) : "(не розпізнано)"}`;
      })
      .join("\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI не налаштований" }, 500);

    const content: any[] = [
      {
        type: "text",
        text: `Книга: «${book.title}» (${book.kind}${book.level ? `, ${book.level}` : ""}). Сторінок: ${pages.length}.
Перелік сторінок:
${index.slice(0, 20000)}

Визнач розділи (Lektionen) і межі сторінок.`,
      },
    ];

    // If almost nothing is recognised, show the AI a few scans so it can read chapter headers.
    if ((tasks ?? []).length < 3) {
      const sample = pages.filter((_, i) => i % Math.ceil(pages.length / 8) === 0).slice(0, 8);
      for (const p of sample) {
        const { data: file } = await admin.storage.from("book-pages").download(p.image_path);
        if (!file) continue;
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = "";
        for (let i = 0; i < bytes.length; i += 8192) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
        }
        content.push({ type: "text", text: `Скан сторінки ${p.page_number}:` });
        content.push({
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${btoa(binary)}` },
        });
      }
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`AI gateway error [${res.status}]: ${details}`);
      if (res.status === 402) return json({ error: "Закінчились AI-кредити робочого простору." }, 402);
      if (res.status === 429) return json({ error: "Забагато запитів до AI. Спробуйте за хвилину." }, 429);
      return json({ error: "AI не змогла визначити розділи" }, 502);
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

    const minPage = pages[0].page_number;
    const maxPage = pages[pages.length - 1].page_number;

    const proposals = (Array.isArray(parsed?.lektionen) ? parsed.lektionen : [])
      .map((l: any) => ({
        number: Number(l?.number),
        title: l?.title ? String(l.title).slice(0, 200) : null,
        page_from: Number(l?.page_from),
        page_to: Number(l?.page_to),
      }))
      .filter(
        (l: any) =>
          Number.isFinite(l.number) &&
          Number.isFinite(l.page_from) &&
          Number.isFinite(l.page_to) &&
          l.page_to >= l.page_from,
      )
      .map((l: any) => ({
        ...l,
        page_from: Math.max(minPage, l.page_from),
        page_to: Math.min(maxPage, l.page_to),
      }))
      .slice(0, 40)
      .sort((a: any, b: any) => a.number - b.number);

    if (!proposals.length) return json({ error: "AI не повернула розділи, спробуйте ще раз" }, 502);

    if (replace) {
      await admin.from("book_pages").update({ lektion_id: null }).eq("book_id", bookId);
      await admin.from("book_lektionen").delete().eq("book_id", bookId);
    }

    const { data: created, error: insErr } = await admin
      .from("book_lektionen")
      .upsert(
        proposals.map((l: any) => ({ book_id: bookId, ...l })),
        { onConflict: "book_id,number" },
      )
      .select("id, number, title, page_from, page_to");
    if (insErr) {
      console.error("insert lektionen failed", insErr);
      return json({ error: insErr.message }, 500);
    }

    // link pages
    for (const l of created ?? []) {
      if (l.page_from == null || l.page_to == null) continue;
      await admin
        .from("book_pages")
        .update({ lektion_id: l.id })
        .eq("book_id", bookId)
        .gte("page_number", l.page_from)
        .lte("page_number", l.page_to);
    }

    // link audio: by file name / title hint, else spread evenly by track order
    const { data: audio } = await admin
      .from("book_audio")
      .select("id, title, file_path, track_no, lektion_id")
      .eq("book_id", bookId)
      .order("track_no", { nullsFirst: false });

    const ordered = [...(created ?? [])].sort((a, b) => a.number - b.number);
    let audioLinked = 0;
    if (audio?.length && ordered.length) {
      const list = audio;
      for (let i = 0; i < list.length; i++) {
        const t = list[i];
        const hint = `${t.title ?? ""} ${t.file_path ?? ""}`;
        const num = lektionNumberFromText(hint);
        let target = num != null ? ordered.find((l) => l.number === num) : undefined;
        if (!target) {
          const idx = Math.min(
            ordered.length - 1,
            Math.floor((i / list.length) * ordered.length),
          );
          target = ordered[idx];
        }
        if (target && target.id !== t.lektion_id) {
          await admin.from("book_audio").update({ lektion_id: target.id }).eq("id", t.id);
        }
        audioLinked++;
      }
    }

    return json({
      ok: true,
      summary: parsed?.summary ? String(parsed.summary).slice(0, 500) : null,
      lektionen: ordered,
      audio_linked: audioLinked,
    });
  } catch (e) {
    console.error("detect-book-lektionen error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
