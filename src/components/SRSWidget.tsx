import { useSRS } from "@/hooks/useSRS";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";
import { RotateCcw, Sparkles, BookOpen } from "lucide-react";

const SRSWidget = () => {
  const { dueCount, loading } = useSRS();
  const navigate = useNavigate();
  const { lang } = useLanguage();

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full backdrop-blur-xl bg-white/5 border border-primary/30 rounded-2xl p-4 shadow-2xl shadow-primary/5 cursor-pointer hover:bg-white/10 transition-all"
      onClick={() => navigate("/review")}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <RotateCcw className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {lang === "uk" ? "🔁 Повторення слів" : "🔁 Повторение слов"}
            </p>
            <p className="text-sm text-muted-foreground">
              {dueCount} {lang === "uk" ? "слів чекають повторення" : "слов ждут повторения"}
            </p>
          </div>
        </div>
        <span className="text-primary font-medium text-sm">→</span>
      </div>
    </motion.div>
  );
};

export default SRSWidget;

