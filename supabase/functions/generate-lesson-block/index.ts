import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { lesson, existing_titles = [], block_type = 'exercise', user_prompt } = await req.json();
    if (!lesson || typeof lesson !== 'object') {
      return json({ error: 'lesson required' }, 400);
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'AI gateway not configured' }, 500);

    const typeSpec: Record<string, string> = {
      exercise: '{ "questions": [ { "prompt": string, "options": string[]?, "answer": string, "explanation": string? } ] }  // 4-6 items, mixed cloze/mcq',
      slide_deck: '{ "slides": [ { "title": string, "bullets": string[], "notes": string? } ] }  // 4-6 slides',
      reading: '{ "text": string (150-250 words in target language), "questions": [ { "prompt": string, "answer": string } ] }',
      dialogue: '{ "roles": string[], "lines": [ { "role": string, "text": string, "translation": string? } ] }  // 8-14 lines',
      word_list: '{ "words": [ { "term": string, "translation": string, "example": string? } ] }  // 8-12 items',
      audio: '{ "script": string, "questions": [ { "prompt": string, "answer": string } ] }',
      video: '{ "topic_summary": string, "questions": [ { "prompt": string, "answer": string } ] }',
      game: '{ "game_type": "match"|"sort"|"quiz", "items": any[] }',
    };

    const schema = typeSpec[block_type] || typeSpec.exercise;

    const sys = `You design engaging language-learning micro-content for a school called KLAR.
Return STRICT JSON. No prose, no markdown, no code fences. Just JSON.
Schema:
{
  "block_type": "${block_type}",
  "title": string (concise, in the lesson's target language),
  "duration_min": number (2-15),
  "payload": ${schema}
}
Make it fun, natural, level-appropriate, and DIFFERENT from existing blocks.`;

    const usr = `Lesson context:
- Title: ${lesson.title}
- Topic: ${lesson.topic || '—'}
- Level (CEFR): ${lesson.level}

Existing block titles in this lesson (avoid duplicating):
${existing_titles.slice(0, 20).map((t: string) => `- ${t}`).join('\n') || '(none)'}

Requested block type: ${block_type}
${user_prompt ? `Extra instruction: ${user_prompt}` : ''}

Return ONE JSON object only.`;

    const resp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: usr }],
        response_format: { type: 'json_object' },
      }),
    });

    if (resp.status === 429) return json({ error: 'AI rate limit' }, 429);
    if (resp.status === 402) return json({ error: 'AI credits exhausted' }, 402);
    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: `AI ${resp.status}: ${t.slice(0, 200)}` }, 500);
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? '';
    const parsed = safeParse(raw);
    if (!parsed) return json({ error: 'invalid AI JSON', raw: raw.slice(0, 500) }, 500);

    // Normalize
    const block = {
      block_type: parsed.block_type || block_type,
      title: parsed.title || `AI ${block_type}`,
      duration_min: Number(parsed.duration_min) || 5,
      payload: parsed.payload ?? parsed,
    };

    return json({ block });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function safeParse(raw: string): any | null {
  try { return JSON.parse(raw); } catch {}
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}
