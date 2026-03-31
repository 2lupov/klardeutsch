import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const options = [
  { minutes: 5, emoji: "⚡", ru: "5 минут — Лёгкий старт", uk: "5 хвилин — Легкий старт" },
  { minutes: 15, emoji: "🔥", ru: "15 минут — Оптимально", uk: "15 хвилин — Оптимально" },
  { minutes: 30, emoji: "💪", ru: "30 минут — Интенсивно", uk: "30 хвилин — Інтенсивно" },
];

interface Props {
  onComplete: (minutes: number) => void;
}

const DailyGoalPicker = ({ onComplete }: Props) => {
  const [selected, setSelected] = useState<number | null>(null);
  const { t, lang } = useLanguage();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground text-center">
        {t("onboardingStep3Title" as any)}
      </h2>
      <div className="grid gap-3">
        {options.map((o, i) => (
          <motion.button
            key={o.minutes}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => setSelected(o.minutes)}
            className={`w-full text-left px-5 py-4 rounded-2xl border backdrop-blur-xl transition-all ${
              selected === o.minutes
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <span className="text-2xl mr-3">{o.emoji}</span>
            <span className="text-foreground font-medium">{lang === "uk" ? o.uk : o.ru}</span>
          </motion.button>
        ))}
      </div>
      {selected !== null && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => onComplete(selected)}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
        >
          {t("confirm" as any)}
        </motion.button>
      )}
    </div>
  );
};

export default DailyGoalPicker;
