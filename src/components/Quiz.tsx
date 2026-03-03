import { useState } from "react";
import { GrammarQuestion } from "@/data/lessons";
import { CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import AIFeedback, { MistakeData } from "@/components/AIFeedback";

interface QuizProps {
  questions: GrammarQuestion[];
  onComplete: (score: number) => void;
  level?: string;
  category?: string;
}

const Quiz = ({ questions, onComplete, level = "A1", category = "grammar" }: QuizProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [mistakes, setMistakes] = useState<MistakeData[]>([]);
  const [showAI, setShowAI] = useState(true);
  const [animKey, setAnimKey] = useState(0);
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
    } else {
      setMistakes((prev) => [
        ...prev,
        {
          question: q.question,
          userAnswer: q.options[index],
          correctAnswer: q.options[q.correctIndex],
          explanation: q.explanation,
        },
      ]);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((i) => i + 1);
      setSelectedIndex(null);
      setAnimKey((k) => k + 1);
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

        {mistakes.length > 0 && showAI && (
          <div className="w-full max-w-xl">
            <AIFeedback
              mistakes={mistakes}
              level={level}
              category={category}
              onClose={() => setShowAI(false)}
            />
          </div>
        )}

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

      <div key={animKey} className="glass-card p-6 animate-question-in">
        <h3 className="text-lg font-display font-semibold mb-6">{q.question}</h3>

        <div className="flex flex-col gap-3">
          {q.options.map((option, i) => {
            let style = "glass-card p-4 cursor-pointer transition-all text-left";
            if (answered) {
              if (i === q.correctIndex) {
                style += " border-success/50 bg-success/10 animate-answer-correct";
              } else if (i === selectedIndex) {
                style += " border-destructive/50 bg-destructive/10 animate-answer-shake";
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
          <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground animate-auth-fade-up" style={{ animationDelay: "0.1s" }}>
            💡 {q.explanation}
          </div>
        )}
      </div>

      {answered && (
        <button
          onClick={handleNext}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all animate-auth-fade-up"
          style={{ animationDelay: "0.05s" }}
        >
          {currentIndex < questions.length - 1 ? t("next") : t("results")}
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default Quiz;
