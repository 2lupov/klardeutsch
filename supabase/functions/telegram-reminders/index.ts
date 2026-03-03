import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ─── Мотивационные сообщения ─── */
const MOTIVATION = {
  morning: {
    ru: [
      "Guten Morgen! ☀️ Новый день — новые слова. Открой KLAR и начни с 5 минут!",
      "Доброе утро! Утро — лучшее время для мозга. Пара слов за кофе? ☕📚",
      "Morgens lernt es sich am besten! Сегодня отличный день для немецкого 🌅",
      "Frühstück + немецкий = идеальное утро. Versuch's mal! 🥐✨",
      "Доброе утро! Маленький шаг каждый день — и результат не заставит себя ждать 🧠💪",
      "Guten Morgen! Один урок утром заряжает на весь день. Probier es! 🚀",
      "Утренний немецкий — самый продуктивный. Открой KLAR и удиви себя! 🌞",
    ],
    uk: [
      "Guten Morgen! ☀️ Новий день — нові слова. Відкрий KLAR і почни з 5 хвилин!",
      "Доброго ранку! Ранок — найкращий час для мозку. Пара слів за кавою? ☕📚",
      "Morgens lernt es sich am besten! Сьогодні чудовий день для німецької 🌅",
      "Frühstück + німецька = ідеальний ранок. Versuch's mal! 🥐✨",
      "Доброго ранку! Маленький крок кожен день — і результат не забариться 🧠💪",
      "Guten Morgen! Один урок вранці заряджає на весь день. Probier es! 🚀",
      "Ранкова німецька — найпродуктивніша. Відкрий KLAR і здивуй себе! 🌞",
    ],
  },
  afternoon: {
    ru: [
      "Добрый день! Перерыв — отличный момент выучить пару фраз 🎯",
      "Mittagspause? Идеальное время для быстрого урока в KLAR! ☕",
      "День в разгаре — а немецкий ждёт! 5 минут сделают разницу 📖",
      "Nachmittags lernen ist auch super! Заглянёшь в KLAR? 🌤️",
      "Добрый день! Даже 3 минуты немецкого — это прогресс. Du schaffst das! 💪",
      "Маленькая практика днём — и слова запоминаются надолго 🧩",
      "Halbzeit! Половина дня позади — самое время для немецкого перерыва 🎓",
    ],
    uk: [
      "Добрий день! Перерва — чудовий момент вивчити кілька фраз 🎯",
      "Mittagspause? Ідеальний час для швидкого уроку в KLAR! ☕",
      "День у розпалі — а німецька чекає! 5 хвилин зроблять різницю 📖",
      "Nachmittags lernen ist auch super! Зазирнеш у KLAR? 🌤️",
      "Добрий день! Навіть 3 хвилини німецької — це прогрес. Du schaffst das! 💪",
      "Маленька практика вдень — і слова запам'ятовуються надовго 🧩",
      "Halbzeit! Половина дня позаду — саме час для німецької перерви 🎓",
    ],
  },
  evening: {
    ru: [
      "Добрый вечер! Вечер — время закрепить знания. Пара минут в KLAR? 🌙",
      "Вечерний немецкий — самый уютный. Открой KLAR перед отдыхом 📖🌆",
      "Guten Abend! Повтори пару слов — и день прошёл не зря ✨",
      "Вечер — лучшее время для повторения. KLAR поможет! 📚",
      "Schönen Abend! Немного практики вечером — и прогресс гарантирован 🎯",
      "Вечерняя минутка немецкого — отличная привычка. Попробуй! 🌟",
      "Abendzeit ist Lernzeit! Заглянёшь на минутку? 😊",
    ],
    uk: [
      "Добрий вечір! Вечір — час закріпити знання. Пара хвилин у KLAR? 🌙",
      "Вечірня німецька — найзатишніша. Відкрий KLAR перед відпочинком 📖🌆",
      "Guten Abend! Повтори кілька слів — і день минув не дарма ✨",
      "Вечір — найкращий час для повторення. KLAR допоможе! 📚",
      "Schönen Abend! Трохи практики ввечері — і прогрес гарантований 🎯",
      "Вечірня хвилинка німецької — чудова звичка. Спробуй! 🌟",
      "Abendzeit ist Lernzeit! Зазирнеш на хвилинку? 😊",
    ],
  },
};

