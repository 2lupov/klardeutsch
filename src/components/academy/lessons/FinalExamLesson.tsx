import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Lang } from "@/i18n/translations";

interface Question {
  question: string;
  options: string[];
  correct: number;
}

interface Props {
  lesson: { id: string; title: string; content: any };
  courseId: string;
  onComplete: (score: number) => void;
  lang: Lang;
}

const FinalExamLesson = ({ lesson, onComplete, courseId, lang }: Props) => {
  const { user } = useAuth();
  const content = lesson.content as any;
  const questions: Question[] = content?.questions ?? [];
  const passingScore = content?.passing_score ?? 70;

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 min

  // Timer
  useEffect(() => {
    if (finished) return;
    const t = setInterval(() => setTimeLeft((p) => Math.max(0, p - 1)), 1000);
    return () => clearInterval(t);
  }, [finished]);

  // Auto-finish if time runs out
  useEffect(() => {
    if (timeLeft === 0 && !finished) finishExam();
  }, [timeLeft]);

  const handleAnswer = (idx: number) => {
    setSelected(idx);
  };

  const handleNext = () => {
    if (selected === null) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (current < questions.length - 1) {
      setCurrent((p) => p + 1);
    } else {
      finishExam(newAnswers);
    }
  };

  const finishExam = async (finalAnswers?: number[]) => {
    const ans = finalAnswers ?? answers;
    const correct = ans.filter((a, i) => a === questions[i]?.correct).length;
    const score = Math.round((correct / questions.length) * 100);
    setFinished(true);
    onComplete(score);

    // Issue certificate if passed
    if (score >= passingScore && user) {
      await supabase.rpc("issue_certificate", {
        p_user_id: user.id,
        p_course_id: courseId,
        p_score: score,
      });
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  if (questions.length === 0) {
    return <div className="text-center py-16 text-muted-foreground text-sm">Exam coming soon</div>;
  }

  if (finished) {
    const correct = answers.filter((a, i) => a === questions[i]?.correct).length;
    const score = Math.round((correct / questions.length) * 100);
    const passed = score >= passingScore;

    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-5xl">{passed ? "🎓" : "📚"}</div>
        <h2 className="font-display text-3xl font-bold text-foreground">{score}%</h2>
        <p className="text-sm text-muted-foreground">
          {correct}/{questions.length} {lang === "uk" ? "правильних" : "правильных"}
        </p>
        {passed ? (
          <p className="text-sm text-primary font-semibold">
            🎉 {lang === "uk" ? "Вітаємо! Сертифікат видано!" : "Поздравляем! Сертификат выдан!"}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {lang === "uk" ? `Потрібно ${passingScore}% для сертифіката` : `Нужно ${passingScore}% для сертификата`}
          </p>
        )}
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          <span className={timeLeft < 300 ? "text-destructive font-bold" : ""}>{formatTime(timeLeft)}</span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {lang === "uk" ? "Питання" : "Вопрос"} {current + 1}/{questions.length}
      </p>

      <div className="p-5 rounded-xl border border-border/30 bg-card/40 space-y-4">
        <p className="text-sm font-semibold text-foreground">{q.question}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm ${
                selected === i
                  ? "border-primary/50 bg-primary/10"
                  : "border-border/30 bg-card/60 hover:bg-muted/30"
              }`}
            >
              <span className="w-6 h-6 rounded-full border border-border/50 flex items-center justify-center text-xs font-bold shrink-0">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={selected === null} className="font-display font-bold">
          {current < questions.length - 1
            ? lang === "uk" ? "Далі →" : "Далее →"
            : lang === "uk" ? "Завершити іспит" : "Завершить экзамен"}
        </Button>
      </div>
    </div>
  );
};

export default FinalExamLesson;
