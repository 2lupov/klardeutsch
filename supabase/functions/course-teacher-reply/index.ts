import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const AI_GATEWAY = "https://ai-gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authedClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: authData, error: authErr } = await authedClient.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = authData.user.id;

    const { lessonId, courseId, message, userId } = await req.json();
    if (!lessonId || !message) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Only the owner may query their own chat history
    if (userId && userId !== callerId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const effectiveUserId = callerId;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get lesson context
    const { data: lesson } = await supabase
      .from("course_lessons")
      .select("title, theory, lesson_type, content")
      .eq("id", lessonId)
      .single();

    // Get recent chat history for the authenticated caller only
    const { data: history } = await supabase
      .from("teacher_chat_messages")
      .select("sender, content")
      .eq("user_id", effectiveUserId)
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false })
      .limit(10);

    const chatHistory = (history ?? []).reverse().map((m: any) => ({
      role: m.sender === "student" ? "user" : "assistant",
      content: m.content,
    }));

    const systemPrompt = `Du bist ein freundlicher und geduldiger Deutschlehrer bei KLAR Deutsch.
Du hilfst einem Schüler, der gerade die Lektion "${lesson?.title || "Lektion"}" (Typ: ${lesson?.lesson_type || "video"}) bearbeitet.

Kontext der Lektion: ${(lesson?.theory || "").slice(0, 1000)}

Regeln:
- Antworte auf Deutsch, aber erkläre schwierige Konzepte auch auf Russisch/Ukrainisch wenn nötig
- Sei ermutigend und gib praktische Beispiele
- Korrigiere Fehler sanft mit Erklärungen
- Halte Antworten kurz (2-4 Sätze), außer bei komplexen Erklärungen
- Nutze einfaches Deutsch passend zum Niveau der Lektion`;

    const aiRes = await fetch(AI_GATEWAY, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatHistory,
          { role: "user", content: message },
        ],
        max_tokens: 500,
      }),
    });

    const aiData = await aiRes.json();
    const reply = aiData.choices?.[0]?.message?.content || "Entschuldigung, ich konnte nicht antworten. Bitte versuche es noch einmal.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
