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

const SYSTEM = `Du bist ein Didaktik-Designer. Du siehst das Foto einer Seite aus einem deutschen Sachbuch / einer Enzyklopädie.
Baue daraus eine INTERAKTIVE, animierte Lernseite. Der gesamte Text bleibt DEUTSCH (keine Übersetzungen, keine andere Sprache).
Erfinde keine Fakten: benutze nur, was auf der Seite steht. Kürze und vereinfache die Sätze für Lernende.

Gib NUR JSON zurück: { "title": "...", "level": "A2", "scene": [ Blöcke ] }
title: kurzer deutscher Titel der Seite (max. 60 Zeichen).
scene: 4–8 Blöcke in sinnvoller Reihenfolge. Erlaubte Blocktypen:

1) { "type":"text", "title":"...", "paragraphs":["..."], "terms":["Fachwort"] }
   Kurze Absätze (max. 3 Sätze). terms = Schlüsselwörter, die hervorgehoben werden.
2) { "type":"orbit", "title":"...", "center":{"label":"Sonne","color":"#FDB813"},
     "objects":[{"label":"Merkur","description":"kurzer Satz","color":"#B0AFAF","size":10,"speed":2.5,"ring":false}] }
   NUR wenn die Seite etwas Kreisendes/Umlaufendes zeigt (Planeten, Monde, Elektronen, Kreisläufe).
   size 6–40 (relative Größe), speed 0.1–6 (größer = schneller), ring=true für Ringe (z. B. Saturn).
   Reihenfolge = von innen nach außen.
3) { "type":"hotspots", "title":"...", "points":[{"x":42,"y":18,"label":"Sonne","description":"kurzer Satz"}] }
   Punkte auf dem Originalfoto der Seite; x/y in Prozent (0–100) vom linken/oberen Rand.
4) { "type":"scale", "title":"...", "unit":"Mio. km", "items":[{"label":"Merkur","value":58,"note":"..."}] }
   Für Entfernungen, Größen, Zeitspannen, Temperaturen.
5) { "type":"facts", "title":"...", "cards":[{"front":"Wie viele Planeten?","back":"Acht Planeten"}] }
6) { "type":"table", "title":"...", "headers":["..."], "rows":[["..."]] }
   Nur wenn die Seite eine Tabelle oder klar vergleichbare Daten hat.
7) { "type":"vocab", "title":"...", "words":[{"de":"Anziehungskraft","article":"die","note":"kurze deutsche Erklärung"}] }
   8–20 Schlüsselwörter der Seite, mit Artikel bei Nomen. note ist eine EINFACHE deutsche Erklärung.
8) { "type":"quiz", "title":"...", "questions":[{"question":"...","options":["A","B","C"],"correct_index":1}] }
   3–6 Fragen zum Inhalt der Seite, deutsch, mit genau einer richtigen Antwort.

Nimm immer mindestens einen "vocab"- und einen "quiz"-Block. Nimm "orbit" nur, wenn es inhaltlich passt.
Keine Erklärungen außerhalb des JSON.`;

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

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return json({ error: "Доступ лише для викладачів" }, 403);

    const body = await req.json().catch(() => ({}));
    const pageId = String(body?.page_id ?? "");
    const hint = String(body?.hint ?? "").slice(0, 800);
    const level = String(body?.level ?? "").slice(0, 4);
    if (!pageId) return json({ error: "page_id is required" }, 400);

    const { data: page } = await admin
      .from("book_pages")
      .select("id, book_id, page_number, image_path")
      .eq("id", pageId)
      .maybeSingle();
    if (!page) return json({ error: "Сторінку не знайдено" }, 404);

    const { data: file, error: dlErr } = await admin.storage.from("book-pages").download(page.image_path);
    if (dlErr || !file) return json({ error: "Не вдалося прочитати сканування сторінки" }, 400);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length === 0) return json({ error: "Порожній файл сторінки" }, 400);
    if (bytes.length > 12 * 1024 * 1024) {
      return json(
        { error: `Скан завеликий (${(bytes.length / 1024 / 1024).toFixed(1)} МБ). Завантажте сторінку до 12 МБ.` },
        400,
      );
    }
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const base64 = btoa(binary);
    const mime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "AI не налаштований" }, 500);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Seite ${page.page_number ?? "?"} einer deutschen Enzyklopädie.${
                  level ? ` Sprachniveau der Lernenden: ${level}.` : ""
                }${hint ? ` Zusätzlicher Wunsch der Lehrkraft: ${hint}` : ""} Erzeuge die interaktive Lernseite als JSON.`,
              },
              { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`AI gateway error [${res.status}]: ${details}`);
      if (res.status === 402) return json({ error: "Закінчились AI-кредити робочого простору. Поповніть баланс." }, 402);
      if (res.status === 429) return json({ error: "Забагато запитів до AI. Спробуйте за хвилину." }, 429);
      return json({ error: `AI не змогла обробити сторінку (код ${res.status}). ${details.slice(0, 200)}` }, 502);
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

    const scene = Array.isArray(parsed?.scene) ? parsed.scene : [];
    if (scene.length === 0) {
      return json({ error: "AI не знайшла на цій сторінці матеріалу для інтерактивної сцени." }, 422);
    }

    // The hotspot block points at the original scan of this page.
    for (const block of scene) {
      if (block?.type === "hotspots" && !block.image_path && !block.image_url) {
        block.image_path = page.image_path;
      }
    }

    const title = String(parsed?.title ?? "").slice(0, 120) || `Seite ${page.page_number ?? ""}`.trim();

    const { data: inserted, error: insErr } = await admin
      .from("interactive_pages")
      .insert({
        book_id: page.book_id,
        page_id: page.id,
        owner_id: userId,
        title,
        level: level || String(parsed?.level ?? "").slice(0, 4) || null,
        scene,
        status: "draft",
      })
      .select("id")
      .single();
    if (insErr) {
      console.error("insert interactive_pages failed:", insErr);
      return json({ error: insErr.message }, 500);
    }

    return json({ ok: true, id: inserted.id, blocks: scene.length });
  } catch (e) {
    console.error("generate-interactive-page error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
