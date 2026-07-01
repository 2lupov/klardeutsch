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

    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const authed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData, error: userErr } = await authed.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const callerId = userData.user.id;

    const { challenger_id, challenger_score, opponent_score, challenge_type, level } = await req.json();
    if (!challenger_id) {
      return new Response(JSON.stringify({ error: "challenger_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify a real challenge exists where caller is the opponent
    const { data: challenge } = await supabase
      .from("challenges")
      .select("id")
      .eq("challenger_id", challenger_id)
      .eq("opponent_id", callerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!challenge) {
      return new Response(JSON.stringify({ error: "No challenge found between users" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up caller's real display name (opponent from the challenger's perspective)
    const { data: opponentProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", callerId)
      .maybeSingle();
    const name = opponentProfile?.display_name || "Соперник";

    // Look up challenger's Telegram chat
    let chatId: number | null = null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("user_id", challenger_id)
      .single();

    if (profile?.telegram_chat_id) {
      chatId = profile.telegram_chat_id;
    } else {
      const { data: demo } = await supabase
        .from("demo_leaderboard")
        .select("telegram_chat_id")
        .eq("id", challenger_id)
        .single();

      if (demo?.telegram_chat_id) {
        chatId = demo.telegram_chat_id;
      }
    }

    if (!chatId) {
      return new Response(JSON.stringify({ sent: false, reason: "no_telegram" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = challenge_type === "vocab" ? "Словарный запас" : "Грамматика";
    const won = challenger_score > opponent_score;
    const draw = challenger_score === opponent_score;
    const resultEmoji = won ? "🏆" : draw ? "🤝" : "😔";
    const resultText = won ? "Ты победил!" : draw ? "Ничья!" : "Ты проиграл...";

    const message = `⚔️ <b>Дуэль завершена!</b>\n\n${name} принял(а) твой вызов!\n📚 ${typeLabel} · ${level}\n\n📊 Результат: <b>${challenger_score}:${opponent_score}</b>\n${resultEmoji} ${resultText}\n\nЗайди в KLAR → Мини-игры → Дуэли, чтобы посмотреть подробности! 💪`;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
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
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
