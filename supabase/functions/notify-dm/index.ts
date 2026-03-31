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
      console.error("TELEGRAM_BOT_TOKEN not set");
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not set" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify JWT
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      console.error("Invalid token:", authErr?.message);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { receiver_id, message_preview } = await req.json();
    console.log("notify-dm called:", { sender: user.id, receiver_id, message_preview: message_preview?.slice(0, 30) });

    if (!receiver_id) {
      return new Response(JSON.stringify({ error: "receiver_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get sender profile
    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single();

    // Get receiver's telegram_chat_id
    const { data: receiver } = await supabase
      .from("profiles")
      .select("telegram_chat_id")
      .eq("user_id", receiver_id)
      .single();

    console.log("Receiver telegram_chat_id:", receiver?.telegram_chat_id);

    if (!receiver?.telegram_chat_id) {
      return new Response(JSON.stringify({ ok: true, sent: false, reason: "no_telegram" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const senderName = sender?.display_name || "Кто-то";
    const preview = (message_preview || "").substring(0, 100);
    const text = `💬 <b>Новое сообщение от ${senderName}</b>\n\n${preview}`;

    console.log("Sending Telegram message to chat_id:", receiver.telegram_chat_id);

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
    console.log("Telegram API response:", JSON.stringify(tgData));

    return new Response(JSON.stringify({ ok: true, sent: tgData.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-dm error:", e.message);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
