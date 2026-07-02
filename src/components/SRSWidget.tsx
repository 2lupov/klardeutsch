import { useEffect } from "react";
import { useSRS } from "@/hooks/useSRS";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, BookOpen, ArrowRight } from "lucide-react";

const articleColor = (a?: string) => {
  const x = (a || "").toLowerCase();
  if (x === "der") return "text-blue-400";
  if (x === "die") return "text-pink-400";
  if (x === "das") return "text-green-400";
  return "text-muted-foreground";
};

const SRSWidget = () => {
  const { dueCount, dueCards, loading, fetchDueCards } = useSRS();
  const navigate = useNavigate();
  const { lang } = useLanguage();

  useEffect(() => {
    if (dueCount > 0 && dueCards.length === 0) {
      fetchDueCards();
    }
  }, [dueCount, dueCards.length, fetchDueCards]);

  if (loading) {
    return (
      <div className="h-full min-h-[112px] rounded-2xl bg-white/5 animate-pulse" />
    );
  }

  // Empty state — no words due for review yet.
  if (dueCount === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-all"
        onClick={() => navigate("/dictionary")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">
                {lang === "uk" ? "Все повторено ✨" : "Всё повторено ✨"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {lang === "uk"
                  ? "Додай нові слова у словник"
                  : "Добавь новые слова в словарь"}
              </p>
            </div>
          </div>
          <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>
      </motion.div>
    );
  }

  const preview = dueCards.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full backdrop-blur-xl bg-white/5 border border-primary/30 rounded-2xl p-4 shadow-2xl shadow-primary/5 cursor-pointer hover:bg-white/10 transition-all flex flex-col gap-3"
      onClick={() => navigate("/review")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {lang === "uk" ? "🔁 Повторення слів" : "🔁 Повторение слов"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {dueCount} {lang === "uk" ? "слів чекають повторення" : "слов ждут повторения"}
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-primary shrink-0" />
      </div>

      {preview.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {preview.map((c) => {
            const translation = lang === "uk" ? (c.ukrainian || c.russian) : c.russian;
            return (
              <div
                key={c.id}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs"
                title={translation}
              >
                {c.article && (
                  <span className={`font-bold ${articleColor(c.article)}`}>
                    {c.article}
                  </span>
                )}
                <span className="font-semibold text-foreground">{c.german}</span>
                <span className="text-muted-foreground hidden sm:inline">— {translation}</span>
              </div>
            );
          })}
          {dueCount > preview.length && (
            <div className="flex items-center px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
              +{dueCount - preview.length}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default SRSWidget;
