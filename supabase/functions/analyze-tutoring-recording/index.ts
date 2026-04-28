import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ELEVEN_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { recording_id } = await req.json();
    if (!recording_id) {
      return new Response(JSON.stringify({ error: "recording_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch recording, ensure teacher
    const { data: rec, error: recErr } = await supabase
      .from("tutoring_lesson_recordings")
      .select("*")
      .eq("id", recording_id)
      .single();
    if (recErr || !rec) throw new Error("Recording not found");
    if (rec.teacher_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("tutoring_lesson_recordings")
      .update({ status: "processing" }).eq("id", recording_id);

    // 1) Download audio/video file from storage
    const fileUrl = rec.audio_url || rec.video_url;
    if (!fileUrl) throw new Error("No file to analyze");

    // Path is after /tutoring-recordings/
    const m = fileUrl.match(/tutoring-recordings\/(.+)$/);
    const path = m ? m[1].split("?")[0] : null;
    if (!path) throw new Error("Invalid file path");

    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from("tutoring-recordings").download(path);
    if (dlErr || !fileBlob) throw new Error("Download failed: " + dlErr?.message);

    // 2) STT via ElevenLabs
    let transcript = "";
    if (ELEVEN_KEY) {
      const fd = new FormData();
      fd.append("file", fileBlob, "recording.webm");
      fd.append("model_id", "scribe_v2");
      fd.append("language_code", "deu");
      fd.append("diarize", "true");

      const sttRes = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
        method: "POST",
        headers: { "xi-api-key": ELEVEN_KEY },
        body: fd,
      });
      if (!sttRes.ok) {
        const t = await sttRes.text();
        console.error("STT failed:", sttRes.status, t);
        throw new Error("STT failed");
      }
      const sttData = await sttRes.json();
      transcript = sttData.text || "";
    } else {
      throw new Error("ELEVENLABS_API_KEY missing");
    }

    // 3) AI analysis: extract new German words + student errors
    let aiNewWords: any[] = [];
    let aiErrors: any[] = [];
    let aiSummary = "";

    if (LOVABLE_KEY && transcript) {
      const prompt = `Это транскрипт урока немецкого языка между преподавателем и учеником.

ТРАНСКРИПТ:
"""
${transcript.slice(0, 12000)}
"""

Выполни анализ:
1. Извлеки до 15 ключевых немецких слов/фраз, которые встретились на уроке (новые или важные для запоминания). Для каждого: артикль (der/die/das/-), русский перевод, краткий пример из урока.
2. Найди до 8 ошибок ученика (грамматика, артикли, порядок слов, произношение по контексту). Для каждой: что сказал, как правильно, краткое объяснение по-русски.
3. Краткий конспект урока (3-5 предложений по-русски): какие темы прошли, на что обратить внимание.

Отвечай только через вызов функции.`;

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "user", content: prompt }],
          tools: [{
            type: "function",
            function: {
              name: "lesson_analysis",
              description: "Возвращает анализ урока",
              parameters: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  new_words: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        german: { type: "string" },
                        article: { type: "string" },
                        russian: { type: "string" },
                        example: { type: "string" },
                      },
                      required: ["german", "russian"],
                    },
                  },
                  errors: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        said: { type: "string" },
                        correct: { type: "string" },
                        explanation: { type: "string" },
                      },
                      required: ["said", "correct", "explanation"],
                    },
                  },
                },
                required: ["summary", "new_words", "errors"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "lesson_analysis" } },
        }),
      });

      if (aiRes.ok) {
        const aiData = await aiRes.json();
        const args = aiData.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) {
          const parsed = typeof args === "string" ? JSON.parse(args) : args;
          aiNewWords = parsed.new_words || [];
          aiErrors = parsed.errors || [];
          aiSummary = parsed.summary || "";
        }
      } else if (aiRes.status === 402) {
        throw new Error("AI credits exhausted");
      } else if (aiRes.status === 429) {
        throw new Error("Rate limit, try again later");
      }
    }

    await supabase.from("tutoring_lesson_recordings").update({
      transcript,
      ai_summary: aiSummary,
      ai_new_words: aiNewWords,
      ai_errors: aiErrors,
      ai_processed_at: new Date().toISOString(),
      status: "analyzed",
    }).eq("id", recording_id);

    return new Response(JSON.stringify({
      success: true, transcript_length: transcript.length,
      new_words: aiNewWords.length, errors: aiErrors.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze error:", e);
    const msg = e instanceof Error ? e.message : "Unknown";
    // Best-effort mark failed
    try {
      const { recording_id } = await req.clone().json();
      if (recording_id) {
        const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        await supa.from("tutoring_lesson_recordings").update({ status: "failed" }).eq("id", recording_id);
      }
    } catch {}
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
