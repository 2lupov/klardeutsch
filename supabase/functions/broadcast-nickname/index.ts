import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(JSON.stringify({ error: "no bot token" }), { status: 500 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const message = `🎉 <b>Обновление KLAR!</b>\n\n🆕 Теперь у каждого есть уникальный @никнейм!\n\n📍 Как установить:\n1️⃣ Открой приложение\n2️⃣ Перейди в <b>Профиль</b>\n3️⃣ Нажми на имя и задай свой @никнейм\n\n🎁 За создание никнейма — <b>+50 монет</b> в подарок!\n\n💡 По никнейму тебя смогут найти друзья, отправить подарок или вызвать на дуэль 🤝\n\nОбновляйся и забирай бонус! 🚀`;

    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, telegram_chat_id")
      .not("telegram_chat_id", "is", null);

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }));
    }

    let sent = 0;
    for (const u of users) {
      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: u.telegram_chat_id, text: message, parse_mode: "HTML" }),
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
