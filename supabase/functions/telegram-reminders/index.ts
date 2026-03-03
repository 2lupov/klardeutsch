import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MESSAGES = {
  inactive: [
    "Hallo! Твой прогресс в KLAR замер. Давай проясним пару новых слов прямо сейчас? 🔥",
    "Hey! Немецкий скучает без тебя. Зайди на 2 минуты — и день не пропал! 💪",
    "Не забывай про KLAR! Каждый день — это +1 к твоему уровню 🚀",
    "Wie geht's? Мы заметили, что тебя давно не было. Время вернуться! 🎓",
    "Пока ты отдыхаешь, артикли не выучат себя сами 😅 Заходи в KLAR!",
  ],
  morning: [
    "Guten Morgen! ☀️ Начни день с 5 новых слов. Это займет всего 1 минуту!",
    "Доброе утро! Пока кофе остывает — выучи пару слов в KLAR ☕📚",
    "Morgens lernt es sich am besten! Заходи в KLAR на пару минут 🌅",
    "Frühstück + KLAR = идеальное утро. Попробуй сегодня! 🥐✨",
    "Утро — лучшее время для мозга. Открой KLAR и удиви себя! 🧠💥",
  ],
  evening: [
    "День почти прошёл, а ты ещё не заходил в KLAR. Зайдёшь? 🌙",
    "Вечерний KLAR — лучший KLAR. 5 минут перед сном, и ты на шаг ближе к цели 🎯",
    "Gute Nacht wird besser после пары упражнений в KLAR 😉",
    "Вечер — время повторить слова дня. Зайди на минутку! 📖🌆",
    "Перед сном — лучшее время закрепить знания. KLAR ждёт тебя! 😴📚",
  ],
  streak: [
    "⚠️ Осторожно! Твой стрик сгорит через пару часов. Спаси его! 🔥",
    "Не дай стрику умереть! Зайди на минутку и сохрани серию 💥",
    "Твоя серия дней под угрозой! Быстрый визит в KLAR спасёт её 🛡️",
    "🔥 Стрик горит! Одно упражнение — и серия спасена!",
    "Achtung! Серия вот-вот оборвётся. Не дай этому случиться! ⏰",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string
) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let userIds: string[] | null = null;
  try {
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      if (body.user_ids && Array.isArray(body.user_ids)) {
        userIds = body.user_ids;
      }
    }
  } catch {}

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) {
      return new Response(
        JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get current hour (UTC) to decide message type
    const currentHour = new Date().getUTCHours();

    // Fetch users with telegram_chat_id, optionally filtered
    let query = supabase
      .from("profiles")
      .select("user_id, telegram_chat_id, last_active, display_name")
      .not("telegram_chat_id", "is", null);

    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data: inactiveUsers, error } = await query;

    if (error) {
      console.error("Error fetching profiles:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!inactiveUsers || inactiveUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No inactive users to notify", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let sent = 0;
    const errors: string[] = [];

    for (const user of inactiveUsers) {
      // Pick message based on time of day (UTC+2 roughly for CET)
      const localHour = (currentHour + 2) % 24;
      let message: string;

      if (localHour >= 6 && localHour < 11) {
        message = pickRandom(MESSAGES.morning);
      } else if (localHour >= 19 && localHour < 23) {
        message = pickRandom(MESSAGES.evening);
      } else {
        message = pickRandom(MESSAGES.inactive);
      }

      // Add personal touch
      const name = user.display_name || "";
      if (name) {
        message = `${name}, ${message.charAt(0).toLowerCase()}${message.slice(1)}`;
      }

      try {
        const result = await sendTelegramMessage(
          botToken,
          user.telegram_chat_id!,
          message
        );
        if (result.ok) {
          sent++;
        } else {
          errors.push(
            `User ${user.user_id}: ${result.description || "unknown error"}`
          );
        }
      } catch (e) {
        errors.push(`User ${user.user_id}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sent} reminders`,
        sent,
        total: inactiveUsers.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