/* ─── Сообщения для неактивных ─── */
const INACTIVE_MESSAGES = {
  ru: [
    "Привет! В KLAR появились новые материалы — загляни, когда будет минутка 📚",
    "Hallo! Немецкий ждёт тебя. Даже 2 минуты — это уже шаг вперёд 🚶",
    "Мы соскучились! В KLAR есть кое-что новое для тебя. Заглянёшь? ✨",
    "Hey! Каждый маленький шаг приближает к цели. KLAR всегда рядом 💪",
    "Привет! Давно не виделись. Открой KLAR — там тебя ждут новые слова 🌱",
    "Schritt für Schritt — шаг за шагом. KLAR поможет не терять темп 🎯",
    "Привет! Знаешь, даже 1 минута практики в день — это прогресс. Попробуй! 😊",
  ],
  uk: [
    "Привіт! У KLAR з'явилися нові матеріали — зазирни, коли буде хвилинка 📚",
    "Hallo! Німецька чекає на тебе. Навіть 2 хвилини — це вже крок уперед 🚶",
    "Ми сумували! У KLAR є дещо нове для тебе. Зазирнеш? ✨",
    "Hey! Кожен маленький крок наближає до мети. KLAR завжди поруч 💪",
    "Привіт! Давно не бачилися. Відкрий KLAR — там на тебе чекають нові слова 🌱",
    "Schritt für Schritt — крок за кроком. KLAR допоможе не втрачати темп 🎯",
    "Привіт! Знаєш, навіть 1 хвилина практики на день — це прогрес. Спробуй! 😊",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Determine local hour (UTC+2 for CET/Berlin)
    const currentHour = new Date().getUTCHours();
    const localHour = (currentHour + 2) % 24;

    // 🚫 НОЧЬ (23:00 — 07:59) — никаких сообщений
    if (localHour >= 23 || localHour < 8) {
      return new Response(
        JSON.stringify({ message: "Night time — no messages sent", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine time slot
    let timeSlot: "morning" | "afternoon" | "evening";
    if (localHour >= 8 && localHour < 12) {
      timeSlot = "morning";
    } else if (localHour >= 12 && localHour < 18) {
      timeSlot = "afternoon";
    } else {
      timeSlot = "evening";
    }

    // Fetch all users with telegram_chat_id
    const { data: allUsers, error } = await supabase
      .from("profiles")
      .select("user_id, telegram_chat_id, last_active, display_name, preferred_lang")
      .not("telegram_chat_id", "is", null);

    if (error) {
      console.error("Error fetching profiles:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!allUsers || allUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "No users with Telegram", sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inactive threshold: 48+ hours
    const inactiveThreshold = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    let sent = 0;
    let motivationSent = 0;
    let inactiveSent = 0;
    const errors: string[] = [];

    for (const user of allUsers) {
      const name = user.display_name || "";
      const userLang: "ru" | "uk" = (user as any).preferred_lang === "uk" ? "uk" : "ru";
      let message: string;

      const isInactive = !user.last_active || user.last_active < inactiveThreshold;

      if (isInactive) {
        message = pickRandom(INACTIVE_MESSAGES[userLang]);
        inactiveSent++;
      } else {
        message = pickRandom(MOTIVATION[timeSlot][userLang]);
        motivationSent++;
      }

      // Personalize
      if (name) {
        message = `${name}, ${message.charAt(0).toLowerCase()}${message.slice(1)}`;
      }

      try {
        const result = await sendTelegramMessage(botToken, user.telegram_chat_id!, message);
        if (result.ok) {
          sent++;
        } else {
          errors.push(`User ${user.user_id}: ${result.description || "unknown error"}`);
        }
      } catch (e) {
        errors.push(`User ${user.user_id}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Sent ${sent} messages (${motivationSent} motivation, ${inactiveSent} inactive)`,
        sent,
        motivation_sent: motivationSent,
        inactive_sent: inactiveSent,
        total: allUsers.length,
        time_slot: timeSlot,
        local_hour: localHour,
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
