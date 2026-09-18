import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  blockCors,
  gatewayErrorResponse,
  jsonResponse,
  normalizeBlock,
  SYSTEM_BLOCKS,
} from "../_shared/lesson-blocks.ts";

const SYSTEM_MINI = `${SYSTEM_BLOCKS}

ОСОБЛИВИЙ РЕЖИМ: на зображеннях — слайди презентації (не підручник). Зроби з них МІНІКУРС, поділений на ТЕМИ.
Поверни ЛИШЕ JSON такої форми:

{ "topics": ["Genitiv"], "summary": "один рядок українською", "sections": [ { "title": "Коротка назва теми українською", "emoji": "📘", "summary": "1 рядок: що вивчаємо", "blocks": [ {"type":"theorie", ...}, {"type":"luecke", ...} ] } ] }

Правила мінікурсу:
- 2–6 тем, кожна тема — логічно завершений крок (одна граматика чи одне лексичне поле).
- Кожна тема ПОЧИНАЄТЬСЯ блоком "theorie" (правило зі слайдів, українською, приклади німецькою), далі 2–4 блоки завдань ("luecke", "paare", "satzbau", "lesen", "schreiben").
- Використовуй зміст слайдів; можеш складати додаткові приклади того ж типу, щоб завдань було достатньо.
- emoji — один доречний емодзі темі.
- Без пояснень поза JSON.`;

async function slidesAsDataUrls(admin: any, paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const path of paths) {
    const { data: file, error } = await admin.storage.from("presentation-slides").download(path);
    if (error || !file) continue;
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length === 0 || bytes.length > 8 * 1024 * 1024) continue;
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    out.push(`data:image/jpeg;base64,${btoa(binary)}`);
  }
  return out;
}

async function askForSections(apiKey: string, dataUrls: string[], userText: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3.7-flash",
      messages: [
        { role: "system", content: SYSTEM_MINI },
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
    console.error(`AI gateway error [${res.status}]: ${details.slice(0, 400)}`);
    return { sections: [], topics: [], summary: null as string | null, status: res.status, error: details.slice(0, 300) };
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
    ? parsed.topics.slice(0, 6).map((t: any) => String(t).slice(0, 60)).filter(Boolean)
    : [];
  return {
    sections: Array.isArray(parsed?.sections) ? parsed.sections : [],
    topics,
    summary: parsed?.summary ? String(parsed.summary).slice(0, 300) : null,
    status: 200,
  };
}

/** Презентація (слайди) → мінікурс із тем із теорією і завданнями (lesson_kits, kind = minicourse). */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: blockCors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claims, error: claimsErr } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claims?.claims) return jsonResponse({ error: "Unauthorized" }, 401);
    const userId = String((claims.claims as any).sub);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return jsonResponse({ error: "Доступ лише для викладача" }, 403);

    const body = await req.json().catch(() => ({}));
    const presentationId = String(body?.presentation_id ?? "");
    if (!presentationId) return jsonResponse({ error: "presentation_id is required" }, 400);

    const { data: pres } = await admin
      .from("presentations")
      .select("id, title, slide_paths")
      .eq("id", presentationId)
      .maybeSingle();
    if (!pres) return jsonResponse({ error: "Презентацію не знайдено" }, 404);

    const all: string[] = Array.isArray(pres.slide_paths) ? pres.slide_paths.map(String) : [];
    if (all.length === 0) return jsonResponse({ error: "У презентації немає слайдів" }, 400);

    const from = Math.max(1, Number(body?.from ?? 1));
    const to = Math.min(all.length, Number(body?.to ?? all.length));
    const paths = all.slice(from - 1, Math.max(from, to)).slice(0, 24);
    if (paths.length === 0) return jsonResponse({ error: "Невірний діапазон слайдів" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI не налаштований" }, 500);

    const level = String(body?.level ?? "B1").slice(0, 5);
    const notes = String(body?.notes ?? "").slice(0, 1200);

    // Слайди обробляємо партіями — кожна партія дає свої теми, далі зшиваємо в один курс.
    const batches: string[][] = [];
    for (let i = 0; i < paths.length; i += 8) batches.push(paths.slice(i, i + 8));

    const sections: any[] = [];
    const topics = new Set<string>();
    let summary: string | null = null;

    for (let b = 0; b < batches.length; b++) {
      const dataUrls = await slidesAsDataUrls(admin, batches[b]);
      if (dataUrls.length === 0) continue;

      const userText = [
        `Рівень учня: ${level}.`,
        `Назва презентації: "${pres.title}".`,
        batches.length > 1 ? `Це частина ${b + 1} з ${batches.length} слайдів презентації — зроби ${b === 0 ? "1–3" : "1–2"} теми лише за цими слайдами.` : "",
        notes ? `Побажання викладача: ${notes}` : "",
        "Зроби з цих слайдів мінікурс із теоріями і завданнями.",
      ]
        .filter(Boolean)
        .join(" ");

      const ai = await askForSections(LOVABLE_API_KEY, dataUrls, userText);
      if (ai.status !== 200) {
        if (sections.length === 0) return gatewayErrorResponse(ai.status, ai.error);
        break;
      }
      ai.topics.forEach((t: string) => topics.add(t));
      if (!summary && ai.summary) summary = ai.summary;

      for (const s of ai.sections.slice(0, 6)) {
        const blocks = (Array.isArray(s?.blocks) ? s.blocks : []).map(normalizeBlock).filter(Boolean) as any[];
        if (blocks.length === 0) continue;
        sections.push({
          id: crypto.randomUUID(),
          title: String(s?.title ?? `Тема ${sections.length + 1}`).slice(0, 120),
          emoji: String(s?.emoji ?? "📘").slice(0, 4),
          summary: s?.summary ? String(s.summary).slice(0, 240) : null,
          blocks,
        });
      }
    }

    if (sections.length === 0) return jsonResponse({ error: "ШІ не змогла зробити курс із цих слайдів" }, 422);

    const flat = sections.flatMap((s) => s.blocks);
    const { data: kit, error: insErr } = await admin
      .from("lesson_kits")
      .insert({
        owner_id: userId,
        kind: "minicourse",
        presentation_id: presentationId,
        title: String(body?.title ?? pres.title).slice(0, 200),
        level,
        focus: "kursbuch",
        notes: notes || null,
        blocks: flat,
        sections,
        topics: Array.from(topics),
        summary,
      })
      .select("*")
      .single();
    if (insErr) return jsonResponse({ error: insErr.message }, 500);

    return jsonResponse({ ok: true, kit, sections: sections.length, blocks: flat.length });
  } catch (e) {
    console.error("presentation-to-minicourse error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
