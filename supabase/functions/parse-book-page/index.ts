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

const SYSTEM = `Ти — асистент викладача німецької мови. На зображенні — сторінка підручника (Kursbuch) або робочого зошита (Arbeitsbuch).
Твоє завдання: розпізнати ОКРЕМІ вправи на сторінці й повернути їх структуровано.

Правила:
- code: номер вправи як у книзі ("1", "2b", "3a"). Якщо номера немає — null.
- kind: одне з "reading" | "listening" | "grammar" | "writing" | "speaking" | "vocab".
- title: коротка назва українською (до 60 символів).
- instructions: інструкція до вправи українською (переклади німецьку інструкцію).
- content.format: "choice" (варіанти), "gap" (вписати слово), "open" (розгорнута відповідь), "audio" (усно/аудіо).
- content.items: для choice → { prompt, options: [...], correct_index }. Для gap → { prompt, answer }.
  Для open/audio → { prompt } без відповіді. Якщо правильної відповіді не видно — став null.
- Не вигадуй вправ, яких немає на сторінці. Не додавай пояснень поза JSON.

Поверни ЛИШЕ JSON: { "tasks": [ { "code", "kind", "title", "instructions", "content": { "format", "items": [...] } } ] }`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anon.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = String((claims.claims as any).sub);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return json({ error: "Доступ лише для викладачів" }, 403);

    const body = await req.json().catch(() => ({}));
    const pageId = String(body?.page_id ?? "");
    if (!pageId) return json({ error: "page_id is required" }, 400);

    const { data: page, error: pErr } = await admin
      .from("book_pages")
      .select("id, book_id, page_number, image_path")
      .eq("id", pageId)
      .maybeSingle();
    if (pErr || !page) return json({ error: "Сторінку не знайдено" }, 404);

    const { data: file, error: dlErr } = await admin.storage
      .from("book-pages")
      .download(page.image_path);
    if (dlErr || !file) return json({ error: "Не вдалося прочитати сканування сторінки" }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length === 0) return json({ error: "Порожній файл сторінки" }, 400);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    const base64 = btoa(binary);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI не налаштований" }, 500);

    await admin.from("book_pages").update({ ocr_status: "processing" }).eq("id", pageId);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": LOVABLE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: `Сторінка ${page.page_number}. Розпізнай вправи.` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`AI gateway error [${res.status}]: ${details}`);
      await admin.from("book_pages").update({ ocr_status: "failed" }).eq("id", pageId);
      if (res.status === 402) {
        return json({ error: "Закінчились AI-кредити робочого простору. Поповніть баланс." }, 402);
      }
      if (res.status === 429) {
        return json({ error: "Забагато запитів до AI. Спробуйте за хвилину." }, 429);
      }
      return json({ error: "AI не змогла обробити сторінку" }, 502);
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

    const tasks = Array.isArray(parsed?.tasks) ? parsed.tasks : [];
    if (tasks.length === 0) {
      await admin.from("book_pages").update({ ocr_status: "empty" }).eq("id", pageId);
      return json({ ok: true, tasks: 0 });
    }

    await admin.from("book_tasks").delete().eq("page_id", pageId).eq("source", "ai");

    const rows = tasks.slice(0, 30).map((t: any, i: number) => ({
      book_id: page.book_id,
      page_id: pageId,
      code: t?.code ? String(t.code).slice(0, 20) : null,
      kind: t?.kind ? String(t.kind).slice(0, 30) : null,
      title: t?.title ? String(t.title).slice(0, 200) : null,
      instructions: t?.instructions ? String(t.instructions).slice(0, 2000) : null,
      content: t?.content ?? null,
      source: "ai",
      sort_order: i,
    }));

    const { error: insErr } = await admin.from("book_tasks").insert(rows);
    if (insErr) {
      console.error("insert book_tasks failed:", insErr);
      await admin.from("book_pages").update({ ocr_status: "failed" }).eq("id", pageId);
      return json({ error: insErr.message }, 500);
    }

    await admin.from("book_pages").update({ ocr_status: "done" }).eq("id", pageId);
    return json({ ok: true, tasks: rows.length });
  } catch (e) {
    console.error("parse-book-page error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
