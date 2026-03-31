import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Lang } from "@/i18n/translations";

interface Question {
  timecode?: number;
  question: string;
  options: string[];
  correct: number;
}

interface Props {
  lesson: { id: string; title: string; content: any; video_url: string | null };
  onComplete: (score: number) => void;
  lang: Lang;
}

const VideoQuizLesson = ({ lesson, onComplete, lang }: Props) => {
  const questions: Question[] = (lesson.content as any)?.questions ?? [];
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [finished, setFinished] = useState(false);

  const q = questions[current];

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correct) setCorrectCount((p) => p + 1);
    setShowResult(true);
  };

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent((p) => p + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      const score = Math.round(((correctCount + (selected === q.correct ? 0 : 0)) / questions.length) * 100);
      // correctCount already includes this answer
      const finalScore = Math.round((correctCount / questions.length) * 100);
      setFinished(true);
      onComplete(finalScore);
    }
  };

  if (questions.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        {lang === "uk" ? "Питання скоро з'являться" : "Вопросы скоро появятся"}
      </div>
    );
  }

  if (finished) {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-5xl">{pct >= 70 ? "🎉" : "📚"}</div>
        <h2 className="font-display text-2xl font-bold text-foreground">{pct}%</h2>
        <p className="text-sm text-muted-foreground">
          {correctCount}/{questions.length} {lang === "uk" ? "правильних" : "правильных"}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          {lang === "uk" ? "Питання" : "Вопрос"} {current + 1}/{questions.length}
        </p>
      </div>

      {/* Question */}
      <div className="p-5 rounded-xl border border-border/30 bg-card/40 space-y-4">
        <p className="text-sm font-semibold text-foreground">{q.question}</p>

        <div className="space-y-2">
          {q.options.map((opt, i) => {
            const isCorrect = i === q.correct;
            const isSelected = i === selected;
            let cls = "border-border/30 bg-card/60 hover:bg-muted/30";
            if (showResult && isSelected && isCorrect) cls = "border-primary/50 bg-primary/10";
            else if (showResult && isSelected && !isCorrect) cls = "border-destructive/50 bg-destructive/10";
            else if (showResult && isCorrect) cls = "border-primary/30 bg-primary/5";

            return (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                disabled={selected !== null}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm ${cls}`}
              >
                <span className="w-6 h-6 rounded-full border border-border/50 flex items-center justify-center text-xs font-bold shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1">{opt}</span>
                {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                {showResult && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {showResult && (
        <div className="flex justify-end">
          <Button onClick={handleNext} className="font-display font-bold">
            {current < questions.length - 1
              ? lang === "uk" ? "Далі →" : "Далее →"
              : lang === "uk" ? "Завершити" : "Завершить"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoQuizLesson;
