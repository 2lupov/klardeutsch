import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Clock, CheckCircle2, Trophy, Loader2, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { fetchEdgeFunction } from "@/lib/auth-fetch";

interface Question {
  id: string;
  level: string;
  question_type: string;
  question: string;
  context: string | null;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

interface AIAnalysis {
  summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  skill_breakdown?: Record<string, string>;
  recommended_topics?: { topic: string; why: string; priority: string }[];
  first_3_lessons?: { focus: string; goals: string; exercises: string }[];
  warning?: string | null;
}

interface Assignment {
  id: string;
  teacher_id: string;
  student_id: string;
  status: string;
  question_ids: string[];
  answers: number[];
  scores_by_level: Record<string, { correct: number; total: number }>;
  recommended_level: string | null;
  total_score: number;
  total_questions: number;
  duration_seconds: number | null;
  started_at: string | null;
  completed_at: string | null;
  ai_analysis: AIAnalysis | null;
  selected_levels?: string[];
}

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-emerald-500", A2: "bg-blue-500", B1: "bg-amber-500",
  B2: "bg-orange-500", C1: "bg-rose-500",
};

export default function PlacementTest() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [now, setNow] = useState<number>(Date.now());

  // Timer
  useEffect(() => {
    if (assignment?.status !== "in_progress") return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [assignment?.status]);

  const elapsed = useMemo(() => {
    if (!startTime) return 0;
    return Math.floor((now - startTime) / 1000);
  }, [startTime, now]);

  const remaining = Math.max(0, 15 * 60 - elapsed);
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      setLoading(true);
      const { data: ass, error } = await supabase
        .from("tutoring_placement_assignments")
        .select("*")
        .eq("id", id)
        .single();
      if (error || !ass) { toast.error(t("Тест не знайдено", "Тест не найден")); navigate("/tutoring"); return; }
      setAssignment(ass as any);
      setAnswers((ass.answers as number[]) || []);

      const { data: qs } = await supabase
        .from("tutoring_placement_questions")
        .select("id, level, question_type, question, context, options, correct_index, explanation")
        .in("id", ass.question_ids as string[]);
      // preserve order from question_ids
      const map = new Map((qs || []).map((q: any) => [q.id, q]));
      const ordered = (ass.question_ids as string[]).map((qid) => map.get(qid)).filter(Boolean) as any[];
      setQuestions(ordered);

      if (ass.status === "in_progress" && ass.started_at) {
        setStartTime(new Date(ass.started_at).getTime());
      }
      setLoading(false);
    })();
  }, [id, user]);

  const startTest = async () => {
    if (!assignment) return;
    const startedAt = new Date().toISOString();
    const { error } = await supabase
      .from("tutoring_placement_assignments")
      .update({ status: "in_progress", started_at: startedAt })
      .eq("id", assignment.id);
    if (error) return toast.error(error.message);
    setAssignment({ ...assignment, status: "in_progress", started_at: startedAt });
    setStartTime(new Date(startedAt).getTime());
  };

  const selectAnswer = async (optionIdx: number) => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = optionIdx;
    setAnswers(newAnswers);
    // save partial progress (silent)
    if (assignment) {
      await supabase
        .from("tutoring_placement_assignments")
        .update({ answers: newAnswers })
        .eq("id", assignment.id);
    }
    // auto-advance
    setTimeout(() => {
      if (currentIdx < questions.length - 1) setCurrentIdx(currentIdx + 1);
    }, 200);
  };

  const submitTest = async () => {
    if (!assignment || !questions.length) return;
    setSubmitting(true);
    // compute scores per level
    const scoresByLevel: Record<string, { correct: number; total: number }> = {};
    let totalCorrect = 0;
    questions.forEach((q, i) => {
      if (!scoresByLevel[q.level]) scoresByLevel[q.level] = { correct: 0, total: 0 };
      scoresByLevel[q.level].total++;
      if (answers[i] === q.correct_index) {
        scoresByLevel[q.level].correct++;
        totalCorrect++;
      }
    });

    // recommend level: highest level where >= 60% correct
    const levelOrder = ["A1", "A2", "B1", "B2", "C1"];
    let recommended = "A1";
    for (const lvl of levelOrder) {
      const s = scoresByLevel[lvl];
      if (s && s.total > 0 && s.correct / s.total >= 0.6) {
        recommended = lvl;
      } else if (s && s.total > 0) {
        break;
      }
    }

    const duration = Math.floor((Date.now() - startTime) / 1000);
    const { error } = await supabase
      .from("tutoring_placement_assignments")
      .update({
        status: "completed",
        answers,
        scores_by_level: scoresByLevel,
        recommended_level: recommended,
        total_score: totalCorrect,
        total_questions: questions.length,
        duration_seconds: duration,
        completed_at: new Date().toISOString(),
      })
      .eq("id", assignment.id);
    if (error) {
      setSubmitting(false);
      return toast.error(error.message);
    }
    setAssignment({
      ...assignment,
      status: "completed",
      answers,
      scores_by_level: scoresByLevel,
      recommended_level: recommended,
      total_score: totalCorrect,
      total_questions: questions.length,
      duration_seconds: duration,
    });
    toast.success(t("Тест завершено! AI аналізує…", "Тест завершён! AI анализирует…"));

    // Trigger AI analysis (async)
    try {
      const res = await fetchEdgeFunction("analyze-placement-test", {
        json: { assignmentId: assignment.id },
      });
      const data = await res.json();
      if (res.ok && data.analysis) {
        setAssignment((prev) => prev ? { ...prev, ai_analysis: data.analysis } : prev);
        toast.success(t("AI-аналіз готовий", "AI-анализ готов"));
      } else {
        console.error("AI analysis failed:", data);
      }
    } catch (e) {
      console.error("AI analysis error:", e);
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit on time-up
  useEffect(() => {
    if (assignment?.status === "in_progress" && remaining === 0 && elapsed > 0) {
      submitTest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, assignment?.status]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!assignment) return null;

  const isStudent = user?.id === assignment.student_id;

  // ============ RESULTS VIEW ============
  if (assignment.status === "completed") {
    const percent = assignment.total_questions > 0
      ? Math.round((assignment.total_score / assignment.total_questions) * 100)
      : 0;
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          <Button variant="ghost" onClick={() => navigate("/tutoring")} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" /> {t("Назад", "Назад")}
          </Button>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex w-20 h-20 rounded-full bg-primary/10 items-center justify-center mb-4">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-bold mb-2">{t("Результат тесту", "Результат теста")}</h1>
            <p className="text-muted-foreground">
              {t("Тривалість", "Длительность")}: {Math.floor((assignment.duration_seconds || 0) / 60)} {t("хв", "мин")}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <p className="text-sm text-muted-foreground mb-1">{t("Загальний бал", "Общий балл")}</p>
              <p className="text-4xl font-bold">{assignment.total_score}/{assignment.total_questions}</p>
              <p className="text-sm text-muted-foreground mt-1">{percent}%</p>
            </div>
            <div className="p-6 rounded-2xl bg-primary text-primary-foreground text-center">
              <p className="text-sm opacity-90 mb-1">{t("Рекомендований рівень", "Рекомендуемый уровень")}</p>
              <p className="text-4xl font-bold flex items-center justify-center gap-2">
                <Award className="w-8 h-8" /> {assignment.recommended_level}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-6">
            <h2 className="font-bold mb-4">{t("Деталі по рівнях", "Детали по уровням")}</h2>
            <div className="space-y-3">
              {["A1","A2","B1","B2","C1"].map((lvl) => {
                const s = assignment.scores_by_level?.[lvl];
                if (!s) return null;
                const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                return (
                  <div key={lvl}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${LEVEL_COLORS[lvl]}`}></span>
                        {lvl}
                      </span>
                      <span className="text-sm text-muted-foreground">{s.correct}/{s.total} • {pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${LEVEL_COLORS[lvl]}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============ INTRO VIEW ============
  if (assignment.status === "pending") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full p-8 rounded-3xl bg-card border border-border text-center"
        >
          <div className="inline-flex w-16 h-16 rounded-2xl bg-primary/10 items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-2">{t("Тест на визначення рівня", "Тест на определение уровня")}</h1>
          <p className="text-muted-foreground mb-6">
            {t(
              `${questions.length} питань, 15 хвилин. Питання охоплюють усі рівні від A1 до C1.`,
              `${questions.length} вопросов, 15 минут. Вопросы охватывают все уровни от A1 до C1.`
            )}
          </p>
          <ul className="text-sm text-left space-y-2 mb-6 text-muted-foreground">
            <li>• {t("Граматика та лексика", "Грамматика и лексика")}</li>
            <li>• {t("Заповнення пропусків", "Заполнение пропусков")}</li>
            <li>• {t("Читання й розуміння", "Чтение и понимание")}</li>
            <li>• {t("Відповідайте чесно — без використання словників", "Отвечайте честно — без словарей")}</li>
          </ul>
          {isStudent ? (
            <Button onClick={startTest} size="lg" className="w-full">
              {t("Почати тест", "Начать тест")}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{t("Очікує початку учнем", "Ожидает начала учеником")}</p>
          )}
        </motion.div>
      </div>
    );
  }

  // ============ TEST VIEW ============
  if (!isStudent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-muted-foreground">{t("Учень проходить тест...", "Ученик проходит тест...")}</p>
      </div>
    );
  }

  const q = questions[currentIdx];
  if (!q) return null;
  const answered = answers[currentIdx] !== undefined;
  const allAnswered = answers.filter((a) => a !== undefined).length === questions.length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <div className="flex-1">
            <Progress value={((currentIdx + 1) / questions.length) * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {currentIdx + 1} / {questions.length}
            </p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono font-bold ${remaining < 60 ? "bg-destructive/20 text-destructive" : "bg-muted"}`}>
            <Clock className="w-4 h-4" />
            {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span className={`text-xs font-bold px-2 py-1 rounded-full text-white ${LEVEL_COLORS[q.level]}`}>
                {q.level}
              </span>
              <span className="text-xs text-muted-foreground uppercase">{q.question_type}</span>
            </div>
            {q.context && (
              <div className="p-4 mb-4 rounded-2xl bg-muted text-sm leading-relaxed">
                {q.context}
              </div>
            )}
            <h2 className="text-xl md:text-2xl font-bold mb-6">{q.question}</h2>
            <div className="space-y-3">
              {q.options.map((opt, i) => (
                <motion.button
                  key={i}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectAnswer(i)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                    answers[currentIdx] === i
                      ? "border-primary bg-primary/10 font-bold"
                      : "border-border bg-card hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      answers[currentIdx] === i ? "bg-primary text-primary-foreground" : "bg-muted"
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </div>
                    <span className="flex-1">{opt}</span>
                    {answers[currentIdx] === i && <CheckCircle2 className="w-5 h-5 text-primary" />}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer nav */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <Button
            variant="outline"
            onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
            disabled={currentIdx === 0}
          >
            {t("Назад", "Назад")}
          </Button>
          {currentIdx < questions.length - 1 ? (
            <Button onClick={() => setCurrentIdx(currentIdx + 1)} disabled={!answered}>
              {t("Далі", "Далее")}
            </Button>
          ) : (
            <Button onClick={submitTest} disabled={!allAnswered || submitting} className="bg-primary">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Завершити тест", "Завершить тест")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
