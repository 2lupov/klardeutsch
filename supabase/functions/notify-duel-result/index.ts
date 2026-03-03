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

    const { challenger_id, opponent_name, challenger_score, opponent_score, challenge_type, level } = await req.json();
    if (!challenger_id) {
      return new Response(JSON.stringify({ error: "challenger_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("user_id", challenger_id)
      .single();

    if (!profile?.telegram_chat_id) {
      return new Response(JSON.stringify({ sent: false, reason: "no_telegram" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = challenge_type === "vocab" ? "Словарный запас" : "Грамматика";
    const name = opponent_name || "Соперник";
    const won = challenger_score > opponent_score;
    const draw = challenger_score === opponent_score;
    const resultEmoji = won ? "🏆" : draw ? "🤝" : "😔";
    const resultText = won ? "Ты победил!" : draw ? "Ничья!" : "Ты проиграл...";

    const message = `⚔️ <b>Дуэль завершена!</b>\n\n${name} принял(а) твой вызов!\n📚 ${typeLabel} · ${level}\n\n📊 Результат: <b>${challenger_score}:${opponent_score}</b>\n${resultEmoji} ${resultText}\n\nЗайди в KLAR → Мини-игры → Дуэли, чтобы посмотреть подробности! 💪`;

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
    console.error("notify-duel-result error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
