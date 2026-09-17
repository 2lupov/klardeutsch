// Швидкий перегляд сторінок скан-підручника: ШІ описує кожну сторінку одним рядком.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
import { blockCors, gatewayErrorResponse, jsonResponse } from "../_shared/lesson-blocks.ts";

const SYSTEM = `Ти дивишся на сторінки німецького підручника (скан). Для КОЖНОЇ сторінки дай короткий опис.
Поверни ЛИШЕ JSON: { "pages": [ { "n": 12, "heading": "заголовок/номер Lektion зі сторінки", "summary": "1 рядок: яка тема і які вправи", "kinds": ["theorie","luecke"] } ] }
"n" — номер сторінки, який я вказав перед зображенням. heading — так, як написано в книзі (німецькою). summary — українською, до 150 символів. kinds — з набору: theorie, hoer, lesen, luecke, paare, satzbau, schreiben, inhalt (зміст), loesungen (ключі), sonstiges.
Без тексту поза JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: blockCors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: claims, error: claimsError } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claims?.claims) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = String((claims.claims as any).sub);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return jsonResponse({ error: "Доступ лише для викладача" }, 403);

    const body = await req.json();
    const pages: Array<{ n: number; image: string }> = Array.isArray(body?.pages) ? body.pages.slice(0, 8) : [];
    if (pages.length === 0) return jsonResponse({ error: "Немає сторінок" }, 400);

    const content: any[] = [{ type: "text", text: `Опиши ці ${pages.length} сторінок.` }];
    for (const p of pages) {
      content.push({ type: "text", text: `Сторінка ${p.n}:` });
      content.push({ type: "image_url", image_url: { url: p.image } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!, "Content-Type": "application/json" },
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
      console.error(`AI gateway error [${res.status}]: ${details.slice(0, 400)}`);
      return gatewayErrorResponse(res.status, details.slice(0, 200));
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

    const out = (Array.isArray(parsed?.pages) ? parsed.pages : []).slice(0, 8).map((p: any) => ({
      n: Number(p?.n) || 0,
      heading: String(p?.heading ?? "").slice(0, 200),
      summary: String(p?.summary ?? "").slice(0, 300),
      kinds: (Array.isArray(p?.kinds) ? p.kinds : []).slice(0, 6).map((k: any) => String(k).slice(0, 20)),
    }));

    return jsonResponse({ pages: out });
  } catch (e) {
    console.error("scan-book-pages failed:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Помилка" }, 500);
  }
});
