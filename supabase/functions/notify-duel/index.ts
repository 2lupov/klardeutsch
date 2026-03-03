import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { opponent_id, challenger_name, challenge_type, level } = await req.json();
    if (!opponent_id) {
      return new Response(JSON.stringify({ error: "opponent_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get opponent's telegram_chat_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id, display_name")
      .eq("user_id", opponent_id)
      .single();

    if (!profile?.telegram_chat_id) {
      return new Response(JSON.stringify({ sent: false, reason: "no_telegram" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = challenge_type === "vocab" ? "Словарный запас" : "Грамматика";
    const name = challenger_name || "Кто-то";
    const message = `⚔️ <b>Вызов на дуэль!</b>\n\n${name} вызывает тебя на дуэль!\n📚 ${typeLabel} · ${level || "A1"}\n\nЗайди в KLAR, чтобы принять вызов! 💪`;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: profile.telegram_chat_id,
        text: message,
        parse_mode: "HTML",
      }),
    });

    const result = await res.json();

    return new Response(JSON.stringify({ sent: result.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-duel error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
