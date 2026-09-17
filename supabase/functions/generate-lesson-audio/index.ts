import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { assertTeacher, blockCors, jsonResponse } from "../_shared/lesson-blocks.ts";

const VOICE_ID = "6CS8keYmkwxkspesdyA7";

/** Озвучує транскрипт блока Hörverstehen і зберігає mp3 у сховище. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: blockCors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => ({}));
    const blockId = String(body?.block_id ?? "");
    if (!blockId) return jsonResponse({ error: "block_id is required" }, 400);

    const { data: block } = await admin
      .from("tutoring_lesson_blocks")
      .select("id, lesson_id, payload")
      .eq("id", blockId)
      .maybeSingle();
    if (!block) return jsonResponse({ error: "Блок не знайдено" }, 404);

    const guard = await assertTeacher(admin, anon, authHeader, block.lesson_id);
    if (guard.error) return guard.error;

    const payload: any = block.payload ?? {};
    const text = Array.isArray(payload.transcript)
      ? payload.transcript.map((l: any) => String(l?.de ?? "").trim()).filter(Boolean).join(" … ")
      : "";
    if (!text) return jsonResponse({ error: "У блоці немає транскрипту для озвучення" }, 400);

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) return jsonResponse({ error: "Озвучка не налаштована" }, 500);

    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: text.slice(0, 4000),
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.25, speed: 0.9 },
      }),
    });
    if (!res.ok) {
      const details = await res.text();
      console.error(`ElevenLabs error [${res.status}]: ${details.slice(0, 300)}`);
      return jsonResponse({ error: `Не вдалося озвучити (код ${res.status})` }, 502);
    }

    const audio = new Uint8Array(await res.arrayBuffer());
    const path = `audio/${block.lesson_id}/${blockId}.mp3`;
    const { error: upErr } = await admin.storage
      .from("tutoring-materials")
      .upload(path, audio, { contentType: "audio/mpeg", upsert: true });
    if (upErr) return jsonResponse({ error: upErr.message }, 500);

    const { error: updErr } = await admin
      .from("tutoring_lesson_blocks")
      .update({ payload: { ...payload, audio_path: path } })
      .eq("id", blockId);
    if (updErr) return jsonResponse({ error: updErr.message }, 500);

    return jsonResponse({ ok: true, audio_path: path });
  } catch (e) {
    console.error("generate-lesson-audio error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
