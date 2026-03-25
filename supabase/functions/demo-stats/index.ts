import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Realistic Russian/Ukrainian names for new fake users
const FIRST_NAMES = [
  "Алина", "Богдан", "Вика", "Глеб", "Даша", "Егор", "Жанна", "Захар",
  "Ира", "Кирилл", "Лена", "Макс", "Настя", "Олег", "Поліна", "Руслан",
  "Света", "Тарас", "Юля", "Ярослав", "Андрій", "Марина", "Сергій",
  "Наталя", "Дмитро", "Оксана", "Артём", "Валерія", "Нікіта", "Аня",
];

const SUFFIXES = ["", "123", "99", "_de", ".berlin", "🇩🇪", "", "_lernt", "777", ""];

const AVATARS = [
  "/avatars/neutral-1.png", "/avatars/neutral-2.png", "/avatars/neutral-3.png",
  "/avatars/neutral-4.png", "/avatars/neutral-5.png", "/avatars/neutral-6.png",
  "/avatars/de-1.png", "/avatars/de-2.png", null,
];

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Update existing fake users with small realistic increments
    const { data: fakes, error: fetchErr } = await supabase
      .from("demo_leaderboard")
      .select("*");

    if (fetchErr) throw fetchErr;

    const updates: Promise<unknown>[] = [];

    for (const user of fakes || []) {
      // Each user has ~70% chance of "being active" this cycle
      if (Math.random() > 0.7) continue;

      const xpGain = rand(5, 35);
      const wordsGain = Math.random() < 0.4 ? rand(1, 5) : 0;
      const lessonsGain = Math.random() < 0.2 ? 1 : 0;
      const duelPlayed = Math.random() < 0.15 ? 1 : 0;
      const duelWon = duelPlayed && Math.random() < 0.6 ? 1 : 0;

      updates.push(
        supabase
          .from("demo_leaderboard")
          .update({
            total_xp: user.total_xp + xpGain,
            words_learned: user.words_learned + wordsGain,
            lessons_completed: user.lessons_completed + lessonsGain,
            duels_played: user.duels_played + duelPlayed,
            duels_won: user.duels_won + duelWon,
          })
          .eq("id", user.id)
      );
    }

    await Promise.all(updates);

    // 2. Maybe add a new fake user (~20% chance per run, max 25 total fakes)
    const totalFakes = fakes?.length ?? 0;
    let newUserName: string | null = null;

    if (totalFakes < 25 && Math.random() < 0.2) {
      const firstName = pick(FIRST_NAMES);
      const suffix = pick(SUFFIXES);
      const displayName = `${firstName}${suffix}`;

      // Check name doesn't already exist
      const exists = fakes?.some(
        (f) => f.display_name.toLowerCase() === displayName.toLowerCase()
      );

      if (!exists) {
        const startXp = rand(30, 150);
        const startWords = rand(5, 30);
        const startLessons = rand(1, 5);

        const { error: insertErr } = await supabase.from("demo_leaderboard").insert({
          display_name: displayName,
          avatar_url: pick(AVATARS),
          total_xp: startXp,
          words_learned: startWords,
          lessons_completed: startLessons,
          duels_played: rand(0, 3),
          duels_won: rand(0, 1),
        });

        if (insertErr) console.error("Insert error:", insertErr);
        else newUserName = displayName;
      }
    }

    const summary = {
      updated: updates.length,
      totalFakes,
      newUser: newUserName,
    };

    console.log("demo-stats:", JSON.stringify(summary));

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("demo-stats error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
