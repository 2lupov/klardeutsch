import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challenge_id } = await req.json();
    if (!challenge_id) {
      return new Response(JSON.stringify({ error: "challenge_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get the challenge
    const { data: challenge, error: chErr } = await supabase
      .from("challenges")
      .select("*")
      .eq("id", challenge_id)
      .single();

    if (chErr || !challenge) {
      return new Response(JSON.stringify({ error: "challenge not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if opponent is a demo user
    const { data: demo } = await supabase
      .from("demo_leaderboard")
      .select("id, display_name")
      .eq("id", challenge.opponent_id)
      .single();

    if (!demo) {
      return new Response(JSON.stringify({ auto: false, reason: "not_demo_user" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Random delay: 30 seconds to 2 hours for realism
    const minDelay = 30 * 1000;
    const maxDelay = 2 * 60 * 60 * 1000;
    const delay = minDelay + Math.random() * (maxDelay - minDelay);
    console.log(`Auto-duel for ${demo.display_name}: responding in ${Math.round(delay / 1000)}s`);
    await new Promise((r) => setTimeout(r, delay));

    // Generate realistic random answers
    const questions = challenge.questions as any[];
    const answers: number[] = [];
    // Demo user gets ~50-80% correct for realism
    const skillLevel = 0.5 + Math.random() * 0.3;

    for (const q of questions) {
      if (Math.random() < skillLevel) {
        answers.push(q.correct_index);
      } else {
        // Pick a wrong answer
        const wrongOptions = q.options
          .map((_: any, i: number) => i)
          .filter((i: number) => i !== q.correct_index);
        answers.push(wrongOptions[Math.floor(Math.random() * wrongOptions.length)]);
      }
    }

    const opponentScore = answers.reduce(
      (s: number, a: number, i: number) => s + (a === questions[i].correct_index ? 1 : 0),
      0
    );
    const challengerScore = challenge.challenger_score;

    let winnerId: string | null = null;
    if (opponentScore > challengerScore) winnerId = challenge.opponent_id;
    else if (opponentScore < challengerScore) winnerId = challenge.challenger_id;

    // Update challenge
    await supabase.from("challenges").update({
      opponent_score: opponentScore,
      opponent_answers: answers,
      winner_id: winnerId,
      status: "completed",
    }).eq("id", challenge_id);

    // Award XP
    if (winnerId) {
      await supabase.rpc("award_xp", { p_user_id: winnerId, p_amount: challenge.xp_reward });
    } else {
      const half = Math.round(challenge.xp_reward / 2);
      await supabase.rpc("award_xp", { p_user_id: challenge.challenger_id, p_amount: half });
      // Don't award XP to demo user (they don't have user_xp row, their XP is in demo_leaderboard)
    }

    // Notify challenger about result via Telegram
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (botToken) {
      let chatId: number | null = null;
      const { data: profile } = await supabase
        .from("profiles")
        .select("telegram_chat_id")
        .eq("user_id", challenge.challenger_id)
        .single();

      if (profile?.telegram_chat_id) chatId = profile.telegram_chat_id;

      if (chatId) {
        const typeLabel = challenge.challenge_type === "vocab" ? "Словарный запас" : "Грамматика";
        const won = challengerScore > opponentScore;
        const draw = challengerScore === opponentScore;
        const emoji = won ? "🏆" : draw ? "🤝" : "😔";
        const result = won ? "Ты победил!" : draw ? "Ничья!" : "Ты проиграл...";

        const message = `⚔️ <b>Дуэль завершена!</b>\n\n${demo.display_name} принял(а) твой вызов!\n📚 ${typeLabel} · ${challenge.level}\n\n📊 Результат: <b>${challengerScore}:${opponentScore}</b>\n${emoji} ${result}\n\nЗайди в KLAR, чтобы посмотреть подробности! 💪`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
        });
      }
    }

    return new Response(JSON.stringify({ auto: true, opponent_score: opponentScore }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("auto-duel-response error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
