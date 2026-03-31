import { useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const goals = [
  { id: "relocation", emoji: "🏠", ru: "Переезд в Германию / Австрию", uk: "Переїзд до Німеччини / Австрії" },
  { id: "career", emoji: "💼", ru: "Работа и карьера", uk: "Робота і кар'єра" },
  { id: "travel", emoji: "✈️", ru: "Путешествия", uk: "Подорожі" },
  { id: "interest", emoji: "📚", ru: "Просто интересно", uk: "Просто цікаво" },
];

interface Props {
  onComplete: (goal: string) => void;
}

const GoalSelector = ({ onComplete }: Props) => {
  const [selected, setSelected] = useState<string | null>(null);
  const { t, lang } = useLanguage();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground text-center">
        {t("onboardingStep2Title" as any)}
      </h2>
      <div className="grid gap-3">
        {goals.map((g, i) => (
          <motion.button
            key={g.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => setSelected(g.id)}
            className={`w-full text-left px-5 py-4 rounded-2xl border backdrop-blur-xl transition-all ${
              selected === g.id
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            }`}
          >
            <span className="text-2xl mr-3">{g.emoji}</span>
            <span className="text-foreground font-medium">{lang === "uk" ? g.uk : g.ru}</span>
          </motion.button>
        ))}
      </div>
      {selected && (
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

export default GoalSelector;
