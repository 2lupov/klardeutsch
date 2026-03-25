import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { BarChart3, TrendingUp, Calendar } from "lucide-react";

interface ProgressRow {
  level: string;
  category: string;
  score: number | null;
  completed: boolean | null;
  updated_at: string;
}

const COLORS = [
  "hsl(45, 92%, 52%)",   // primary/yellow
  "hsl(142, 76%, 36%)",  // success/green
  "hsl(220, 25%, 40%)",  // muted blue
];

const Statistics = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isMobile } = usePlatform();
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [customCount, setCustomCount] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  const [duelsPlayed, setDuelsPlayed] = useState(0);
  const [duelsWon, setDuelsWon] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: prog }, { count: saved }, { count: custom }, xpRes, coinRes, duelRes] = await Promise.all([
        supabase.from("user_progress").select("level, category, score, completed, updated_at").eq("user_id", user.id),
        supabase.from("saved_words").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("custom_words").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_xp").select("total_xp").eq("user_id", user.id).maybeSingle(),
        supabase.from("user_coins").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.rpc("get_user_duel_stats", { p_user_id: user.id }),
      ]);
      setProgress(prog ?? []);
      setSavedCount(saved ?? 0);
      setCustomCount(custom ?? 0);
      setTotalXp(xpRes.data?.total_xp ?? 0);
      setCoinBalance(coinRes.data?.balance ?? 0);
      const duelData = (duelRes.data as any)?.[0];
      setDuelsPlayed(duelData?.duels_played ?? 0);
      setDuelsWon(duelData?.duels_won ?? 0);
      setLoading(false);
    };
    load();
  }, [user]);

  // Activity by day (last 14 days)
  const activityByDay = useMemo(() => {
    const days: Record<string, number> = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days[d.toISOString().slice(0, 10)] = 0;
    }
    progress.forEach((p) => {
      const day = new Date(p.updated_at).toISOString().slice(0, 10);
      if (days[day] !== undefined) days[day]++;
    });
    return Object.entries(days).map(([date, count]) => ({
      date: date.slice(5), // MM-DD
      count,
    }));
  }, [progress]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const cats = { vocabulary: 0, grammar: 0, reading: 0, listening: 0, writing: 0 };
    progress.filter((p) => p.completed).forEach((p) => {
      if (p.category in cats) cats[p.category as keyof typeof cats]++;
    });
    return [
      { name: t("vocabSublabel"), value: cats.vocabulary },
      { name: t("grammarSublabel"), value: cats.grammar },
      { name: t("readingSublabel"), value: cats.reading },
      { name: t("listeningSublabel"), value: cats.listening },
      { name: t("writingSublabel"), value: cats.writing },
    ].filter((c) => c.value > 0);
  }, [progress, t]);

  // Level progress
  const levelData = useMemo(() => {
    const levels = ["A1", "A2", "B1", "B2"];
    return levels.map((lvl) => {
      const total = 3; // 3 categories per level
      const completed = progress.filter((p) => p.level === lvl && p.completed).length;
      return { level: lvl, completed: Math.min(completed, total), total };
    });
  }, [progress]);

  // Streak
  const streak = useMemo(() => {
    if (!progress.length) return 0;
    const days = new Set(progress.map((p) => new Date(p.updated_at).toISOString().slice(0, 10)));
    let count = 0;
    const d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [progress]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }

  const totalCompleted = progress.filter((p) => p.completed).length;

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-3xl"}`}>
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-display font-bold">{t("statsTitle")}</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2 mb-6">
        <MiniStat value={totalCompleted} label={t("lessonsCompleted")} />
        <MiniStat value={savedCount + customCount} label={t("wordsTotal")} />
        <MiniStat value={streak} label={t("streakDays")} />
        <MiniStat
          value={
            progress.filter((p) => p.category === "grammar" && p.score !== null).length > 0
              ? Math.round(
                  progress
                    .filter((p) => p.category === "grammar" && p.score !== null)
                    .reduce((s, p) => s + (p.score ?? 0), 0) /
                    progress.filter((p) => p.category === "grammar" && p.score !== null).length
                )
              : 0
          }
          label={t("statsAvgScore")}
          suffix="%"
        />
      </div>

      <div className={isMobile ? "space-y-5" : "grid grid-cols-2 gap-5"}>
        {/* Activity chart */}
        <section className="glass-card p-4 animate-slide-up">
          <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            {t("statsActivity")}
          </h2>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={activityByDay}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 9, fill: "hsl(215, 15%, 55%)" }}
                axisLine={false}
                tickLine={false}
                interval={isMobile ? 2 : 1}
              />
              <YAxis hide allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "hsl(220, 25%, 12%)",
                  border: "1px solid hsl(220, 15%, 20%)",
                  borderRadius: "0.5rem",
                  fontSize: "12px",
                  color: "hsl(210, 40%, 98%)",
                }}
                cursor={{ fill: "hsl(45, 92%, 52%, 0.08)" }}
              />
              <Bar dataKey="count" fill="hsl(45, 92%, 52%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Category pie */}
        <section className="glass-card p-4 animate-slide-up" style={{ animationDelay: "0.1s" }}>
          <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            {t("statsByCategory")}
          </h2>
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t("statsNoData")}</p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2">
                {categoryData.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: COLORS[idx % COLORS.length] }}
                    />
                    <span className="text-xs text-muted-foreground">{cat.name}</span>
                    <span className="text-xs font-display font-semibold text-foreground">{cat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Level progress */}
        <section className={`glass-card p-4 animate-slide-up ${!isMobile ? "col-span-2" : ""}`} style={{ animationDelay: "0.2s" }}>
          <h2 className="font-display text-sm font-semibold text-foreground mb-3">{t("statsByLevel")}</h2>
          <div className="space-y-3">
            {levelData.map((lvl) => (
              <div key={lvl.level} className="flex items-center gap-3">
                <span className="text-sm font-display font-bold text-primary w-8">{lvl.level}</span>
                <div className="flex-1 progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${(lvl.completed / lvl.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right">
                  {lvl.completed}/{lvl.total}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

const MiniStat = ({ value, label, suffix }: { value: number; label: string; suffix?: string }) => (
  <div className="glass-card p-3 flex flex-col items-center gap-1 text-center">
    <span className="text-lg font-display font-bold text-gradient">
      {value}{suffix}
    </span>
    <span className="text-[9px] text-muted-foreground leading-tight">{label}</span>
  </div>
);

export default Statistics;
