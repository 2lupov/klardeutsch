import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Voice pairs
const VOICES = {
  male1: "aTTiK3YzK3dXETpuDE2h",
  male2: "fmj9wTxZg3ta4xR75kgB",
  female1: "6CS8keYmkwxkspesdyA7",
  female2: "NE7AIW5DoJ7lUosXV2KR",
};

interface Line {
  speaker: string;
  text: string;
}

function parseDialogue(text: string): Line[] | null {
  const hasDialogue = /^[A-Z]:\s/m.test(text);
  if (!hasDialogue) return null;

  // Split by lines and parse each one
  const rawLines = text.split(/\r?\n/);
  const lines: Line[] = [];
  
  for (const raw of rawLines) {
    const match = raw.match(/^([A-Z]):\s*(.+)$/);
    if (match && match[2].trim()) {
      lines.push({ speaker: match[1], text: match[2].trim() });
    }
  }
  
  return lines.length > 0 ? lines : null;
}

async function detectGenders(text: string): Promise<Record<string, "m" | "f">> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    console.log("No LOVABLE_API_KEY, defaulting to male voices");
    return {};
  }

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: "You detect speaker genders in German dialogues. Respond ONLY with a JSON object mapping speaker letters to 'm' or 'f'. Example: {\"A\":\"m\",\"B\":\"f\"}. Use context clues: names, articles (der/die), adjectives (-e/-er endings), pronouns, social roles.",
          },
          {
            role: "user",
            content: text,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "set_genders",
              description: "Set the detected genders for each speaker",
              parameters: {
                type: "object",
                properties: {
                  genders: {
                    type: "object",
                    additionalProperties: { type: "string", enum: ["m", "f"] },
                  },
                },
                required: ["genders"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "set_genders" } },
      }),
    });

    if (!response.ok) {
      console.error("AI gender detection failed:", response.status);
      return {};
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      console.log("Detected genders:", parsed.genders);
      return parsed.genders || {};
    }
  } catch (e) {
    console.error("Gender detection error:", e);
  }
  return {};
}

async function generateTTS(text: string, voiceId: string, apiKey: string, speed = 0.85): Promise<ArrayBuffer> {
  console.log(`Generating TTS for voice ${voiceId}: "${text.substring(0, 50)}..."`);
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

  const buf = await response.arrayBuffer();
  console.log(`TTS generated: ${buf.byteLength} bytes`);
  return buf;
}

function createSilence(): Uint8Array {
  const silentFrame = new Uint8Array([
    0xFF, 0xFB, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x6E, 0x66, 0x6F,
  ]);
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
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { text, speed, voice_config } = await req.json();
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY not configured");
    }

    const lines = parseDialogue(text);
    console.log(`Parsed dialogue: ${lines ? lines.length + ' lines' : 'not a dialogue'}`);

    if (!lines) {
      const audioBuffer = await generateTTS(text, VOICES.male1, ELEVENLABS_API_KEY, speed ?? 0.85);
      return new Response(audioBuffer, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    // Map speakers to voices
    const speakerSet = [...new Set(lines.map((l) => l.speaker))];
    const voiceMap: Record<string, string> = {};

    if (voice_config && typeof voice_config === "object") {
      for (const speaker of speakerSet) {
        voiceMap[speaker] = voice_config[speaker] || VOICES.male1;
      }
      console.log(`Using admin voice_config: ${JSON.stringify(voiceMap)}`);
    } else {
      const genders = await detectGenders(text);
      let maleIdx = 0;
      let femaleIdx = 0;
      const maleVoices = [VOICES.male1, VOICES.male2];
      const femaleVoices = [VOICES.female1, VOICES.female2];

      for (const speaker of speakerSet) {
        const gender = genders[speaker] || "m";
        if (gender === "f") {
          voiceMap[speaker] = femaleVoices[femaleIdx % femaleVoices.length];
          femaleIdx++;
        } else {
          voiceMap[speaker] = maleVoices[maleIdx % maleVoices.length];
          maleIdx++;
        }
      }
    }

    console.log(`Dialogue: ${lines.length} lines, speakers: ${JSON.stringify(voiceMap)}`);

    // Generate lines sequentially to avoid ElevenLabs concurrent request limit
    const audioBuffers: ArrayBuffer[] = [];
    for (let i = 0; i < lines.length; i++) {
      console.log(`Generating line ${i + 1}/${lines.length}: ${lines[i].speaker}: ${lines[i].text.substring(0, 40)}...`);
      const buf = await generateTTS(lines[i].text, voiceMap[lines[i].speaker], ELEVENLABS_API_KEY, speed ?? 0.85);
      audioBuffers.push(buf);
    }

    console.log(`All ${audioBuffers.length} audio segments generated, concatenating...`);

    // Concatenate with silence between lines
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
      if (i < audioBuffers.length - 1) {
        combined.set(silence, offset);
        offset += silence.length;
      }
    }

    console.log(`Final audio: ${combined.length} bytes`);

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
