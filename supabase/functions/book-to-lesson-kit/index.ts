import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import {
  askForBlocks,
  blockCors,
  gatewayErrorResponse,
  imagesAsDataUrls,
  jsonResponse,
  normalizeBlock,
} from "../_shared/lesson-blocks.ts";

/** Генерує блоки уроку з фото/сторінок книги і зберігає їх у набір (lesson_kits). */
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

    const body = await req.json().catch(() => ({}));
    const kitId = String(body?.kit_id ?? "");
    if (!kitId) return jsonResponse({ error: "kit_id is required" }, 400);

    const { data: kit } = await admin
      .from("lesson_kits")
      .select("id, owner_id, title, level, focus, blocks, notes")
      .eq("id", kitId)
      .maybeSingle();
    if (!kit) return jsonResponse({ error: "Набір не знайдено" }, 404);

    if (kit.owner_id !== userId) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) return jsonResponse({ error: "Доступ лише власнику набору" }, 403);
    }

    const imagePaths: string[] = Array.isArray(body?.image_paths) ? body.image_paths.slice(0, 8).map(String) : [];
    if (imagePaths.length === 0) return jsonResponse({ error: "Потрібно хоча б одну сторінку або фото" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI не налаштований" }, 500);

    const dataUrls = await imagesAsDataUrls(admin, imagePaths);
    if (dataUrls.length === 0) return jsonResponse({ error: "Не вдалося прочитати сторінки" }, 400);

    const level = String(body?.level ?? kit.level ?? "A2").slice(0, 5);
    const focus = body?.focus === "arbeitsbuch" ? "arbeitsbuch" : String(kit.focus ?? "kursbuch");
    const instructions = String(body?.instructions ?? kit.notes ?? "").slice(0, 1500);
    const audioPath = body?.audio_path ? String(body.audio_path).slice(0, 400) : null;

    const userText = [
      `Рівень: ${level}.`,
      focus === "arbeitsbuch"
        ? "Це Arbeitsbuch: більше тренувальних блоків (luecke, satzbau, paare)."
        : "Це Kursbuch: спочатку читання/аудіо, потім тренування.",
      audioPath ? "До уроку додано аудіофайл — обовʼязково створи блок hoer із транскриптом." : "",
      instructions ? `Побажання викладача: ${instructions}` : "",
      "Створи повний послідовний урок за цими сторінками.",
    ]
      .filter(Boolean)
      .join(" ");

    const ai = await askForBlocks(LOVABLE_API_KEY, dataUrls, userText);
    if (ai.status !== 200) return gatewayErrorResponse(ai.status, ai.error);

    const blocks = ai.blocks.map(normalizeBlock).filter(Boolean) as any[];
    if (blocks.length === 0) return jsonResponse({ error: "ШІ не знайшла завдань на цих сторінках" }, 422);

    if (audioPath) {
      const hoer = blocks.find((b) => b.type === "hoer");
      if (hoer) hoer.payload.audio_path = audioPath;
    }

    const existing = Array.isArray(kit.blocks) ? (kit.blocks as any[]) : [];
    const merged = body?.replace === false ? [...existing, ...blocks] : blocks;

    const { error: updErr } = await admin
      .from("lesson_kits")
      .update({ blocks: merged, level, focus, page_paths: imagePaths })
      .eq("id", kitId);
    if (updErr) return jsonResponse({ error: updErr.message }, 500);

    return jsonResponse({ ok: true, blocks: merged.length, added: blocks.length });
  } catch (e) {
    console.error("book-to-lesson-kit error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
