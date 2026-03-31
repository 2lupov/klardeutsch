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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { friend_id } = await req.json();
    if (!friend_id) {
      return new Response(JSON.stringify({ error: "friend_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender name
    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    // Get receiver telegram_chat_id & lang
    const { data: receiver } = await supabase
      .from("profiles")
      .select("telegram_chat_id, preferred_lang")
      .eq("user_id", friend_id)
      .single();

    if (!botToken || !receiver?.telegram_chat_id) {
      return new Response(JSON.stringify({ ok: true, sent: false, reason: "no_telegram" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = sender?.display_name || "Кто-то";
    const isUk = receiver.preferred_lang === "uk";

    const text = `👋 <b>${isUk ? "Нова заявка в друзі" : "Новая заявка в друзья"}!</b>\n\n@${senderName} ${isUk ? "хоче додати тебе в друзі" : "хочет добавить тебя в друзья"}\n\n${isUk ? "Відкрий додаток, щоб прийняти або відхилити" : "Открой приложение, чтобы принять или отклонить"} 🤝`;

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: receiver.telegram_chat_id,
        text,
        parse_mode: "HTML",
      }),
    });

    const tgData = await tgRes.json();

    return new Response(JSON.stringify({ ok: true, sent: tgData.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-friend-request error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
