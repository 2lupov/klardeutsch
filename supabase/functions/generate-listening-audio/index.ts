import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VOICES: Record<string, string> = {
  male1: "aTTiK3YzK3dXETpuDE2h",
  male2: "fmj9wTxZg3ta4xR75kgB",
  female1: "6CS8keYmkwxkspesdyA7",
  female2: "NE7AIW5DoJ7lUosXV2KR",
};

interface Line { speaker: string; text: string; }

function parseDialogue(text: string): Line[] | null {
  if (!/^[A-Z]:\s/m.test(text)) return null;
  
  // Split by lines and parse each one — more reliable than complex regex
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
  if (!LOVABLE_API_KEY) return {};
  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: "You detect speaker genders in German dialogues. Respond ONLY with a JSON object mapping speaker letters to 'm' or 'f'." },
          { role: "user", content: text },
        ],
        tools: [{
          type: "function",
          function: {
            name: "set_genders",
            description: "Set detected genders",
            parameters: { type: "object", properties: { genders: { type: "object", additionalProperties: { type: "string", enum: ["m", "f"] } } }, required: ["genders"], additionalProperties: false },
          },
        }],
        tool_choice: { type: "function", function: { name: "set_genders" } },
      }),
    });
    if (!response.ok) return {};
    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments).genders || {};
    }
  } catch (e) { console.error("Gender detection error:", e); }
  return {};
}

async function generateTTS(text: string, voiceId: string, apiKey: string, speed = 0.85): Promise<ArrayBuffer> {
  console.log(`Generating TTS for voice ${voiceId}: "${text.substring(0, 50)}..."`);
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text, model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.6, similarity_boost: 0.75, style: 0.3, speed },
      }),
    }
  );
  if (!response.ok) throw new Error(`TTS failed: ${await response.text()}`);
  const buf = await response.arrayBuffer();
  console.log(`TTS generated: ${buf.byteLength} bytes`);
  return buf;
}

function createSilence(): Uint8Array {
  const frame = new Uint8Array([
    0xFF,0xFB,0x90,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,
    0x00,0x00,0x00,0x00,0x49,0x6E,0x66,0x6F,
  ]);
  const result = new Uint8Array(frame.length * 12);
  for (let i = 0; i < 12; i++) result.set(frame, i * frame.length);
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseAdmin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const supabaseUser = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check admin
    const { data: isAdmin } = await supabaseAdmin.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { listening_id } = await req.json();
    if (!listening_id) throw new Error("listening_id required");

    // Get listening text
    const { data: listening, error: lErr } = await supabaseAdmin.from("listening_texts").select("*").eq("id", listening_id).single();
    if (lErr || !listening) throw new Error("Listening text not found");

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

    const text = listening.text;
    const voiceConfig = listening.voice_config as Record<string, string> | null;
    const lines = parseDialogue(text);
    let audioData: Uint8Array;

    console.log(`Generating audio for "${listening.title}": ${lines ? lines.length + ' dialogue lines' : 'solo mode'}`);

    if (!lines) {
      // Solo text
      const voiceId = voiceConfig?.narrator || VOICES.male1;
      const buf = await generateTTS(text, voiceId, ELEVENLABS_API_KEY);
      audioData = new Uint8Array(buf);
    } else {
      // Dialogue
      const speakerSet = [...new Set(lines.map(l => l.speaker))];
      const voiceMap: Record<string, string> = {};

      if (voiceConfig && Object.keys(voiceConfig).length > 0) {
        for (const s of speakerSet) voiceMap[s] = voiceConfig[s] || VOICES.male1;
      } else {
        const genders = await detectGenders(text);
        let mIdx = 0, fIdx = 0;
        const mVoices = [VOICES.male1, VOICES.male2];
        const fVoices = [VOICES.female1, VOICES.female2];
        for (const s of speakerSet) {
          if (genders[s] === "f") { voiceMap[s] = fVoices[fIdx++ % 2]; }
          else { voiceMap[s] = mVoices[mIdx++ % 2]; }
        }
      }

      console.log(`Voice mapping: ${JSON.stringify(voiceMap)}`);

      const buffers: ArrayBuffer[] = [];
      for (let i = 0; i < lines.length; i++) {
        console.log(`Generating line ${i + 1}/${lines.length}: ${lines[i].speaker}: ${lines[i].text.substring(0, 40)}...`);
        buffers.push(await generateTTS(lines[i].text, voiceMap[lines[i].speaker], ELEVENLABS_API_KEY));
      }

      console.log(`All ${buffers.length} segments generated, concatenating...`);

      const silence = createSilence();
      let totalLen = 0;
      for (const b of buffers) totalLen += b.byteLength + silence.length;

      const combined = new Uint8Array(totalLen);
      let offset = 0;
      for (let i = 0; i < buffers.length; i++) {
        combined.set(new Uint8Array(buffers[i]), offset);
        offset += buffers[i].byteLength;
        if (i < buffers.length - 1) { combined.set(silence, offset); offset += silence.length; }
      }
      audioData = combined;
    }

    console.log(`Final audio size: ${audioData.length} bytes`);

    // Upload to storage
    const filePath = `listening/${listening_id}.mp3`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from("tts-audio")
      .upload(filePath, audioData.buffer, {
        contentType: "audio/mpeg",
        upsert: true,
      });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from("tts-audio").getPublicUrl(filePath);
    const audioUrl = urlData.publicUrl + `?v=${Date.now()}`;

    // Save URL to listening_texts
    await supabaseAdmin.from("listening_texts").update({ audio_url: audioUrl }).eq("id", listening_id);

    return new Response(JSON.stringify({ audio_url: audioUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-listening-audio error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
