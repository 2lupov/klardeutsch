import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";

interface Question {
  id: string;
  question_de: string;
  options: string[];
  correct: number;
  level: string;
}

interface Props {
  onComplete: (level: string) => void;
}

const PlacementTest = ({ onComplete }: Props) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    supabase
      .from("placement_questions" as any)
      .select("*")
      .order("sort_order")
      .then(({ data }: any) => {
        if (data) setQuestions(data);
      });
  }, []);

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    const correct = idx === questions[current].correct;
    if (correct) setScore((s) => s + 1);

    setTimeout(() => {
      if (current + 1 >= questions.length) {
        // Determine level based on score
        const levels = ["A1", "A1", "A2", "B1", "B2", "C1", "C1"];
        onComplete(levels[Math.min(score + (correct ? 1 : 0), 6)]);
      } else {
        setCurrent((c) => c + 1);
        setSelected(null);
      }
    }, 800);
  };

  if (!questions.length) return null;

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground text-center">
        {t("onboardingStep1Title" as any)}
      </h2>
      <Progress value={progress} className="h-2" />
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-2xl"
        >
          <p className="text-sm text-muted-foreground mb-1">
            {current + 1}/{questions.length} · {q.level}
          </p>
          <p className="text-lg font-semibold text-foreground mb-6">{q.question_de}</p>
          <div className="grid gap-3">
            {(q.options as string[]).map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = i === q.correct;
              let cls = "border-white/10 bg-white/5 hover:bg-white/10";
              if (selected !== null) {
                if (isCorrect) cls = "border-green-400/60 bg-green-400/10";
                else if (isSelected) cls = "border-red-400/60 bg-red-400/10";
              }
              return (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={selected !== null}
                  className={`w-full text-left px-4 py-3 rounded-xl border ${cls} text-foreground transition-all`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PlacementTest;
