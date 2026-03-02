import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");

  if (!ELEVENLABS_API_KEY) {
    return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const response = await fetch("https://api.elevenlabs.io/v1/music", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: "Chill lofi hip hop beats, relaxing study music, soft piano chords with vinyl crackle, mellow drums, warm jazzy atmosphere, perfect for studying and concentration",
      duration_seconds: 120,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return new Response(JSON.stringify({ error: err }), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const audioBuffer = await response.arrayBuffer();

  return new Response(audioBuffer, {
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
    },
  });
});
