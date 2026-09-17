import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { blockCors, jsonResponse } from "../_shared/lesson-blocks.ts";

/** Транскрибує голосову відповідь учня і оцінює вимову. */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: blockCors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);

    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await anon.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const b64 = String(body?.audio_base64 ?? "");
    if (!b64) return jsonResponse({ error: "audio_base64 is required" }, 400);
    const mime = String(body?.mime ?? "audio/webm");
    const reference = String(body?.reference ?? "").slice(0, 1000);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "AI не налаштований" }, 500);

    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    if (bytes.length < 2048) return jsonResponse({ error: "Запис занадто короткий" }, 400);
    if (bytes.length > 13 * 1024 * 1024) return jsonResponse({ error: "Запис завеликий" }, 400);

    const ext = mime.includes("mp4") ? "m4a" : mime.includes("wav") ? "wav" : mime.includes("mpeg") ? "mp3" : "webm";
    const form = new FormData();
    form.append("model", "google/gemini-3.5-transcribe");
    form.append("language", "de");
    form.append("file", new Blob([bytes], { type: mime.startsWith("audio/") ? mime : "audio/webm" }), `speech.${ext}`);

    const sttRes = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: form,
    });
    if (!sttRes.ok) {
      const details = await sttRes.text();
      console.error(`STT error [${sttRes.status}]: ${details.slice(0, 300)}`);
      if (sttRes.status === 402) return jsonResponse({ error: "Закінчились AI-кредити робочого простору." }, 402);
      if (sttRes.status === 429) return jsonResponse({ error: "Забагато запитів. Спробуйте за хвилину." }, 429);
      return jsonResponse({ error: `Не вдалося розпізнати мовлення (код ${sttRes.status})` }, 502);
    }
    const sttData = await sttRes.json();
    const transcript = String(sttData?.text ?? "").trim();
    if (!transcript) return jsonResponse({ ok: true, transcript: "", score: 0, problem_words: [] });

    const evalRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Lovable-API-Key": LOVABLE_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content:
              'Ти — викладач німецької. Оціни усну відповідь учня. Поверни ЛИШЕ JSON: {"score": 0-100, "problem_words": ["слово"], "feedback": "коротко українською"}. score — правильність і природність німецької (граматика, лексика, повнота відповіді). problem_words — до 6 німецьких слів, які варто відпрацювати.',
          },
          {
            role: "user",
            content: `Завдання: ${reference || "усна відповідь німецькою"}\nЩо сказав учень: ${transcript}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    let score = 0;
    let problem: string[] = [];
    let feedback = "";
    if (evalRes.ok) {
      const d = await evalRes.json();
      try {
        const parsed = JSON.parse(d?.choices?.[0]?.message?.content ?? "{}");
        score = Math.max(0, Math.min(100, Number(parsed?.score) || 0));
        problem = Array.isArray(parsed?.problem_words) ? parsed.problem_words.slice(0, 6).map((w: any) => String(w).slice(0, 60)) : [];
        feedback = String(parsed?.feedback ?? "").slice(0, 400);
      } catch {
        /* лишаємо нулі */
      }
    }

    return jsonResponse({ ok: true, transcript, score, problem_words: problem, feedback });
  } catch (e) {
    console.error("score-pronunciation error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
