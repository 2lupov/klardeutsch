import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const VOICES: Record<string, string> = { de: "aTTiK3YzK3dXETpuDE2h", nl: "pFZP5JQG7iQjIQuC4Bku" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(d)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 40);
}

/** Озвучка презентацій: один раз генерує ElevenLabs і зберігає MP3 назавжди, далі віддає готовий файл. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const list: { text: string; lang?: string; speed?: number }[] = Array.isArray(body.items) ? body.items : [body];
    if (list.length > 80) return json({ error: "too many" }, 400);
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const key = Deno.env.get("ELEVENLABS_API_KEY");
    if (!key) return json({ error: "ElevenLabs not configured" }, 500);

    const out: (string | null)[] = [];
    for (const it of list) {
      const text = String(it?.text ?? "").trim().slice(0, 800);
      if (!text) { out.push(null); continue; }
      const lang = it.lang === "nl" ? "nl" : "de";
      const speed = Math.round(Math.min(1.2, Math.max(0.7, Number(it.speed) || 0.9)) * 20) / 20;
      const path = `pres/${lang}/${await sha(`${lang}|${speed}|${text}`)}.mp3`;
      const pub = admin.storage.from("tts-audio").getPublicUrl(path).data.publicUrl;
      const head = await fetch(pub, { method: "HEAD" });
      if (head.ok) { out.push(pub); continue; }
      const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[lang]}?output_format=mp3_44100_128`, {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({ text, model_id: "eleven_multilingual_v2", voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.3, speed } }),
      });
      if (!r.ok) { console.error("elevenlabs", r.status, await r.text()); out.push(null); continue; }
      const { error } = await admin.storage.from("tts-audio").upload(path, new Uint8Array(await r.arrayBuffer()), { contentType: "audio/mpeg", upsert: true });
      if (error) { console.error("upload", error.message); out.push(null); continue; }
      out.push(pub);
    }
    return json({ urls: out, url: out[0] ?? null });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});
