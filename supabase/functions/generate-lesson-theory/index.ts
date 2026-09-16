// Generate structured theory blocks for a tutoring lesson (teacher writes a prompt, AI writes theory)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const body = await req.json();
    const lessonId: string = body.lesson_id;
    const prompt: string = String(body.prompt || "").trim();
    const blocks: number = Math.max(2, Math.min(8, Number(body.blocks) || 5));
    const mode: "replace" | "append" = body.mode === "append" ? "append" : "replace";
    if (!lessonId) return json({ error: "lesson_id required" }, 400);

    const { data: lesson } = await supabase
      .from("tutoring_lessons")
      .select("id, teacher_id, level, topic, title, theory")
      .eq("id", lessonId)
      .maybeSingle();
    if (!lesson) return json({ error: "lesson not found" }, 404);

    if (lesson.teacher_id !== user.id) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (!roles?.some((r: any) => r.role === "admin")) return json({ error: "forbidden" }, 403);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `Ти — найкращий викладач німецької. Пишеш КОРОТКУ, кристально зрозумілу теорію для уроку.

ПРАВИЛА:
- Мова пояснень — українська, приклади — німецькою з перекладом.
- РІВНО ${blocks} блоків. Кожен блок = 1 думка: заголовок + 2–5 рядків пояснення + 1–3 приклади.
- Структура кожного блоку в Markdown:
### <емодзі> Заголовок
Коротке пояснення простими словами.
- **Beispiel:** Ich gehe ins Kino. — Я йду в кіно.
- Використовуй таблиці Markdown, коли є форми/відмінки/закінчення.
- Артиклі виділяй жирним: **der**, **die**, **das**.
- Жодної води, жодних вступів «У цьому уроці ми…». Одразу по суті.
- В кінці — блок "### ⚠️ Типові помилки" з 2–3 помилками учнів.

ВІДПОВІДАЙ СУВОРО JSON без Markdown-обгортки:
{ "theory": "повний Markdown усіх блоків" }`;

    const userMsg = `Урок: "${lesson.title}" (рівень ${lesson.level}${lesson.topic ? `, тема: ${lesson.topic}` : ""}).
ЩО ПОТРІБНО ПОЯСНИТИ: ${prompt || lesson.topic || lesson.title}
${mode === "append" && lesson.theory ? `Вже є теорія (НЕ повторюй, продовж і поглиб):\n${String(lesson.theory).slice(0, 2000)}` : ""}
Відповідай тільки JSON.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        reasoning_effort: "low",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMsg },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error", aiRes.status, txt);
      if (aiRes.status === 429) return json({ error: "Забагато запитів до AI. Спробуйте через хвилину." }, 429);
      if (aiRes.status === 402) return json({ error: "Закінчились AI-кредити робочого простору." }, 402);
      if (aiRes.status === 403) return json({ error: "AI недоступний: перевірте ліміти робочого простору." }, 403);
      return json({ error: "Помилка AI-шлюзу. Спробуйте ще раз." }, 502);
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(content); } catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    const theoryText: string = String(parsed.theory || "").trim();
    if (!theoryText) return json({ error: "AI не повернула теорію. Спробуйте ще раз." }, 500);

    const finalTheory = mode === "append" && lesson.theory
      ? `${lesson.theory}\n\n${theoryText}`
      : theoryText;

    const { error: upErr } = await supabase
      .from("tutoring_lessons")
      .update({ theory: finalTheory })
      .eq("id", lessonId);
    if (upErr) return json({ error: upErr.message }, 500);

    return json({ success: true, theory: finalTheory });
  } catch (e: any) {
    console.error(e);
    return json({ error: e.message || "unknown" }, 500);
  }
});
