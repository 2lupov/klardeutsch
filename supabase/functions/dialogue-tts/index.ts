import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Two distinct German voices: male + female
const VOICE_A = "JBFqnCBsd6RMkjVDRZzb"; // George – male
const VOICE_B = "XrExE9yKIg1WjnnlVkGX"; // Matilda – female

interface Line {
  speaker: string;
  text: string;
}

function parseDialogue(text: string): Line[] | null {
  // Check if text has A:/B: pattern
  const hasDialogue = /^[A-Z]:\s/m.test(text);
  if (!hasDialogue) return null;

  const lines: Line[] = [];
  const regex = /([A-Z]):\s*(.+?)(?=(?:\n[A-Z]:\s)|$)/gs;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const speaker = match[1].trim();
    const lineText = match[2].trim();
    if (lineText) {
      lines.push({ speaker, text: lineText });
    }
  }
  return lines.length > 0 ? lines : null;
}

async function generateTTS(text: string, voiceId: string, apiKey: string, speed = 0.85): Promise<ArrayBuffer> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.6,
          similarity_boost: 0.75,
          style: 0.3,
          speed,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TTS failed for voice ${voiceId}: ${err}`);
  }

  return response.arrayBuffer();
}

// Create a short silence MP3 frame (~300ms)
function createSilence(): Uint8Array {
  // Minimal valid MP3 frame (silent), repeated for ~300ms pause
  // This is a single MPEG1 Layer3 128kbps 44100Hz stereo silent frame
  const silentFrame = new Uint8Array([
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x6E, 0x66, 0x6F,
  ]);
  // Repeat silent frame ~12 times for roughly 300ms
  const count = 12;
  const result = new Uint8Array(silentFrame.length * count);
  for (let i = 0; i < count; i++) {
    result.set(silentFrame, i * silentFrame.length);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, speed } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const lines = parseDialogue(text);

    if (!lines) {
      // Not a dialogue — use single voice (narrator)
      const audioBuffer = await generateTTS(text, VOICE_A, ELEVENLABS_API_KEY, speed ?? 0.85);
      return new Response(audioBuffer, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    // Dialogue mode: generate each line with appropriate voice
    // Map unique speakers to voices
    const speakerSet = [...new Set(lines.map((l) => l.speaker))];
    const voiceMap: Record<string, string> = {};
    speakerSet.forEach((s, i) => {
      voiceMap[s] = i % 2 === 0 ? VOICE_A : VOICE_B;
    });

    console.log(`Dialogue detected: ${lines.length} lines, ${speakerSet.length} speakers`);

    // Generate all lines in parallel
    const audioPromises = lines.map((line) =>
      generateTTS(line.text, voiceMap[line.speaker], ELEVENLABS_API_KEY, speed ?? 0.85)
    );
    const audioBuffers = await Promise.all(audioPromises);

    // Concatenate with short silence between lines
    const silence = createSilence();
    let totalLength = 0;
    for (const buf of audioBuffers) {
      totalLength += buf.byteLength + silence.length;
    }

    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (let i = 0; i < audioBuffers.length; i++) {
      const chunk = new Uint8Array(audioBuffers[i]);
      combined.set(chunk, offset);
      offset += chunk.byteLength;
      // Add silence between lines (not after last)
      if (i < audioBuffers.length - 1) {
        combined.set(silence, offset);
        offset += silence.length;
      }
    }

    return new Response(combined.buffer, {
      headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
    });
  } catch (e) {
    console.error("dialogue-tts error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
