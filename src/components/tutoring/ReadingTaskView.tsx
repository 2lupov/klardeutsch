import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Check, X, Images, ChevronDown, BookOpenCheck, Trophy, RotateCcw, Sparkles } from "lucide-react";

export interface ReadingGap {
  n: number;
  answer: string;
  options: string[];
  explanation?: string | null;
}
export interface ReadingQuizItem {
  question: string;
  options: string[];
  answer: string;
  explanation?: string | null;
}
export interface ReadingTask {
  id: string;
  kind: string;
  title: string;
  level?: string | null;
  images: string[];
  body: string;
  gaps: ReadingGap[];
  quiz: ReadingQuizItem[];
  student_answers?: Record<string, string> | null;
  quiz_answers?: Record<string, string> | null;
}

const norm = (s: string) => (s || "").trim().toLowerCase();

/**
 * Інтерактивне читання / граматика зі сфотографованої сторінки:
 * текст із пропусками (4 варіанти на вибір, миттєва перевірка)
 * + фінальний інтерактивний тест після кнопки "Gelesen!".
 */
const ReadingTaskView = ({
  task,
  canAnswer = true,
  showPhotos = true,
  persist = true,
  onQuizFinished,
}: {
  task: ReadingTask;
  canAnswer?: boolean;
  showPhotos?: boolean;
  persist?: boolean;
  onQuizFinished?: (correct: number, total: number) => void;
}) => {
  const [answers, setAnswers] = useState<Record<string, string>>(task.student_answers || {});
  const [openGap, setOpenGap] = useState<number | null>(null);
  const [photosOpen, setPhotosOpen] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [stage, setStage] = useState<"read" | "quiz" | "result">("read");
  const [qIndex, setQIndex] = useState(0);
  const [qPick, setQPick] = useState<string | null>(null);
  const [qAnswers, setQAnswers] = useState<Record<string, string>>({});

  const gaps = useMemo(() => (Array.isArray(task.gaps) ? task.gaps : []), [task.gaps]);
  const quiz = useMemo(() => (Array.isArray(task.quiz) ? task.quiz : []), [task.quiz]);

  useEffect(() => {
    setAnswers(task.student_answers || {});
    setStage("read");
    setQIndex(0);
    setQPick(null);
    setQAnswers({});
  }, [task.id]);

  // Підписані URL для приватних фото сторінок
  useEffect(() => {
    if (!photosOpen || photoUrls.length || !task.images?.length) return;
    let alive = true;
    supabase.storage
      .from("tutoring-materials")
      .createSignedUrls(task.images, 3600)
      .then(({ data }) => {
        if (alive && data) setPhotoUrls(data.map((d) => d.signedUrl).filter(Boolean) as string[]);
      });
    return () => { alive = false; };
  }, [photosOpen, task.images, photoUrls.length]);

  const saveAnswers = async (next: Record<string, string>, quizNext?: Record<string, string>) => {
    if (!persist) return;
    await supabase
      .from("tutoring_reading_tasks")
      .update({
        student_answers: next as any,
        ...(quizNext ? { quiz_answers: quizNext as any } : {}),
      })
      .eq("id", task.id);
  };

  const pickGap = (gap: ReadingGap, option: string) => {
    if (!canAnswer || answers[gap.n]) return;
    const next = { ...answers, [gap.n]: option };
    setAnswers(next);
    setOpenGap(null);
    saveAnswers(next);
  };

  const filled = gaps.filter((g) => answers[g.n]).length;
  const correct = gaps.filter((g) => answers[g.n] && norm(answers[g.n]) === norm(g.answer)).length;

  // Розбір тексту на частини та пропуски
  const parts = useMemo(() => {
    const out: { text?: string; gap?: ReadingGap }[] = [];
    const re = /\{\{(\d+)\}\}/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(task.body))) {
      if (m.index > last) out.push({ text: task.body.slice(last, m.index) });
      const gap = gaps.find((g) => Number(g.n) === Number(m![1]));
      if (gap) out.push({ gap });
      else out.push({ text: m[0] });
      last = m.index + m[0].length;
    }
    if (last < task.body.length) out.push({ text: task.body.slice(last) });
    return out;
  }, [task.body, gaps]);

  const currentQ = quiz[qIndex];
  const qCorrect = quiz.filter((q, i) => qAnswers[i] && norm(qAnswers[i]) === norm(q.answer)).length;

  const answerQuiz = (opt: string) => {
    if (qPick) return;
    setQPick(opt);
    const next = { ...qAnswers, [qIndex]: opt };
    setQAnswers(next);
    saveAnswers(answers, next);
  };

  const nextQuestion = () => {
    setQPick(null);
    if (qIndex + 1 < quiz.length) setQIndex(qIndex + 1);
    else {
      setStage("result");
      const total = quiz.length;
      const got = quiz.filter((q, i) => qAnswers[i] && norm(qAnswers[i]) === norm(q.answer)).length;
      onQuizFinished?.(got, total);
      if (persist) {
        supabase
          .from("tutoring_reading_tasks")
          .update({ completed_at: new Date().toISOString(), quiz_answers: qAnswers as any })
          .eq("id", task.id);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-xs font-bold">
          {task.kind === "grammar" ? "Grammatik" : "Lesen"}
        </span>
        {task.level && <span className="px-2 py-0.5 rounded-md bg-muted text-xs font-bold">{task.level}</span>}
        <h3 className="text-xl lg:text-2xl font-display font-black">{task.title}</h3>
        {gaps.length > 0 && (
          <span className="ml-auto text-xs font-bold text-muted-foreground">
            {filled}/{gaps.length} • ✅ {correct}
          </span>
        )}
      </div>

      {showPhotos && task.images?.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/30 overflow-hidden">
          <button
            onClick={() => setPhotosOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
          >
            <Images className="w-4 h-4 text-primary" />
            Фото сторінок ({task.images.length})
            <ChevronDown className={`w-4 h-4 ml-auto transition ${photosOpen ? "rotate-180" : ""}`} />
          </button>
          {photosOpen && (
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4 pt-0">
              {photoUrls.map((u, i) => (
                <a key={i} href={u} target="_blank" rel="noreferrer" className="block rounded-xl overflow-hidden border border-border">
                  <img src={u} alt={`Сторінка ${i + 1}`} loading="lazy" className="w-full h-auto" />
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {stage === "read" && (
        <>
          <div className="rounded-2xl border border-border bg-card p-5 lg:p-7 text-lg lg:text-xl leading-loose whitespace-pre-wrap">
            {parts.map((p, i) => {
              if (p.text !== undefined) return <span key={i}>{p.text}</span>;
              const gap = p.gap!;
              const picked = answers[gap.n];
              const ok = picked && norm(picked) === norm(gap.answer);
              return (
                <span key={i} className="relative inline-block align-baseline mx-0.5">
                  <button
                    onClick={() => setOpenGap(openGap === gap.n ? null : gap.n)}
                    disabled={!canAnswer && !picked}
                    className={`px-3 py-0.5 rounded-lg border-2 font-bold transition ${
                      picked
                        ? ok
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "border-red-500 bg-red-500/10 text-red-600"
                        : "border-dashed border-primary/60 bg-primary/5 text-primary hover:bg-primary/10"
                    }`}
                  >
                    {picked || `___${gap.n}`}
                    {picked && (ok ? <Check className="inline w-4 h-4 ml-1" /> : <X className="inline w-4 h-4 ml-1" />)}
                  </button>

                  <AnimatePresence>
                    {openGap === gap.n && (
                      <motion.div
                        initial={{ opacity: 0, y: -6, scale: 0.97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -6, scale: 0.97 }}
                        className="absolute left-0 top-full mt-1.5 z-30 w-56 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
                      >
                        {picked ? (
                          <div className="p-3 text-sm">
                            <div className={ok ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                              {ok ? "Правильно!" : `Правильно: ${gap.answer}`}
                            </div>
                            {gap.explanation && <div className="text-muted-foreground mt-1 text-xs">{gap.explanation}</div>}
                          </div>
                        ) : (
                          gap.options.map((opt, oi) => (
                            <button
                              key={oi}
                              onClick={() => pickGap(gap, opt)}
                              className="w-full text-left px-4 py-2.5 text-base hover:bg-primary/10 border-b border-border last:border-0"
                            >
                              {opt}
                            </button>
                          ))
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </span>
              );
            })}
          </div>

          {quiz.length > 0 && (
            <button
              onClick={() => { setStage("quiz"); setQIndex(0); setQPick(null); }}
              className={`w-full py-4 rounded-2xl font-display font-black text-lg transition flex items-center justify-center gap-2 ${
                filled === gaps.length && gaps.length > 0
                  ? "bg-primary text-primary-foreground shadow-lg hover:opacity-90"
                  : "bg-muted text-foreground hover:bg-muted/70"
              }`}
            >
              <BookOpenCheck className="w-5 h-5" /> Gelesen! → {quiz.length} питань
            </button>
          )}
        </>
      )}

      {stage === "quiz" && currentQ && (
        <div className="space-y-5">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${((qIndex + (qPick ? 1 : 0)) / quiz.length) * 100}%` }}
            />
          </div>
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Питання {qIndex + 1} / {quiz.length}
          </div>
          <h4 className="text-xl lg:text-3xl font-display font-black">{currentQ.question}</h4>
          <div className="grid gap-3">
            {currentQ.options.map((opt, i) => {
              const isPicked = qPick === opt;
              const isRight = norm(opt) === norm(currentQ.answer);
              const show = !!qPick;
              return (
                <button
                  key={i}
                  onClick={() => answerQuiz(opt)}
                  disabled={!!qPick || !canAnswer}
                  className={`px-5 py-4 rounded-2xl border-2 text-left text-lg transition flex items-center gap-3 ${
                    show && isRight
                      ? "border-emerald-500 bg-emerald-500/10"
                      : show && isPicked
                        ? "border-red-500 bg-red-500/10"
                        : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <span className="font-bold text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                  <span className="flex-1">{opt}</span>
                  {show && isRight && <Check className="w-5 h-5 text-emerald-600" />}
                  {show && isPicked && !isRight && <X className="w-5 h-5 text-red-600" />}
                </button>
              );
            })}
          </div>
          {qPick && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
              {currentQ.explanation && (
                <div className="px-4 py-3 rounded-2xl bg-muted text-sm">{currentQ.explanation}</div>
              )}
              <button
                onClick={nextQuestion}
                className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-display font-black text-lg"
              >
                {qIndex + 1 < quiz.length ? "Далі →" : "Результат"}
              </button>
            </motion.div>
          )}
        </div>
      )}

      {stage === "result" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-3xl border border-border bg-card p-8 text-center space-y-4"
        >
          <Trophy className="w-14 h-14 mx-auto text-primary" />
          <h4 className="text-3xl font-display font-black">
            {qCorrect} / {quiz.length}
          </h4>
          <p className="text-muted-foreground">
            {qCorrect / Math.max(1, quiz.length) >= 0.8
              ? "Sehr gut! Чудова робота 🎉"
              : qCorrect / Math.max(1, quiz.length) >= 0.5
                ? "Gut! Ще трохи практики 💪"
                : "Прочитаймо текст ще раз разом 🐼"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => { setStage("read"); setOpenGap(null); }}
              className="px-5 py-2.5 rounded-xl bg-muted font-bold inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> До тексту
            </button>
            <button
              onClick={() => { setQAnswers({}); setQIndex(0); setQPick(null); setStage("quiz"); }}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Пройти ще раз
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ReadingTaskView;
