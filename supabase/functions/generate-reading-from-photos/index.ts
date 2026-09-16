import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "Missing LOVABLE_API_KEY" }, 500);

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = await req.json().catch(() => ({}));
    const lessonId = String(body?.lesson_id || "");
    const kind = body?.kind === "grammar" ? "grammar" : "reading";
    const imagePaths: string[] = Array.isArray(body?.image_paths) ? body.image_paths.slice(0, 8) : [];
    const instructions = String(body?.instructions || "").slice(0, 1500);
    const gapsCount = Math.max(4, Math.min(25, Number(body?.gaps_count) || 10));
    const quizCount = Math.max(4, Math.min(20, Number(body?.quiz_count) || 8));
    if (!lessonId || imagePaths.length === 0) return json({ error: "lesson_id and image_paths are required" }, 400);

    const { data: lesson } = await admin
      .from("tutoring_lessons")
      .select("id, teacher_id, level, title")
      .eq("id", lessonId)
      .maybeSingle();
    if (!lesson) return json({ error: "lesson not found" }, 404);
    if (lesson.teacher_id !== user.id) return json({ error: "forbidden" }, 403);

    // Download the uploaded photos and inline them as base64 data URLs
    const imageBlocks: unknown[] = [];
    for (const path of imagePaths) {
      const { data: file, error } = await admin.storage.from("tutoring-materials").download(path);
      if (error || !file) continue;
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const mime = file.type && file.type.startsWith("image/") ? file.type : "image/jpeg";
      imageBlocks.push({ type: "image_url", image_url: { url: `data:${mime};base64,${btoa(bin)}` } });
    }
    if (imageBlocks.length === 0) return json({ error: "could not read uploaded photos" }, 400);

    const level = lesson.level || "A2";
    const focus = kind === "grammar"
      ? "Es ist eine GRAMMATIK-Seite: die Lücken und der Test prüfen die Grammatikformen (Endungen, Artikel, Zeitformen, Kasus)."
      : "Es ist ein LESETEXT: die Lücken prüfen Wortschatz und Textverständnis.";

    const systemPrompt = `Du bist eine Deutschlehrerin und erstellst interaktive Aufgaben aus Fotos von Buchseiten.
Niveau: ${level}. ${focus}

Arbeitsschritte:
1. Lies den deutschen Text auf allen Fotos sorgfältig und in der richtigen Reihenfolge ab (OCR). Korrigiere offensichtliche Scan-Fehler, erfinde aber NICHTS dazu.
2. Gib den vollständigen Text sauber formatiert zurück (Absätze mit \\n\\n, Dialogzeilen jeweils in einer Zeile).
3. Ersetze genau ${gapsCount} sinnvolle Wörter im Text durch Platzhalter {{1}}, {{2}}, … in aufsteigender Reihenfolge.
   Wähle Wörter, die man aus dem Kontext erschließen kann. Nicht zwei Lücken direkt nebeneinander.
4. Für jede Lücke: die richtige Antwort (genau das Wort aus dem Text) und 4 Optionen (die richtige + 3 plausible, ähnliche falsche). Optionen gemischt.
5. Danach einen interaktiven Abschlusstest mit ${quizCount} Fragen zum Text: Verständnisfragen, Wortschatz, Grammatik, richtig/falsch, Reihenfolge-Logik. Jede Frage mit 4 Optionen und kurzer Erklärung auf Ukrainisch.

Antworte NUR mit JSON in diesem Format:
{
  "title": "kurzer deutscher Titel",
  "body": "Text mit {{1}} … Platzhaltern",
  "gaps": [{"n":1,"answer":"Wort","options":["a","b","c","d"],"explanation":"коротке пояснення українською"}],
  "quiz": [{"question":"Frage auf Deutsch","options":["a","b","c","d"],"answer":"a","explanation":"пояснення українською"}]
}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: instructions
                  ? `Zusätzliche Wünsche der Lehrerin: ${instructions}\n\nHier sind die Fotos der Seiten:`
                  : "Hier sind die Fotos der Seiten:",
              },
              ...imageBlocks,
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text().catch(() => "");
      return json({ error: `AI ${aiRes.status}: ${text.slice(0, 400)}` }, aiRes.status === 402 || aiRes.status === 429 ? aiRes.status : 500);
    }

    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || "";
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return json({ error: "AI returned no usable JSON" }, 500);
      parsed = JSON.parse(m[0]);
    }

    const textBody = String(parsed?.body || "").trim();
    if (!textBody) return json({ error: "AI could not read the text from the photos" }, 422);

    const gaps = (Array.isArray(parsed?.gaps) ? parsed.gaps : [])
      .map((g: any, i: number) => {
        const answer = String(g?.answer ?? "").trim();
        let options = (Array.isArray(g?.options) ? g.options : []).map((o: any) => String(o).trim()).filter(Boolean);
        options = Array.from(new Set(options));
        if (answer && !options.includes(answer)) options.unshift(answer);
        return {
          n: Number(g?.n) || i + 1,
          answer,
          options: options.slice(0, 4),
          explanation: g?.explanation ? String(g.explanation).slice(0, 300) : null,
        };
      })
      .filter((g: any) => g.answer && g.options.length >= 2 && textBody.includes(`{{${g.n}}}`));

    const quiz = (Array.isArray(parsed?.quiz) ? parsed.quiz : [])
      .map((q: any) => {
        const question = String(q?.question ?? "").trim();
        const answer = String(q?.answer ?? "").trim();
        let options = (Array.isArray(q?.options) ? q.options : []).map((o: any) => String(o).trim()).filter(Boolean);
        options = Array.from(new Set(options));
        if (answer && !options.includes(answer)) options.unshift(answer);
        return {
          question,
          options: options.slice(0, 4),
          answer,
          explanation: q?.explanation ? String(q.explanation).slice(0, 300) : null,
        };
      })
      .filter((q: any) => q.question && q.answer && q.options.length >= 2);

    const { count } = await admin
      .from("tutoring_reading_tasks")
      .select("id", { count: "exact", head: true })
      .eq("lesson_id", lessonId);

    const { data: inserted, error: insErr } = await admin
      .from("tutoring_reading_tasks")
      .insert({
        lesson_id: lessonId,
        kind,
        title: String(parsed?.title || (kind === "grammar" ? "Grammatik" : "Lesetext")).slice(0, 160),
        level,
        images: imagePaths,
        body: textBody,
        gaps,
        quiz,
        created_by: user.id,
        sort_order: count || 0,
      })
      .select()
      .single();
    if (insErr) return json({ error: insErr.message }, 500);

    return json({ success: true, task: inserted });
  } catch (e) {
    return json({ error: String((e as Error)?.message || e) }, 500);
  }
});
