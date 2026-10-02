import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

// Картинка к слову, которое учишь. Источник — Pexels (бесплатный API, не
// требует хотлинк-ограничений, только атрибуцию автора — её возвращаем
// вместе с url и показываем в UI мелким текстом, как того требует их
// лицензия). Запрос ведём по-английски (поле `en` из ответа ИИ) — по-русски
// или по-нидерландски Pexels находит заметно хуже.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { query } = await req.json();
    const q = String(query || "").trim().slice(0, 100);
    if (!q) return new Response(JSON.stringify({ error: "Пустой запрос" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const PEXELS_API_KEY = Deno.env.get("PEXELS_API_KEY");
    if (!PEXELS_API_KEY) {
      return new Response(JSON.stringify({ error: "PEXELS_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=1&orientation=square`, {
      headers: { Authorization: PEXELS_API_KEY },
    });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Pexels error ${res.status}` }), { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const photo = data?.photos?.[0];
    if (!photo) {
      return new Response(JSON.stringify({ url: null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(
      JSON.stringify({ url: photo.src?.medium as string, credit: `Фото: ${photo.photographer} / Pexels` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("word-image error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
