import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");

    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      return new Response(JSON.stringify({ error: "Missing API keys" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey);
    const today = new Date().toISOString().slice(0, 10);

    // Find users with active streak, no activity today, with telegram_chat_id
    const { data: users } = await supabase
      .from("profiles")
      .select("user_id, telegram_chat_id, preferred_lang, display_name, last_reminder_sent_at")
      .not("telegram_chat_id", "is", null)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${today}`);

    if (!users?.length) {
      return new Response(JSON.stringify({ ok: true, sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sent = 0;

    for (const user of users) {
      // Check if user has streak > 0
      const { data: bonus } = await supabase
        .from("daily_bonuses")
        .select("streak, last_claimed_at")
        .eq("user_id", user.user_id)
        .maybeSingle();

      if (!bonus || bonus.streak < 1) continue;

      // Check if already claimed today
      const claimedToday = bonus.last_claimed_at?.startsWith(today);
      if (claimedToday) continue;

      // Check last active today
      const lastActive = user.last_active;
      if (lastActive && lastActive.startsWith(today)) continue;

      const isUk = user.preferred_lang === "uk";
      const name = user.display_name || (isUk ? "друже" : "друг");

      const text = isUk
        ? `🔥 Твоя серія — ${bonus.streak} днів!\n\nНе дай вогню згаснути, ${name}. Зайди на урок — займе лише 5 хвилин.`
        : `🔥 Твоя серия — ${bonus.streak} дней!\n\nНе дай огню угаснуть, ${name}. Зайди на урок — займёт всего 5 минут.`;

      try {
        await fetch(`${GATEWAY_URL}/sendMessage`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": TELEGRAM_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: user.telegram_chat_id,
            text,
            parse_mode: "HTML",
            reply_markup: {
              inline_keyboard: [
                [{ text: isUk ? "👉 Вчитися зараз" : "👉 Учиться сейчас", url: "https://klardeutsch.org" }],
              ],
            },
          }),
        });

        await supabase
          .from("profiles")
          .update({ last_reminder_sent_at: today })
          .eq("user_id", user.user_id);

        sent++;
      } catch (e) {
        console.error(`Failed to send to ${user.telegram_chat_id}:`, e);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
