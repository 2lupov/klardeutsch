import { useState } from "react";
import { CheckCircle2, XCircle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { Lang } from "@/i18n/translations";

interface MCQuestion { type: "mc"; question: string; options: string[]; correct: number; explanation?: string }
interface FillQuestion { type: "fill"; question: string; correct: string; hints?: string[]; explanation?: string }
interface TranslateQuestion { type: "translate"; question: string; correct: string; accept_variants?: string[]; explanation?: string }
interface MatchQuestion { type: "match"; pairs: [string, string][]; explanation?: string }
type QuizQuestion = MCQuestion | FillQuestion | TranslateQuestion | MatchQuestion;

interface QuizContent {
  questions?: QuizQuestion[];
  passing_score?: number;
}

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: (score: number) => void;
  lang: Lang;
}

const QuizLesson = ({ lesson, onComplete, lang }: Props) => {
  const c = (lesson.content as QuizContent) || {};
  const questions = c.questions ?? [];
  const passingScore = c.passing_score ?? 70;

  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [fillInput, setFillInput] = useState("");
  const [selectedMC, setSelectedMC] = useState<number | null>(null);
  const [matchedPairs, setMatchedPairs] = useState<Set<number>>(new Set());
  const [matchLeft, setMatchLeft] = useState<number | null>(null);
  const [shuffledRight, setShuffledRight] = useState<number[]>([]);
  const [hintIdx, setHintIdx] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = questions[idx];
  const progress = questions.length > 0 ? Math.round(((idx + (answered ? 1 : 0)) / questions.length) * 100) : 0;

  const checkFill = () => {
    const correct = fillInput.trim().toLowerCase() === (q as FillQuestion).correct.toLowerCase();
    setIsCorrect(correct);
    if (correct) setCorrectCount(p => p + 1);
    setAnswered(true);
  };

  const checkTranslate = () => {
    const tq = q as TranslateQuestion;
    const input = fillInput.trim().toLowerCase();
    const variants = [tq.correct, ...(tq.accept_variants || [])].map(v => v.toLowerCase());
    const correct = variants.some(v => v === input);
    setIsCorrect(correct);
    if (correct) setCorrectCount(p => p + 1);
    setAnswered(true);
  };

  const handleMC = (optIdx: number) => {
    if (answered) return;
    setSelectedMC(optIdx);
    const correct = optIdx === (q as MCQuestion).correct;
    setIsCorrect(correct);
    if (correct) setCorrectCount(p => p + 1);
    setAnswered(true);
  };

  const handleMatchClick = (rightIdx: number) => {
    if (matchLeft === null) return;
    const mq = q as MatchQuestion;
    if (matchLeft === rightIdx) {
      setMatchedPairs(prev => new Set([...prev, matchLeft]));
    }
    setMatchLeft(null);
    if (matchedPairs.size + (matchLeft === rightIdx ? 1 : 0) === mq.pairs.length) {
      setIsCorrect(true);
      setCorrectCount(p => p + 1);
      setAnswered(true);
    }
  };

  const handleNext = () => {
    if (idx < questions.length - 1) {
      setIdx(p => p + 1);
      setAnswered(false);
      setIsCorrect(false);
      setFillInput("");
      setSelectedMC(null);
      setMatchedPairs(new Set());
      setMatchLeft(null);
      setHintIdx(0);
      // Shuffle for match questions
      const nextQ = questions[idx + 1];
      if (nextQ?.type === "match") {
        setShuffledRight([...(nextQ as MatchQuestion).pairs.keys()].sort(() => Math.random() - 0.5));
      }
    } else {
      setFinished(true);
    }
  };

  // Initialize shuffle for first match question
  if (q?.type === "match" && shuffledRight.length === 0) {
    setShuffledRight([...(q as MatchQuestion).pairs.keys()].sort(() => Math.random() - 0.5));
  }

  if (questions.length === 0) {
    return <div className="text-center py-16 text-muted-foreground text-sm">{lang === "uk" ? "Питання скоро з'являться" : "Вопросы скоро появятся"}</div>;
  }

  if (finished) {
    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= passingScore;
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="text-5xl">{passed ? "🎉" : "📚"}</div>
        <h2 className="font-display text-2xl font-bold text-foreground">{score}%</h2>
        <p className="text-sm text-muted-foreground">
          {correctCount}/{questions.length} {lang === "uk" ? "правильних" : "правильных"}
        </p>
        {passed ? (
          <Button onClick={() => onComplete(score)} className="font-display font-bold" size="lg">
            {lang === "uk" ? "Завершити ✓" : "Завершить ✓"}
          </Button>
        ) : (
          <Button onClick={() => { setIdx(0); setCorrectCount(0); setFinished(false); setAnswered(false); setFillInput(""); setSelectedMC(null); }}
            variant="outline" className="font-display font-bold">
            {lang === "uk" ? "Спробувати ще раз" : "Попробовать ещё раз"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
      <Progress value={progress} className="h-1.5" />
      <p className="text-xs text-muted-foreground">
        {lang === "uk" ? "Питання" : "Вопрос"} {idx + 1} {lang === "uk" ? "з" : "из"} {questions.length}
      </p>

      <div className="p-5 rounded-xl border border-border/30 bg-card/40 space-y-4">
        {/* MC */}
        {q.type === "mc" && (
          <>
            <p className="text-sm font-semibold">{(q as MCQuestion).question}</p>
            <div className="space-y-2">
              {(q as MCQuestion).options.map((opt, i) => {
                let cls = "border-border/30 bg-card/60 hover:bg-muted/30";
                if (answered && i === selectedMC && isCorrect) cls = "border-primary/50 bg-primary/10";
                else if (answered && i === selectedMC) cls = "border-destructive/50 bg-destructive/10";
                else if (answered && i === (q as MCQuestion).correct) cls = "border-primary/30 bg-primary/5";
                return (
                  <button key={i} onClick={() => handleMC(i)} disabled={answered}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${cls}`}>
                    <span className="flex-1">{opt}</span>
                    {answered && i === (q as MCQuestion).correct && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    {answered && i === selectedMC && !isCorrect && <XCircle className="w-4 h-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Fill */}
        {q.type === "fill" && (
          <>
            <p className="text-sm font-semibold">{(q as FillQuestion).question}</p>
            <Input value={fillInput} onChange={e => setFillInput(e.target.value)} disabled={answered}
              placeholder={lang === "uk" ? "Ваша відповідь..." : "Ваш ответ..."} className="text-sm"
              onKeyDown={e => e.key === "Enter" && !answered && fillInput.trim() && checkFill()} />
            {!answered && (q as FillQuestion).hints && hintIdx < (q as FillQuestion).hints!.length && (
              <button onClick={() => setHintIdx(p => p + 1)} className="text-xs text-accent flex items-center gap-1">
                <Lightbulb className="w-3 h-3" /> {(q as FillQuestion).hints![hintIdx]}
              </button>
            )}
            {!answered && <Button size="sm" onClick={checkFill} disabled={!fillInput.trim()}>{lang === "uk" ? "Перевірити" : "Проверить"}</Button>}
            {answered && !isCorrect && (
              <p className="text-xs text-muted-foreground">{lang === "uk" ? "Правильно" : "Правильно"}: <strong>{(q as FillQuestion).correct}</strong></p>
            )}
          </>
        )}

        {/* Translate */}
        {q.type === "translate" && (
          <>
            <p className="text-sm font-semibold">{(q as TranslateQuestion).question}</p>
            <Input value={fillInput} onChange={e => setFillInput(e.target.value)} disabled={answered}
              placeholder={lang === "uk" ? "Переклад німецькою..." : "Перевод на немецкий..."} className="text-sm"
              onKeyDown={e => e.key === "Enter" && !answered && fillInput.trim() && checkTranslate()} />
            {!answered && <Button size="sm" onClick={checkTranslate} disabled={!fillInput.trim()}>{lang === "uk" ? "Перевірити" : "Проверить"}</Button>}
            {answered && !isCorrect && (
              <p className="text-xs text-muted-foreground">{lang === "uk" ? "Правильно" : "Правильно"}: <strong>{(q as TranslateQuestion).correct}</strong></p>
            )}
          </>
        )}

        {/* Match */}
        {q.type === "match" && (
          <>
            <p className="text-sm font-semibold">{lang === "uk" ? "З'єднайте пари" : "Соедините пары"}</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                {(q as MatchQuestion).pairs.map(([left], i) => (
                  <button key={i} onClick={() => !matchedPairs.has(i) && setMatchLeft(i)} disabled={matchedPairs.has(i)}
                    className={`w-full p-2 rounded-lg border text-xs text-left transition-all ${
                      matchedPairs.has(i) ? "border-primary/30 bg-primary/10 opacity-50" :
                      matchLeft === i ? "border-primary bg-primary/20" : "border-border/30 bg-card/60 hover:bg-muted/30"
                    }`}>{left}</button>
                ))}
              </div>
              <div className="space-y-2">
                {shuffledRight.map(ri => {
                  const [, right] = (q as MatchQuestion).pairs[ri];
                  return (
                    <button key={ri} onClick={() => handleMatchClick(ri)} disabled={matchedPairs.has(ri)}
                      className={`w-full p-2 rounded-lg border text-xs text-left transition-all ${
                        matchedPairs.has(ri) ? "border-primary/30 bg-primary/10 opacity-50" : "border-border/30 bg-card/60 hover:bg-muted/30"
                      }`}>{right}</button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Result feedback */}
        {answered && (
          <div className={`flex items-center gap-2 text-xs font-semibold ${isCorrect ? "text-primary" : "text-destructive"}`}>
            {isCorrect ? <><CheckCircle2 className="w-4 h-4" /> {lang === "uk" ? "Правильно! 🎉" : "Правильно! 🎉"}</> :
              <><XCircle className="w-4 h-4" /> {lang === "uk" ? "Неправильно" : "Неверно"}</>}
          </div>
        )}

        {answered && q.explanation && (
          <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded-lg">{q.explanation}</p>
        )}
      </div>

      {answered && (
        <div className="flex justify-end">
          <Button onClick={handleNext} className="font-display font-bold">
            {idx < questions.length - 1 ? (lang === "uk" ? "Далі →" : "Далее →") : (lang === "uk" ? "Результат" : "Результат")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default QuizLesson;
