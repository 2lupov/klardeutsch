import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, topic, level, lang } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) throw new Error("ELEVENLABS_API_KEY is not configured");

    const isUk = lang === "uk";
    const feedbackLang = isUk ? "українською" : "на русском";

    const systemPrompt = `Du bist ein Gesprächspartner in einem Telefongespräch auf Deutsch, Niveau ${level || "A2"}.
Thema: ${topic || "Allgemein"}.

WICHTIG - REGELN FÜR TELEFONGESPRÄCH:
1. Antworte NUR auf Deutsch, kurz (1-3 Sätze). Du simulierst ein echtes Telefonat.
2. Bleibe in deiner Rolle (Arzt-Rezeption, Vermieter, Kundenservice etc.)
3. Stelle eine Frage am Ende, um das Gespräch weiterzuführen.
4. Nach "---" füge KURZ hinzu (${feedbackLang}):
   - 🔍 Fehler (wenn vorhanden, sonst "✅")
   - 💡 1-2 nützliche Wörter
5. Halte den Feedback-Teil KURZ (max 2 Zeilen).`;

    // Step 1: Get AI response (non-streaming for speed combined with TTS)
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: isUk ? "Забагато запитів." : "Слишком много запросов." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: isUk ? "Ліміт вичерпано." : "Лимит исчерпан." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI error: " + status);
    }

    const aiData = await aiResponse.json();
    const aiText = aiData.choices?.[0]?.message?.content || "";

    // Step 2: Extract German part for TTS (before ---)
    const germanPart = aiText.split("---")[0].trim();

    // Step 3: Generate TTS for German part only
    const voiceId = "aTTiK3YzK3dXETpuDE2h";
    const ttsResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_22050_32`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: germanPart,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.6,
            similarity_boost: 0.75,
            speed: 0.9,
          },
        }),
      }
    );

    let audioBase64 = "";
    if (ttsResponse.ok) {
      const audioBuffer = await ttsResponse.arrayBuffer();
      audioBase64 = base64Encode(audioBuffer);
    } else {
      console.error("TTS error:", ttsResponse.status);
    }

    return new Response(JSON.stringify({
      text: aiText,
      audio: audioBase64,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("phone-conversation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
