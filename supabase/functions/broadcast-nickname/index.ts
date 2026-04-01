import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

Deno.serve(async () => {
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!botToken) {
      return new Response(JSON.stringify({ error: "no bot token" }), { status: 500 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find users WITHOUT a nickname but WITH telegram_chat_id
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, telegram_chat_id, display_name, nickname")
      .not("telegram_chat_id", "is", null)
      .or("nickname.is.null,nickname.eq.");

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ sent: 0, reason: "all users have nicknames" }));
    }

    const message = `🔔 <b>Напоминание!</b>\n\nУ тебя ещё нет уникального @никнейма в KLAR.\n\n📍 Зайди в <b>Профиль</b>, нажми на своё имя и задай никнейм.\n\n🎁 За это получишь <b>+50 монет</b>!\n\n💡 По никнейму друзья смогут найти тебя, отправить подарок или вызвать на дуэль 🤝`;

    const webAppUrl = "https://klardeutsch.lovable.app/profile";

    let sent = 0;
    for (const u of users) {
      try {
        // Use direct Telegram API (bot token) for inline keyboard support
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: u.telegram_chat_id,
            text: message,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: "👤 Открыть профиль",
                    web_app: { url: webAppUrl },
                  },
                ],
              ],
            },
          }),
        });
        const data = await res.json();
        if (data.ok) sent++;
      } catch (_) {}
    }

    return new Response(JSON.stringify({ sent, total: users.length }));
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
});
