// Teacher's personal AI assistant per student.
// Streams Lovable AI responses with full student context (level, age, kid mode, notes, recent lessons).
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
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const studentId: string = body.student_id;
    const userMessage: string = (body.message || "").trim();
    if (!studentId || !userMessage) {
      return new Response(JSON.stringify({ error: "student_id and message required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the requester is teacher of this student
    const { data: rel } = await admin
      .from("tutoring_relationships")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("student_id", studentId)
      .eq("status", "active")
      .maybeSingle();
    if (!rel) {
      return new Response(JSON.stringify({ error: "Not your student" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get-or-create chat
    let { data: chat } = await admin
      .from("teacher_ai_chats")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (!chat) {
      const { data: created, error: createErr } = await admin
        .from("teacher_ai_chats")
        .insert({ teacher_id: user.id, student_id: studentId, title: "AI assistant" })
        .select("id")
        .single();
      if (createErr) throw createErr;
      chat = created;
    }
    const chatId = chat!.id as string;

    // Load student context
    const [{ data: student }, { data: lessons }, { data: history }] = await Promise.all([
      admin.from("profiles")
        .select("display_name, age, is_kid, recommended_level, learning_goal, preferred_lang")
        .eq("user_id", studentId).maybeSingle(),
      admin.from("tutoring_lessons")
        .select("title, level, topic, scheduled_at")
        .eq("teacher_id", user.id).eq("student_id", studentId)
        .order("scheduled_at", { ascending: false }).limit(5),
      admin.from("teacher_ai_messages")
        .select("role, content")
        .eq("chat_id", chatId)
        .order("created_at", { ascending: true })
        .limit(40),
    ]);

    const ageInfo = student?.age ? `${student.age} років` : "не вказано";
    const kidMode = student?.is_kid ? "ТАК — учень дитина 9-12 років, відповідай простою мовою з емодзі!" : "ні (дорослий)";
    const level = student?.recommended_level || "A1";
    const goal = student?.learning_goal || "не вказано";
    const lessonsList = (lessons || []).length
      ? (lessons || []).map((l: any) => `- ${l.title || "(без назви)"} | рівень ${l.level} | тема: ${l.topic || "—"}`).join("\n")
      : "(уроків ще не було)";

    const systemPrompt = `Ти — особистий AI-асистент для викладача німецької мови. Твоя роль:
1. Допомагати викладачу **відповідати на питання учня під час уроку** (граматика, лексика, нюанси).
2. Генерувати **додаткові завдання, вправи, приклади** на льоту.
3. Пропонувати ідеї для домашки, пояснення, мнемоніки.
4. Адаптувати все під рівень і вік КОНКРЕТНОГО учня.

📋 КОНТЕКСТ УЧНЯ:
- Ім'я: ${student?.display_name || "Учень"}
- Вік: ${ageInfo}
- Дитячий режим: ${kidMode}
- Рівень: ${level}
- Ціль навчання: ${goal}

📚 ОСТАННІ УРОКИ З ЦИМ УЧНЕМ:
${lessonsList}

⚙️ ПРАВИЛА:
- Відповідай російською (або українською якщо викладач питає укр).
- Німецькі приклади виділяй **жирним**.
- Будь конкретним і коротким — викладач читає прямо на уроці.
- Якщо просять вправу — давай готову вправу з відповіддю.
- ${student?.is_kid ? "🧒 УЧЕНЬ — ДИТИНА: давай прості слова, короткі речення (3-6 слів), багато емодзі, ігрові приклади (тварини, іграшки, їжа). НЕ використовуй терміни 'Akkusativ', 'Konjunktiv'." : "Можеш використовувати граматичні терміни."}
- Підтримуй контекст попередніх повідомлень у цьому чаті.

Використовуй Markdown: **bold**, *italic*, списки, > цитати, \`code\` для слів.`;

    // Save user message before calling AI
    await admin.from("teacher_ai_messages").insert({
      chat_id: chatId, role: "user", content: userMessage,
    });

    const aiMessages = [
      { role: "system", content: systemPrompt },
      ...(history || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: userMessage },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: aiMessages,
        stream: true,
      }),
    });

    if (!aiRes.ok) {
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Спробуйте за хвилину." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits закінчились. Поповніть в Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiRes.text();
      console.error("AI gateway error:", aiRes.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee the stream: forward to client, accumulate to save assistant message
    let assistantText = "";
    const decoder = new TextDecoder();
    const transform = new TransformStream({
      async transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        // Try to extract content deltas to accumulate
        for (const line of text.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const parsed = JSON.parse(json);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) assistantText += c;
          } catch {/* ignore */}
        }
        controller.enqueue(chunk);
      },
      async flush() {
        if (assistantText.trim()) {
          await admin.from("teacher_ai_messages").insert({
            chat_id: chatId, role: "assistant", content: assistantText,
          });
          await admin.from("teacher_ai_chats").update({ updated_at: new Date().toISOString() })
            .eq("id", chatId);
        }
      },
    });

    return new Response(aiRes.body!.pipeThrough(transform), {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "x-chat-id": chatId,
      },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
