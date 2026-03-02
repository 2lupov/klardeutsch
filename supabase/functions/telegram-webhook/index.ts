import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEBAPP_URL = "https://klardeutsch.lovable.app";
const SUPPORT_USERNAME = "tulupov_de";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    // GET /setup — one-time bot configuration (menu button + commands)
    if (req.method === "GET" && url.searchParams.get("action") === "setup") {
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
      const results = await setupBot(botToken);
      return new Response(JSON.stringify({ ok: true, results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    console.log("Telegram webhook received:", JSON.stringify(body));

    const message = body?.message;
    if (!message) {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const chatId = message.chat?.id;
    const text = message.text?.trim() || "";
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle /start
    if (text.startsWith("/start") && chatId) {
      const parts = text.split(" ");
      const userId = parts[1];

      // Link account if user_id provided
      if (userId) {
        const { error } = await supabase
          .from("profiles")
          .update({ telegram_chat_id: chatId } as any)
          .eq("user_id", userId);

        if (error) {
          console.error("Error updating profile:", error);
        }
      }

      // Send welcome message with inline WebApp button
      await telegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: "🇩🇪 <b>Willkommen bei KLAR!</b>\n\nТвой путь к ясному немецкому начинается здесь.\n\nНажми кнопку ниже, чтобы начать учиться 👇",
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🔥 Начать обучение",
                web_app: { url: WEBAPP_URL },
              },
            ],
          ],
        },
      });

      // Set reply keyboard for navigation
      await telegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: "Используй меню внизу для быстрой навигации 👇",
        reply_markup: {
          keyboard: [
            [
              { text: "👤 Профиль", web_app: { url: `${WEBAPP_URL}/profile` } },
              { text: "📚 Курсы", web_app: { url: WEBAPP_URL } },
            ],
            [
              { text: "💬 Поддержка" },
            ],
          ],
          resize_keyboard: true,
          is_persistent: true,
        },
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle "Поддержка" button
    if (text === "💬 Поддержка" && chatId) {
      await telegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: `Напиши нам: @${SUPPORT_USERNAME}\n\nМы всегда рады помочь! 💬`,
        parse_mode: "HTML",
      });

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function telegramApi(botToken: string, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram API error (${method}):`, data);
  }
  return data;
}

async function setupBot(botToken: string) {
  const results: Record<string, unknown> = {};

  const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/telegram-webhook`;

  // 0. Register webhook
  results.webhook = await telegramApi(botToken, "setWebhook", {
    url: webhookUrl,
  });

  // 1. Set Menu Button → opens Mini App
  results.menuButton = await telegramApi(botToken, "setChatMenuButton", {
    menu_button: {
      type: "web_app",
      text: "🚀 Начать",
      web_app: { url: WEBAPP_URL },
    },
  });

  // 2. Set bot commands
  results.commands = await telegramApi(botToken, "setMyCommands", {
    commands: [
      { command: "start", description: "Начать обучение" },
      { command: "help", description: "Помощь" },
    ],
  });

  // 3. Set bot description
  results.description = await telegramApi(botToken, "setMyDescription", {
    description: "KLAR — школа немецкого языка. Учись ясно и просто! 🇩🇪",
  });

  // 4. Set short description
  results.shortDescription = await telegramApi(botToken, "setMyShortDescription", {
    short_description: "Немецкий язык — ясно и просто 🇩🇪",
  });

  // 5. Check webhook info
  results.webhookInfo = await telegramApi(botToken, "getWebhookInfo", {});

  return results;
}
