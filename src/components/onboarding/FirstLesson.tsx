import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import confetti from "canvas-confetti";

interface Props {
  level: string;
  onComplete: () => void;
}

const FirstLesson = ({ level, onComplete }: Props) => {
  const [card, setCard] = useState<any>(null);
  const [flipped, setFlipped] = useState(false);
  const [answered, setAnswered] = useState(false);
  const { t, lang } = useLanguage();

  useEffect(() => {
    supabase
      .from("vocab_cards")
      .select("*")
      .eq("level", level)
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) setCard(data[0]);
      });
  }, [level]);

  const handleAnswer = async (knew: boolean) => {
    setAnswered(true);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  if (!card) return null;

  return (
    <div className="space-y-6 text-center">
      <h2 className="text-2xl font-bold text-foreground">
        {t("onboardingStep4Title" as any)}
      </h2>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl cursor-pointer"
        onClick={() => setFlipped(!flipped)}
      >
        {!flipped ? (
          <div>
            <p className="text-sm text-muted-foreground mb-2">{card.article ? `${card.article} ` : ""}</p>
            <p className="text-3xl font-bold text-foreground">{card.german}</p>
            <p className="text-sm text-muted-foreground mt-4">
              {lang === "uk" ? "Натисни щоб побачити переклад" : "Нажми чтобы увидеть перевод"}
            </p>
          </div>
        ) : (
          <div>
            <p className="text-3xl font-bold text-primary">
              {lang === "uk" ? (card.ukrainian || card.russian) : card.russian}
            </p>
            {card.example && (
              <p className="text-sm text-muted-foreground mt-3 italic">{card.example}</p>
            )}
          </div>
        )}
      </motion.div>

      {flipped && !answered && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <button
            onClick={() => handleAnswer(false)}
            className="flex-1 py-3 rounded-xl border border-red-400/30 bg-red-400/10 text-red-300 font-medium"
          >
            {lang === "uk" ? "Не знаю" : "Не знаю"}
          </button>
          <button
            onClick={() => handleAnswer(true)}
            className="flex-1 py-3 rounded-xl border border-green-400/30 bg-green-400/10 text-green-300 font-medium"
          >
            {lang === "uk" ? "Знаю!" : "Знаю!"}
          </button>
        </motion.div>
      )}

      {answered && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-primary font-semibold text-lg mb-4">
            🎉 +10 XP · +5 {lang === "uk" ? "монет" : "монет"}
          </p>
          <button
            onClick={onComplete}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg"
          >
            {t("onboardingStart" as any)}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default FirstLesson;
