import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_CHAT_ID = "5109895086";

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { email, method, timestamp, userAgent } = await req.json();

    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not set");
      return new Response(JSON.stringify({ ok: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = timestamp
      ? new Date(timestamp).toLocaleString("ru-RU", { timeZone: "Europe/Berlin" })
      : new Date().toLocaleString("ru-RU", { timeZone: "Europe/Berlin" });

    const methodLabel = method === "telegram" ? "🔵 Telegram" : method === "otp" ? "📧 Email OTP" : method || "неизвестно";

    const text = [
      `🆕 <b>Новый пользователь!</b>`,
      ``,
      `📧 <b>Email:</b> ${email || "—"}`,
      `🔑 <b>Метод:</b> ${methodLabel}`,
      `🕐 <b>Время:</b> ${now} (Berlin)`,
      `📱 <b>UA:</b> <code>${(userAgent || "—").slice(0, 100)}</code>`,
    ].join("\n");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );

    const tgData = await tgRes.json();
    console.log("Telegram notify result:", tgData.ok);

    return new Response(JSON.stringify({ ok: tgData.ok }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-new-user error:", e);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
