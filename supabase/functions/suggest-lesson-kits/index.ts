import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { blockCors, gatewayErrorResponse, jsonResponse } from "../_shared/lesson-blocks.ts";

const SYSTEM = `Ти — методист німецької мови і асистент викладача. Тобі дають список готових уроків (наборів блоків) з бібліотеки викладача і запит викладача українською.
Твоє завдання — вибрати 1–5 найкращих уроків саме під цей запит і, якщо вказано учня, під його рівень і слабкі теми.
Поверни ЛИШЕ JSON:
{ "results": [ { "kit_id": "uuid", "reason": "1 коротке речення українською, чому саме цей урок" } ], "hint": "порада українською, якщо нічого доброго немає або варто згенерувати новий урок з книги" }
Не вигадуй kit_id — бери лише зі списку. Якщо жоден урок не підходить, поверни порожній results і напиши hint.`;

/** ШІ-підбір уроку з бібліотеки під запит викладача та конкретного учня. */
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
    const query = String(body?.query ?? "").slice(0, 600).trim();
    const studentId = body?.student_id ? String(body.student_id) : null;
    if (!query) return jsonResponse({ error: "Напишіть, що шукаєте" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI не налаштований" }, 500);

    const { data: kits } = await admin
      .from("lesson_kits")
      .select("id, title, level, focus, topics, summary, blocks, created_at")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false })
      .limit(120);

    const list = (kits ?? []).map((k: any) => ({
      kit_id: k.id,
      title: k.title,
      level: k.level,
      focus: k.focus,
      topics: k.topics ?? [],
      summary: k.summary ?? null,
      blocks: Array.isArray(k.blocks) ? k.blocks.length : 0,
      block_types: Array.isArray(k.blocks) ? [...new Set(k.blocks.map((b: any) => b?.type))] : [],
    }));

    if (list.length === 0) {
      return jsonResponse({ results: [], hint: "Бібліотека уроків поки порожня — згенеруйте урок із книги." });
    }

    let student: any = null;
    if (studentId) {
      const { data: p } = await admin
        .from("profiles")
        .select("display_name, nickname, level")
        .eq("user_id", studentId)
        .maybeSingle();
      const { data: answers } = await admin
        .from("tutoring_block_answers")
        .select("score, max_score, submitted_at, block_id")
        .eq("student_id", studentId)
        .order("submitted_at", { ascending: false })
        .limit(25);
      const blockIds = (answers ?? []).map((a: any) => a.block_id).filter(Boolean);
      const { data: blocks } = blockIds.length
        ? await admin.from("tutoring_lesson_blocks").select("id, type, title").in("id", blockIds)
        : { data: [] as any[] };
      const byId = new Map((blocks ?? []).map((b: any) => [b.id, b]));
      const { data: assigned } = await admin
        .from("student_assignments")
        .select("title, created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false })
        .limit(15);

      student = {
        name: p?.display_name || p?.nickname || "Учень",
        level: p?.level ?? null,
        recent_results: (answers ?? []).map((a: any) => ({
          block: byId.get(a.block_id)?.title ?? byId.get(a.block_id)?.type ?? "блок",
          type: byId.get(a.block_id)?.type ?? null,
          percent: a.max_score ? Math.round((Number(a.score ?? 0) / Number(a.max_score)) * 100) : null,
        })),
        recent_assignments: (assigned ?? []).map((a: any) => a.title),
      };
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              `Запит викладача: ${query}`,
              student ? `Учень: ${JSON.stringify(student)}` : "Учень не вказаний.",
              `Бібліотека уроків: ${JSON.stringify(list)}`,
              "Поверни JSON.",
            ].join("\n\n"),
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const details = await res.text();
      console.error(`suggest-lesson-kits gateway [${res.status}]: ${details.slice(0, 400)}`);
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

    const known = new Set(list.map((k) => k.kit_id));
    const results = (Array.isArray(parsed?.results) ? parsed.results : [])
      .map((r: any) => ({ kit_id: String(r?.kit_id ?? ""), reason: String(r?.reason ?? "").slice(0, 300) }))
      .filter((r: any) => known.has(r.kit_id))
      .slice(0, 5);

    return jsonResponse({
      results,
      hint: parsed?.hint ? String(parsed.hint).slice(0, 400) : null,
    });
  } catch (e) {
    console.error("suggest-lesson-kits error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
