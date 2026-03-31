import { useState } from "react";
import { CheckCircle2, XCircle, Volume2, AlertTriangle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/i18n/translations";

interface QuizQ {
  question: string;
  options: string[];
  correct: number;
}

interface GrammarContent {
  rule_title?: string;
  rule_summary?: string;
  formula?: string;
  formula_explanation?: string;
  conjugation_table?: { headers: string[]; rows: string[][] };
  examples?: Array<{ de: string; ru: string; highlight?: string[] }>;
  exceptions?: string[];
  memory_trick?: string;
  quiz_questions?: QuizQ[];
}

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: () => void;
  lang: Lang;
}

const GrammarLesson = ({ lesson, onComplete, lang }: Props) => {
  const c = (lesson.content as GrammarContent) || {};
  const quizQs = c.quiz_questions ?? [];
  const [quizIdx, setQuizIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [quizDone, setQuizDone] = useState(quizQs.length === 0);
  const [completed, setCompleted] = useState(false);

  const q = quizQs[quizIdx];

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correct) setCorrectCount(p => p + 1);
    setShowResult(true);
  };

  const handleNext = () => {
    if (quizIdx < quizQs.length - 1) {
      setQuizIdx(p => p + 1);
      setSelected(null);
      setShowResult(false);
    } else {
      setQuizDone(true);
    }
  };

  const highlightWords = (text: string, words?: string[]) => {
    if (!words?.length) return text;
    const parts = text.split(new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi'));
    return parts.map((part, i) => 
      words.some(w => w.toLowerCase() === part.toLowerCase()) 
        ? <span key={i} className="text-primary font-bold">{part}</span> 
        : part
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground">{c.rule_title || lesson.title}</h2>
      {c.rule_summary && <p className="text-sm text-muted-foreground leading-relaxed">{c.rule_summary}</p>}

      {/* Formula */}
      {c.formula && (
        <div className="p-4 rounded-xl bg-card/80 border border-primary/30">
          <p className="text-xs text-muted-foreground mb-1">{lang === "uk" ? "Формула" : "Формула"}</p>
          <p className="font-mono text-lg font-bold text-primary">{c.formula}</p>
          {c.formula_explanation && <p className="text-xs text-muted-foreground mt-2">{c.formula_explanation}</p>}
        </div>
      )}

      {/* Conjugation table */}
      {c.conjugation_table && (
        <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-primary/10">
                {c.conjugation_table.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-display font-bold text-primary">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {c.conjugation_table.rows.map((row, ri) => (
                <tr key={ri} className="border-t border-border/20 hover:bg-muted/20 transition-colors">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground/80">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Examples */}
      {c.examples && c.examples.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">
            {lang === "uk" ? "Приклади" : "Примеры"}
          </h3>
          {c.examples.map((ex, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/40">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{highlightWords(ex.de, ex.highlight)}</p>
                <p className="text-xs text-muted-foreground">{ex.ru}</p>
              </div>
              <button className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                <Volume2 className="w-4 h-4 text-primary" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Exceptions */}
      {c.exceptions && c.exceptions.length > 0 && (
        <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-destructive">
            <AlertTriangle className="w-4 h-4" />
            {lang === "uk" ? "Винятки" : "Исключения"}
          </div>
          {c.exceptions.map((e, i) => (
            <p key={i} className="text-xs text-foreground/80 pl-6">• {e}</p>
          ))}
        </div>
      )}

      {/* Memory trick */}
      {c.memory_trick && (
        <div className="p-3 rounded-xl border border-accent/30 bg-accent/5 flex items-start gap-2">
          <Brain className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-accent">{lang === "uk" ? "Запам'ятай" : "Запомни"}</p>
            <p className="text-xs text-foreground/80">{c.memory_trick}</p>
          </div>
        </div>
      )}

      {/* Quiz */}
      {quizQs.length > 0 && !quizDone && (
        <div className="space-y-4 pt-4 border-t border-border/20">
          <h3 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">
            {lang === "uk" ? "Перевірка" : "Проверка"} ({quizIdx + 1}/{quizQs.length})
          </h3>
          <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-3">
            <p className="text-sm font-semibold">{q.question}</p>
            <div className="space-y-2">
              {q.options.map((opt, i) => {
                let cls = "border-border/30 bg-card/60 hover:bg-muted/30";
                if (showResult && i === selected && i === q.correct) cls = "border-primary/50 bg-primary/10";
                else if (showResult && i === selected) cls = "border-destructive/50 bg-destructive/10";
                else if (showResult && i === q.correct) cls = "border-primary/30 bg-primary/5";
                return (
                  <button key={i} onClick={() => handleAnswer(i)} disabled={selected !== null}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${cls}`}>
                    <span className="flex-1">{opt}</span>
                    {showResult && i === q.correct && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    {showResult && i === selected && i !== q.correct && <XCircle className="w-4 h-4 text-destructive" />}
                  </button>
                );
              })}
            </div>
            {showResult && (
              <Button onClick={handleNext} size="sm" className="font-display font-bold">
                {quizIdx < quizQs.length - 1 ? (lang === "uk" ? "Далі →" : "Далее →") : (lang === "uk" ? "Завершити" : "Завершить")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Complete */}
      {quizDone && (
        <div className="flex justify-center pt-4">
          {completed ? (
            <div className="flex items-center gap-2 text-primary text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5" /> {lang === "uk" ? "Завершено!" : "Завершено!"}
            </div>
          ) : (
            <Button onClick={() => { setCompleted(true); onComplete(); }} className="font-display font-bold" size="lg">
              {lang === "uk" ? "Урок завершено ✓" : "Урок завершён ✓"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default GrammarLesson;
