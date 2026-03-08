import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

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

    const isUk = lang === "uk";

    const feedbackLang = isUk ? "українською" : "на русском";
    const correctionLabel = isUk ? "Виправлення" : "Исправления";
    const noErrors = isUk ? "Все правильно! ✅" : "Всё правильно! ✅";
    const newWordsLabel = isUk ? "Нові слова" : "Новые слова";
    const hintLabel = isUk ? "Підказка" : "Подсказка";

    const systemPrompt = `Du bist ein freundlicher Gesprächspartner für Deutschlernende auf Niveau ${level || "A1"}.
Thema des Gesprächs: ${topic || "Allgemein"}.

REGELN:
1. Antworte immer auf Deutsch, angepasst an das Niveau ${level || "A1"}.
2. Nach deiner Antwort auf Deutsch, füge IMMER einen Block "---" hinzu, gefolgt von (${feedbackLang}):
   - 🔍 **${correctionLabel}**: Wenn der Benutzer Fehler gemacht hat, korrigiere sie ${feedbackLang} mit Erklärung. Wenn keine Fehler, schreibe "${noErrors}"
   - 💡 **${newWordsLabel}**: Liste 1-3 neue Wörter aus deiner Antwort mit Übersetzung ${feedbackLang}
   - 🗣️ **${hintLabel}**: Schlage ${feedbackLang} vor, was der Benutzer als nächstes sagen könnte (1-2 Optionen)
3. Halte deine deutschen Antworten kurz (2-4 Sätze).
4. Stelle am Ende deiner deutschen Antwort eine Frage, um das Gespräch fortzusetzen.
5. Sei ermutigend und hilfsbereit.
6. WICHTIG: Alle Erklärungen, Korrekturen und Hinweise MÜSSEN ${feedbackLang} geschrieben werden!`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: isUk ? "Забагато запитів, спробуйте пізніше." : "Слишком много запросов, попробуйте позже." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: isUk ? "Перевищено ліміт AI-запитів." : "Превышен лимит AI-запросов." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: isUk ? "Помилка AI" : "Ошибка AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-dialogue error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
