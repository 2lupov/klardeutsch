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

// German-speaking multilingual voice used across the platform.
const GERMAN_VOICE = "aTTiK3YzK3dXETpuDE2h";
const YEAR_SECONDS = 60 * 60 * 24 * 365;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return json({ error: "Доступ лише для викладачів" }, 403);

    const body = await req.json().catch(() => ({}));
    const text = String(body?.text ?? "").trim().slice(0, 4500);
    if (!text) return json({ error: "Текст порожній" }, 400);
    const speed = Number(body?.speed) || 0.9;

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) return json({ error: "ELEVENLABS_API_KEY не налаштовано" }, 500);

    const ttsRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${GERMAN_VOICE}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            style: 0.25,
            use_speaker_boost: true,
            speed,
          },
        }),
      },
    );

    if (!ttsRes.ok) {
      const details = await ttsRes.text();
      console.error(`ElevenLabs error [${ttsRes.status}]: ${details}`);
      return json({ error: `ElevenLabs помилка ${ttsRes.status}` }, ttsRes.status === 401 ? 500 : 502);
    }

    const audio = await ttsRes.arrayBuffer();
    const path = `${user.id}/${Date.now()}-hoertext.mp3`;

    const { error: upErr } = await admin.storage
      .from("assignment-audio")
      .upload(path, audio, { contentType: "audio/mpeg", upsert: false });
    if (upErr) {
      console.error("upload failed:", upErr);
      return json({ error: upErr.message }, 500);
    }

    const { data: signed } = await admin.storage
      .from("assignment-audio")
      .createSignedUrl(path, YEAR_SECONDS);

    return json({ ok: true, path, url: signed?.signedUrl ?? null });
  } catch (e) {
    console.error("assignment-tts error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
