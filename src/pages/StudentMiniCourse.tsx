import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, Check, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import LessonReader from "@/components/blocks/LessonReader";
import PandaLookupFab from "@/components/dictionary/PandaLookup";
import { loadMiniCourseTask, type MiniCourseTask } from "@/lib/minicourse";

interface Result {
  score: number;
  max: number;
}

/** Мінікурс учня: теми зліва, теорія і завдання справа. */
export default function StudentMiniCourse() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<MiniCourseTask | null>(null);
  const [active, setActive] = useState(0);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const storageKey = `minicourse:${user?.id ?? "guest"}:${id}`;

  useEffect(() => {
    if (!id || !user) return;
    (async () => {
      const t = await loadMiniCourseTask(id);
      setTask(t);
      setFinished(!!t && t.status !== "assigned" && t.status !== "in_progress");
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
        if (saved.results) setResults(saved.results);
        if (typeof saved.active === "number") setActive(saved.active);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [id, user, storageKey]);

  const sections = task?.sections ?? [];
  const section = sections[active];
  const doneCount = sections.filter((s) => results[s.id]).length;

  const totals = useMemo(() => {
    let score = 0;
    let max = 0;
    Object.values(results).forEach((r) => {
      score += r.score;
      max += r.max;
    });
    return { score, max, percent: max > 0 ? Math.round((score / max) * 100) : 0 };
  }, [results]);

  const persist = (next: Record<string, Result>, nextActive: number) => {
    localStorage.setItem(storageKey, JSON.stringify({ results: next, active: nextActive }));
  };

  const finishCourse = async (all: Record<string, Result>) => {
    if (!user || !task || submittingRef.current || finished) throw new Error("Курс уже здається або завершений");
    submittingRef.current = true;
    setSubmitting(true);
    let score = 0;
    let max = 0;
    Object.values(all).forEach((r) => {
      score += r.score;
      max += r.max;
    });
    const percent = max > 0 ? Math.round((score / max) * 100) : 0;
    try {
      const { data: existing, error: lookupError } = await supabase.from("student_submissions").select("id").eq("assignment_id", task.id).eq("student_id", user.id).limit(1);
      if (lookupError) throw lookupError;
      if (!existing?.length) {
        const { error } = await supabase.from("student_submissions").insert({
          assignment_id: task.id,
          student_id: user.id,
          answers: { score, max, sections: all } as any,
          auto_score: percent,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      const { error: statusError } = await supabase.from("student_assignments").update({ status: "submitted" }).eq("id", task.id);
      if (statusError) throw statusError;
      setFinished(true);
      confetti({ particleCount: 180, spread: 90, origin: { y: 0.7 } });
      toast.success(`Курс пройдено! Результат ${percent}%`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const completeSection = async (score: number, max: number, values?: Record<string, any>) => {
    if (!section || submitting || finished) throw new Error("Зачекайте на завершення здачі");
    const next = { ...results, [section.id]: { score, max, values: values ?? {} } as any };
    const isLast = active >= sections.length - 1;
    const nextActive = isLast ? active : active + 1;
    if (Object.keys(next).length >= sections.length) {
      await finishCourse(next);
    }
    setResults(next);
    persist(next, nextActive);
    if (Object.keys(next).length < sections.length) {
      setActive(nextActive);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!task) return null;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate("/academy")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold">{task.title}</h1>
            <p className="text-[11px] text-muted-foreground">
              Тема {Math.min(active + 1, sections.length)} з {sections.length}
              {task.level ? ` · ${task.level}` : ""}
              {finished ? ` · пройдено ${totals.percent}%` : ""}
            </p>
          </div>
        </div>
        <div className="h-1 w-full bg-muted">
          <div
            className="h-1 bg-primary transition-all"
            style={{ width: `${sections.length ? (doneCount / sections.length) * 100 : 0}%` }}
          />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:flex-row">
        <nav className="flex gap-2 overflow-x-auto pb-1 md:w-60 md:flex-col md:overflow-visible">
          {sections.map((s, i) => {
            const done = !!results[s.id];
            const isActive = i === active;
            return (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                className={`flex min-w-[10rem] items-center gap-2 rounded-2xl border p-3 text-left shadow-sm transition ${
                  isActive
                    ? "border-primary ring-2 ring-primary/30 bg-primary/5"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <span className="text-lg">{s.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold">{s.title}</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {done ? `${results[s.id].score}/${results[s.id].max} балів` : `${s.blocks.length} завдань`}
                  </span>
                </span>
                {done && <Check className="h-4 w-4 shrink-0 text-emerald-600" />}
              </button>
            );
          })}
        </nav>

        <section className="min-w-0 flex-1">
          {finished && (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-50 p-4 text-emerald-800">
              <Trophy className="h-5 w-5" />
              <div className="text-sm font-bold">
                Курс пройдено · результат {totals.percent}% ({totals.score}/{totals.max})
              </div>
            </div>
          )}

            {section && (
              <div
                key={section.id}
              >
              <LessonReader title={task.title} level={task.level} sections={[section]} pagePaths={task.pagePaths} imageBucket={task.presentationId ? "presentation-slides" : "tutoring-materials"} readOnly={finished || !!results[section.id]} showActions={!finished && !results[section.id]} onSubmitted={completeSection} draftKey={`klar:minicourse:${user?.id}:${id}`} />

                {(finished || results[section.id]) && active < sections.length - 1 && (
                  <button
                    onClick={() => {
                      setActive(active + 1);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
                  >
                    Наступна тема <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
        </section>
      </main>

      <PandaLookupFab label="Словник" />
    </div>
  );
}
