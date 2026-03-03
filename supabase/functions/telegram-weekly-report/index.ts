import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
      return new Response(JSON.stringify({ error: "TELEGRAM_BOT_TOKEN not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all users with telegram_chat_id
    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("user_id, telegram_chat_id, display_name")
      .not("telegram_chat_id", "is", null);

    if (usersError || !users?.length) {
      return new Response(JSON.stringify({ message: "No telegram users", sent: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoISO = weekAgo.toISOString();

    let sent = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Fetch stats for this user over the past week
        const [wordsRes, progressRes, xpRes, leaderboardRes] = await Promise.all([
          // Words learned this week
          supabase
            .from("saved_words")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.user_id)
            .gte("learned_at", weekAgoISO),
          // Lessons completed this week
          supabase
            .from("user_progress")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.user_id)
            .eq("completed", true)
            .gte("updated_at", weekAgoISO),
          // Total XP
          supabase
            .from("user_xp")
            .select("total_xp")
            .eq("user_id", user.user_id)
            .single(),
          // Leaderboard position
          supabase.rpc("get_leaderboard", { p_limit: 100 }),
        ]);

        const wordsCount = wordsRes.count ?? 0;
        const lessonsCount = progressRes.count ?? 0;
        const totalXP = xpRes.data?.total_xp ?? 0;

        // Find rank
        const rank = leaderboardRes.data?.findIndex(
          (r: any) => r.user_id === user.user_id
        );
        const rankText = rank !== undefined && rank >= 0
          ? `#${rank + 1}`
          : "—";

        // Skip users with zero activity
        if (wordsCount === 0 && lessonsCount === 0) continue;

        const name = user.display_name || "друг";

        // XP earned this week (approximate from progress)
        const xpWeek = lessonsCount * 15 + wordsCount * 2;

        const message = `📊 <b>Еженедельный отчёт KLAR</b>

Привет, <b>${name}</b>! Вот что ты сделал за неделю:

📚 Слов выучено: <b>${wordsCount}</b>
✅ Уроков пройдено: <b>${lessonsCount}</b>
⚡ XP за неделю: ~<b>${xpWeek}</b>
🏆 Место в рейтинге: <b>${rankText}</b>
🎯 Всего XP: <b>${totalXP}</b>

${wordsCount >= 20 ? "🔥 Отличная неделя! Так держать!" : wordsCount >= 10 ? "💪 Хороший результат! Можешь ещё лучше!" : "📈 Попробуй уделять KLAR хотя бы 5 минут в день!"}

Neue Woche, neue Chancen! 🚀`;

        const result = await sendTelegramMessage(botToken, user.telegram_chat_id!, message);
        if (result.ok) {
          sent++;
        } else {
          errors.push(`User ${user.user_id}: ${result.description || "unknown"}`);
        }
      } catch (e) {
        errors.push(`User ${user.user_id}: ${e.message}`);
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${sent} weekly reports`, sent, total: users.length, errors: errors.length ? errors : undefined }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
