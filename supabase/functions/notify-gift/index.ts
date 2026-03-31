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

    const { receiver_id, gift_name, gift_emoji, message } = await req.json();

    if (!receiver_id || !gift_name) {
      return new Response(JSON.stringify({ error: "receiver_id and gift_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender profile
    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    // Get receiver profile
    const { data: receiver } = await supabase
      .from("profiles")
      .select("telegram_chat_id, preferred_lang")
      .eq("user_id", receiver_id)
      .single();

    const senderName = sender?.display_name || "Кто-то";
    const receiverLang = receiver?.preferred_lang || "ru";

    // 1. Send in-app DM about the gift
    const dmContent = gift_emoji + " " + (
      receiverLang === "uk"
        ? `${senderName} надіслав тобі подарунок: ${gift_name}!`
        : `${senderName} отправил тебе подарок: ${gift_name}!`
    ) + (message ? `\n💬 «${message}»` : "");

    await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id,
      content: dmContent,
    });

    // 2. Send Telegram notification if available
    let telegramSent = false;
    if (botToken && receiver?.telegram_chat_id) {
      const text = `🎁 <b>${
        receiverLang === "uk" ? "Новий подарунок" : "Новый подарок"
      }!</b>\n\n${gift_emoji} <b>${gift_name}</b>\n${
        receiverLang === "uk" ? "Від" : "От"
      }: ${senderName}${message ? `\n💬 «${message}»` : ""}\n\n${
        receiverLang === "uk" ? "Відкрий додаток, щоб переглянути!" : "Открой приложение, чтобы посмотреть!"
      }`;

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
      telegramSent = tgData.ok === true;
      console.log("Gift Telegram notification:", tgData.ok);
    }

    return new Response(JSON.stringify({ ok: true, dm_sent: true, telegram_sent: telegramSent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-gift error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
