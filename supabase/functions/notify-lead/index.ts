import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ADMIN_CHAT_ID = "5109895086";

const esc = (v: unknown) =>
  String(v ?? "—")
    .slice(0, 200)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) {
      console.error("TELEGRAM_BOT_TOKEN not set");
      return new Response(JSON.stringify({ ok: false, error: "bot token missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const utm = [body.utm_source, body.utm_medium, body.utm_campaign].filter(Boolean).join(" / ");

    const text = [
      "🎯 <b>Нова заявка «Клар»</b>",
      "",
      `👤 <b>Імʼя:</b> ${esc(body.name)}`,
      `📞 <b>Телефон:</b> ${esc(body.phone)}`,
      `✈️ <b>Telegram:</b> ${body.telegram ? "@" + esc(body.telegram) : "—"}`,
      `📧 <b>Пошта:</b> ${esc(body.email)}`,
      `📚 <b>Рівень:</b> ${esc(body.level)}`,
      `🎁 <b>Знижка:</b> ${esc(body.discount)}`,
      `🔗 <b>UTM:</b> ${utm ? esc(utm) : "—"}`,
      `🕐 ${new Date().toLocaleString("uk-UA", { timeZone: "Europe/Kyiv" })} (Kyiv)`,
    ].join("\n");

    const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: ADMIN_CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    const tgData = await tgRes.json();
    if (!tgRes.ok || !tgData.ok) {
      console.error(`Telegram sendMessage failed [${tgRes.status}]:`, JSON.stringify(tgData));
      return new Response(JSON.stringify({ ok: false, status: tgRes.status, details: tgData }), {
        status: tgRes.status === 200 ? 502 : tgRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("notify-lead error:", e);
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
