import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

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
    const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!TELEGRAM_BOT_TOKEN) throw new Error("TELEGRAM_BOT_TOKEN not set");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoISO = weekAgo.toISOString();

    // Total users
    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    // New users today
    const { count: newToday } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayISO);

    // New users this week
    const { count: newWeek } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgoISO);

    // Active today (last_active >= today)
    const { count: activeToday } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_active", todayISO);

    // Active this week
    const { count: activeWeek } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .gte("last_active", weekAgoISO);

    // Total XP earned today
    const { data: xpData } = await supabase
      .from("user_xp")
      .select("total_xp");
    const totalXP = (xpData || []).reduce((sum: number, r: any) => sum + (r.total_xp || 0), 0);

    // Lessons completed today (user_progress)
    const { count: lessonsToday } = await supabase
      .from("user_progress")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayISO)
      .eq("completed", true);

    // Duels today
    const { count: duelsToday } = await supabase
      .from("challenges")
      .select("*", { count: "exact", head: true })
      .gte("created_at", todayISO);

    // Words learned today
    const { count: wordsToday } = await supabase
      .from("saved_words")
      .select("*", { count: "exact", head: true })
      .gte("learned_at", todayISO);

    // Course purchases today
    const { count: purchasesToday } = await supabase
      .from("course_purchases")
      .select("*", { count: "exact", head: true })
      .gte("purchased_at", todayISO);

    // Coin transactions today
    const { data: coinData } = await supabase
      .from("coin_transactions")
      .select("amount")
      .gte("created_at", todayISO);
    const coinsEarned = (coinData || []).filter((c: any) => c.amount > 0).reduce((s: number, c: any) => s + c.amount, 0);
    const coinsSpent = (coinData || []).filter((c: any) => c.amount < 0).reduce((s: number, c: any) => s + Math.abs(c.amount), 0);

    // Users with Telegram linked
    const { count: telegramUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .not("telegram_chat_id", "is", null);

    const dateStr = now.toLocaleDateString("ru-RU", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });

    const text = [
      `📊 <b>Дневная статистика — ${dateStr}</b>`,
      ``,
      `👥 <b>Пользователи:</b>`,
      `   Всего: <b>${totalUsers || 0}</b>`,
      `   Новых сегодня: <b>${newToday || 0}</b>`,
      `   Новых за неделю: <b>${newWeek || 0}</b>`,
      `   С Telegram: <b>${telegramUsers || 0}</b>`,
      ``,
      `🟢 <b>Активность:</b>`,
      `   Активных сегодня: <b>${activeToday || 0}</b>`,
      `   Активных за неделю: <b>${activeWeek || 0}</b>`,
      ``,
      `📚 <b>Обучение:</b>`,
      `   Уроков пройдено: <b>${lessonsToday || 0}</b>`,
      `   Слов выучено: <b>${wordsToday || 0}</b>`,
      `   Дуэлей: <b>${duelsToday || 0}</b>`,
      ``,
      `💰 <b>Экономика:</b>`,
      `   Монет заработано: <b>+${coinsEarned}</b>`,
      `   Монет потрачено: <b>-${coinsSpent}</b>`,
      `   Покупок курсов: <b>${purchasesToday || 0}</b>`,
      ``,
      `⭐ <b>Общий XP:</b> ${totalXP.toLocaleString("ru-RU")}`,
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
    console.log("Daily stats sent:", tgData.ok);

    // Return stats as JSON too (for admin panel)
    const stats = {
      totalUsers: totalUsers || 0,
      newToday: newToday || 0,
      newWeek: newWeek || 0,
      activeToday: activeToday || 0,
      activeWeek: activeWeek || 0,
      telegramUsers: telegramUsers || 0,
      lessonsToday: lessonsToday || 0,
      wordsToday: wordsToday || 0,
      duelsToday: duelsToday || 0,
      coinsEarned,
      coinsSpent,
      purchasesToday: purchasesToday || 0,
      totalXP,
    };

    return new Response(JSON.stringify({ ok: tgData.ok, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("daily-stats error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
