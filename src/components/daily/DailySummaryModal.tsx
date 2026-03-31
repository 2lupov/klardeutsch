import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { X, Share2 } from "lucide-react";

interface DailyStats {
  wordsLearned: number;
  xpEarned: number;
  exercisesDone: number;
  streak: number;
  wordOfDay: { german: string; translation: string; example: string } | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const DailySummaryModal = ({ open, onClose }: Props) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [stats, setStats] = useState<DailyStats | null>(null);

  useEffect(() => {
    if (!open || !user) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const iso = todayStart.toISOString();

    const fetchStats = async () => {
      // Words learned today
      const { count: wordsCount } = await supabase
        .from("saved_words")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("learned_at", iso);

      // XP earned today
      const { data: xpData } = await (supabase as any)
        .from("xp_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .gte("created_at", iso);
      const xpEarned = xpData?.reduce((s: number, r: any) => s + r.amount, 0) ?? 0;

      // Exercises done today
      const { count: exCount } = await supabase
        .from("user_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("updated_at", iso);

      // Streak
      const { data: bonus } = await (supabase as any)
        .from("daily_bonuses")
        .select("streak")
        .eq("user_id", user.id)
        .maybeSingle();

      // Get user's level
      let userLevel = "A1";
      const { data: profile } = await supabase
        .from("profiles")
        .select("recommended_level")
        .eq("user_id", user.id)
        .single();
      if ((profile as any)?.recommended_level) userLevel = (profile as any).recommended_level;

      // Word of day (cached per level+date)
      const dateKey = new Date().toISOString().slice(0, 10);
      const cacheKey = `klar_word_of_day_${userLevel}_${dateKey}`;
      let wordOfDay = null;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        wordOfDay = JSON.parse(cached);
      } else {
        const seed = new Date().getDate();
        const { data: wod } = await supabase
          .from("vocab_cards")
          .select("german, russian, ukrainian, article, example")
          .eq("level", userLevel)
          .order("id");
        if (wod?.length) {
          const pick = wod[seed % wod.length];
          wordOfDay = {
            german: (pick.article ? pick.article + " " : "") + pick.german,
            translation: lang === "uk" ? (pick.ukrainian || pick.russian) : pick.russian,
            example: pick.example || "",
          };
          localStorage.setItem(cacheKey, JSON.stringify(wordOfDay));
        }
      }

      setStats({
        wordsLearned: wordsCount ?? 0,
        xpEarned,
        exercisesDone: exCount ?? 0,
        streak: bonus?.streak ?? 0,
        wordOfDay,
      });
    };

    fetchStats();
  }, [open, user, lang]);

  const handleShare = () => {
    if (!stats) return;
    const text = `🇩🇪 ${lang === "uk" ? "Сьогодні в KLAR" : "Сегодня в KLAR"}:\n📚 ${stats.wordsLearned} ${lang === "uk" ? "слів" : "слов"}\n⚡ ${stats.xpEarned} XP\n🔥 ${lang === "uk" ? "Серія" : "Серия"}: ${stats.streak}\n\n${lang === "uk" ? "Вчу німецьку безкоштовно" : "Учу немецкий бесплатно"} → klardeutsch.org`;
    const url = `https://t.me/share/url?url=${encodeURIComponent("https://klardeutsch.org")}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  if (!open || !stats) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="bg-card border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground">
            <X className="w-5 h-5" />
          </button>

          <div className="text-center mb-6">
            <p className="text-4xl mb-2">🌟</p>
            <h2 className="text-xl font-bold text-foreground">
              {lang === "uk" ? "Чудовий день!" : "Отличный день!"}
            </h2>
          </div>

          <div className="space-y-3 mb-6">
            <StatRow emoji="📚" value={stats.wordsLearned} label={lang === "uk" ? "слів вивчено" : "слов выучено"} />
            <StatRow emoji="⚡" value={stats.xpEarned} label="XP" />
            <StatRow emoji="✅" value={stats.exercisesDone} label={lang === "uk" ? "вправ пройдено" : "упражнений пройдено"} />
            <StatRow emoji="🔥" value={stats.streak} label={lang === "uk" ? "днів серія" : "дней серия"} />
          </div>

          {stats.wordOfDay && (
            <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-4 mb-6">
              <p className="text-sm text-muted-foreground mb-1">
                {lang === "uk" ? "💬 Слово дня:" : "💬 Слово дня:"}
              </p>
              <p className="font-bold text-foreground">{stats.wordOfDay.german}</p>
              <p className="text-primary">{stats.wordOfDay.translation}</p>
              {stats.wordOfDay.example && (
                <p className="text-xs text-muted-foreground italic mt-1">{stats.wordOfDay.example}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="flex-1 py-3 rounded-xl border border-white/10 bg-white/5 text-foreground font-medium flex items-center justify-center gap-2"
            >
              <Share2 className="w-4 h-4" /> {lang === "uk" ? "Поділитися" : "Поделиться"}
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
            >
              ✓ {lang === "uk" ? "Закрити" : "Закрыть"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const StatRow = ({ emoji, value, label }: { emoji: string; value: number; label: string }) => (
  <div className="flex items-center gap-3">
    <span className="text-lg">{emoji}</span>
    <span className="font-bold text-foreground">{value}</span>
    <span className="text-muted-foreground text-sm">{label}</span>
  </div>
);

export default DailySummaryModal;
