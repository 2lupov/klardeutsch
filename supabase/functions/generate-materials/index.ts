// Generate teaching materials (theory / questions / words) into a materials folder
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const KINDS = ["text", "question", "word"];

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

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "admin" || r.role === "teacher");
    if (!allowed) return json({ error: "forbidden" }, 403);

    const body = await req.json();
    const folderId: string = body.folder_id;
    const prompt: string = String(body.prompt || "").trim();
    const bookText: string = String(body.book_text || "").trim();
    const level: string = String(body.level || "B1");
    const count = Math.max(1, Math.min(40, Number(body.count) || 10));
    const kinds: string[] = Array.isArray(body.kinds) && body.kinds.length
      ? body.kinds.filter((k: string) => KINDS.includes(k))
      : ["question"];

    if (!folderId) return json({ error: "folder_id required" }, 400);

    const { data: folder } = await supabase
      .from("material_folders")
      .select("id, name, category, level, owner_id")
      .eq("id", folderId)
      .maybeSingle();
    if (!folder) return json({ error: "folder not found" }, 404);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `Ти — досвідчений викладач німецької мови. Готуєш матеріали для банку завдань викладача.
Типи елементів:
- "text" — теорія / правило / текст для читання чи слухання. content: { "body": "..." }
- "question" — питання. content: { "question": "...", "options": ["4 варіанти або порожній масив"], "correct": "правильна відповідь", "explanation": "коротке пояснення українською" }
- "word" — слово/фраза. content: { "term": "нім. слово (з артиклем для іменників)", "article": "der|die|das|", "translation": "укр. переклад", "example": "нім. приклад речення" }

Правила:
- Матеріали ЖИВІ й практичні, без нудних шаблонів; різноманітні формати питань (вибір, пропуск ___, переклад, порядок слів, виправлення помилки).
- Заголовок (title) короткий і зрозумілий, українською або німецькою.
- Для "question" з варіантами правильна відповідь НЕ завжди перша.
- Пояснення — українською.

ВІДПОВІДАЙ СУВОРО валідним JSON без Markdown:
{ "items": [ { "kind": "text|question|word", "title": "...", "content": { ... } } ] }`;

    const userMsg = `Папка: "${folder.name}" (категорія: ${folder.category}).
Рівень: ${level}.
${bookText ? `МАТЕРІАЛ ІЗ КНИГИ (використай саме його як основу, збережи логіку й лексику):\n${bookText.slice(0, 12000)}\n` : ""}
ЗАВДАННЯ ВИКЛАДАЧА: ${prompt || "Створи корисні матеріали за темою папки."}

Створи РІВНО ${count} елементів, типи тільки: ${kinds.join(", ")}. Розподіли типи рівномірно. Тільки JSON.`;

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
      if (aiRes.status === 429) return json({ error: "Перевищено ліміт запитів, спробуйте через хвилину" }, 429);
      if (aiRes.status === 402) return json({ error: "Закінчились AI-кредити" }, 402);
      throw new Error("AI gateway error");
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content || "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const list: any[] = (Array.isArray(parsed.items) ? parsed.items : [])
      .filter((i: any) => i && KINDS.includes(i.kind) && i.content && typeof i.content === "object");

    if (!list.length) return json({ error: "AI не повернув матеріали, спробуйте ще раз" }, 502);

    const base = Date.now();
    const rows = list.map((i: any, idx: number) => ({
      folder_id: folderId,
      owner_id: user.id,
      kind: i.kind,
      title: (i.title || null) as string | null,
      content: i.content,
      level,
      tags: [] as string[],
      source: bookText ? "book" : "ai",
      sort_order: (base % 1000000) + idx,
    }));

    const { data: inserted, error: insErr } = await supabase
      .from("material_items")
      .insert(rows)
      .select("*");
    if (insErr) throw insErr;

    return json({ items: inserted, count: inserted?.length || 0 });
  } catch (e: any) {
    console.error("generate-materials error", e);
    return json({ error: e.message || "unknown error" }, 500);
  }
});
