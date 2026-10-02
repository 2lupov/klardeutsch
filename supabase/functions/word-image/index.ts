import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

// Картинка к слову, которое учишь. Источники — Openverse (агрегатор
// свободных фото, работает без API-ключа) и Wikimedia Commons (запасной,
// когда Openverse не отвечает или упёрся в дневной лимит анонимных
// запросов). Оба не требуют ключа. Запрос ведём по-английски (поле `en`
// из ответа ИИ) — по-русски или по-нидерландски поиск находит заметно хуже.
// Атрибуция автора возвращаем вместе с url и показываем в UI мелким текстом.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function fromOpenverse(q: string): Promise<{ url: string; credit: string } | null> {
  const res = await fetch(
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}&page_size=1&license_type=all&size=medium`,
    { headers: { "User-Agent": "KLAR-Dutch/1.0 (learning app)" } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data?.results?.[0];
  if (!photo?.url) return null;
  const who = photo.creator ? `${photo.creator} / Openverse` : "Openverse";
  return { url: photo.url, credit: `Фото: ${who}` };
}

async function fromCommons(q: string): Promise<{ url: string; credit: string } | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `filetype:bitmap ${q}`,
    gsrlimit: "1",
    gsrnamespace: "6",
    prop: "imageinfo",
    iiprop: "url",
    iiurlwidth: "400",
  });
  const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
    headers: { "User-Agent": "KLAR-Dutch/1.0 (learning app)" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data?.query?.pages;
  const page = pages && typeof pages === "object" ? Object.values(pages)[0] : null;
  const thumb = page?.imageinfo?.[0]?.thumburl as string | undefined;
  if (!thumb) return null;
  return { url: thumb, credit: "Фото: Wikimedia Commons" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "Unauthorized" });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return json(401, { error: "Unauthorized" });
    }

    const { query } = await req.json();
    const q = String(query || "").trim().slice(0, 100);
    if (!q) return json(400, { error: "Пустой запрос" });

    // Openverse → Wikimedia Commons, оба без ключа.
    let hit: { url: string; credit: string } | null = null;
    try { hit = await fromOpenverse(q); } catch (e) { console.error("openverse:", e); }
    if (!hit) {
      try { hit = await fromCommons(q); } catch (e) { console.error("commons:", e); }
    }
    return json(200, hit ? { url: hit.url, credit: hit.credit } : { url: null });
  } catch (e) {
    console.error("word-image error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Unknown error" });
  }
});
