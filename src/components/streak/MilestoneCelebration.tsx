import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

const MILESTONES: Record<number, { coins: number; badge: string; ru: string; uk: string }> = {
  3: { coins: 20, badge: "🌱", ru: "Начало пути", uk: "Початок шляху" },
  7: { coins: 50, badge: "🔥", ru: "Неделя огня", uk: "Тиждень вогню" },
  14: { coins: 100, badge: "⚡", ru: "Две недели", uk: "Два тижні" },
  30: { coins: 200, badge: "🏆", ru: "Месяц силы", uk: "Місяць сили" },
  60: { coins: 400, badge: "💎", ru: "Два месяца", uk: "Два місяці" },
  100: { coins: 700, badge: "👑", ru: "100 дней", uk: "100 днів" },
};

interface Props {
  streak: number;
  lang: "ru" | "uk";
  onClose: () => void;
}

const MilestoneCelebration = ({ streak, lang, onClose }: Props) => {
  const milestone = MILESTONES[streak];

  useEffect(() => {
    if (milestone) {
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
    }
  }, [milestone]);

  if (!milestone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 15 }}
          className="bg-card border border-primary/30 rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-6xl mb-4">{milestone.badge}</p>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            🔥 {streak} {lang === "uk" ? "днів" : "дней"}!
          </h2>
          <p className="text-lg text-primary font-semibold mb-1">
            {lang === "uk" ? milestone.uk : milestone.ru}
          </p>
          <p className="text-muted-foreground mb-6">
            +{milestone.coins} {lang === "uk" ? "монет" : "монет"} 🪙
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            {lang === "uk" ? "Круто!" : "Круто!"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export { MILESTONES };
export default MilestoneCelebration;
