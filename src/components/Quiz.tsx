import { useState } from "react";
import { GrammarQuestion } from "@/data/lessons";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface QuizProps {
  questions: GrammarQuestion[];
  onComplete: (score: number) => void;
}

const Quiz = ({ questions, onComplete }: QuizProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const { t } = useLanguage();

  const q = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isCorrect = selectedIndex === q.correctIndex;
  const answered = selectedIndex !== null;

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelectedIndex(index);
    if (index === q.correctIndex) {
      setScore((s) => s + 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
    } else {
      setShowResult(true);
    }
  };

  if (showResult) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center gap-6 animate-slide-up">
        <div className="w-24 h-24 rounded-full flex items-center justify-center glow-yellow bg-primary/10">
          <span className="text-3xl font-display font-bold text-primary">{percentage}%</span>
        </div>
        <h2 className="text-xl font-display font-bold">
          {percentage >= 70 ? t("excellent") : percentage >= 40 ? t("notBad") : t("tryAgain")}
        </h2>
        <p className="text-muted-foreground">
          {score} {t("of")} {questions.length} {t("correctAnswers")}
        </p>
        <button
          onClick={() => onComplete(score)}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow"
        >
          {t("continue")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <div className="w-full">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{t("question")} {currentIndex + 1} / {questions.length}</span>
          <span>{score} ✓</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-display font-semibold mb-6">{q.question}</h3>

        <div className="flex flex-col gap-3">
          {q.options.map((option, i) => {
            let style = "glass-card p-4 cursor-pointer transition-all text-left";
            if (answered) {
              if (i === q.correctIndex) {
                style += " border-success/50 bg-success/10";
              } else if (i === selectedIndex) {
                style += " border-destructive/50 bg-destructive/10";
              }
            } else {
              style += " hover:border-primary/50 hover:bg-primary/5";
            }
            return (
              <button key={i} className={style} onClick={() => handleSelect(i)}>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-sm font-medium text-secondary-foreground">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="flex-1">{option}</span>
                  {answered && i === q.correctIndex && (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  )}
                  {answered && i === selectedIndex && !isCorrect && i !== q.correctIndex && (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {answered && q.explanation && (
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
            💡 {q.explanation}
          </div>
        )}
      </div>

      {answered && (
        <button
          onClick={handleNext}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all"
        >
          {currentIndex < questions.length - 1 ? t("next") : t("results")}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Quiz;
