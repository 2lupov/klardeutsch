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

    // Require authentication — only real challengers may send duel notifications
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

    const { opponent_id, challenge_type, level } = await req.json();
    if (!opponent_id) {
      return new Response(JSON.stringify({ error: "opponent_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify a real challenge exists between caller (challenger) and opponent
    const { data: challenge } = await supabase
      .from("challenges")
      .select("id")
      .eq("challenger_id", callerId)
      .eq("opponent_id", opponent_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!challenge) {
      return new Response(JSON.stringify({ error: "No challenge found between users" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up caller's real display name server-side (drop client-supplied name)
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", callerId)
      .maybeSingle();
    const name = callerProfile?.display_name || "Соперник";

    // Look up opponent's Telegram chat
    let chatId: number | null = null;
    let opponentName: string | null = null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("telegram_chat_id, display_name")
      .eq("user_id", opponent_id)
      .single();

    if (profile?.telegram_chat_id) {
      chatId = profile.telegram_chat_id;
      opponentName = profile.display_name;
    } else {
      const { data: demo } = await supabase
        .from("demo_leaderboard")
        .select("telegram_chat_id, display_name")
        .eq("id", opponent_id)
        .single();

      if (demo?.telegram_chat_id) {
        chatId = demo.telegram_chat_id;
        opponentName = demo.display_name;
      }
    }

    if (!chatId) {
      return new Response(JSON.stringify({ sent: false, reason: "no_telegram" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = challenge_type === "vocab" ? "Словарный запас" : "Грамматика";
    const demoLabel = opponentName ? ` (→ ${opponentName})` : "";
    const message = `⚔️ <b>Вызов на дуэль!</b>${demoLabel}\n\n${name} вызывает на дуэль!\n📚 ${typeLabel} · ${level || "A1"}\n\nЗайди в KLAR, чтобы принять вызов! 💪`;

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
    console.error("notify-duel error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
