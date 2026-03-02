import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
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

    // Handle /start with deep link parameter (user_id)
    // Format: /start <user_id>
    if (text.startsWith("/start") && chatId) {
      const parts = text.split(" ");
      const userId = parts[1]; // user_id passed as deep link param

      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      if (userId) {
        // Link telegram_chat_id to user profile
        const { error } = await supabase
          .from("profiles")
          .update({ telegram_chat_id: chatId } as any)
          .eq("user_id", userId);

        if (error) {
          console.error("Error updating profile:", error);
          await sendTelegramMessage(
            botToken,
            chatId,
            "❌ Не удалось привязать аккаунт. Попробуй ещё раз через приложение."
          );
        } else {
          await sendTelegramMessage(
            botToken,
            chatId,
            "✅ Готово! Теперь ты будешь получать напоминания об учёбе в KLAR.\n\n📚 Учись каждый день — и результат не заставит себя ждать!"
          );
        }
      } else {
        // /start without user_id — just greet
        await sendTelegramMessage(
          botToken,
          chatId,
          "👋 Привет! Я бот KLAR — твой помощник в изучении немецкого.\n\nЧтобы получать напоминания, привяжи аккаунт через приложение KLAR → Профиль → Уведомления."
        );
      }
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

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
  });
}
