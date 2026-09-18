import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { ArrowLeft, ArrowRight, Check, Loader2, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import PandaLookupFab from "@/components/dictionary/PandaLookup";
import { kitBlocksToLessonBlocks } from "@/lib/lesson-kits";
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

  const storageKey = `minicourse:${id}`;

  useEffect(() => {
    if (!id) return;
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
  }, [id, storageKey]);

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
    if (!user || !task) return;
    let score = 0;
    let max = 0;
    Object.values(all).forEach((r) => {
      score += r.score;
      max += r.max;
    });
    const percent = max > 0 ? Math.round((score / max) * 100) : 0;
    const { error } = await supabase.from("student_submissions").insert({
      assignment_id: task.id,
      student_id: user.id,
      answers: { score, max, sections: all } as any,
      auto_score: percent,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    await supabase.from("student_assignments").update({ status: "submitted" }).eq("id", task.id);
    setFinished(true);
    confetti({ particleCount: 180, spread: 90, origin: { y: 0.7 } });
    toast.success(`Курс пройдено! Результат ${percent}%`);
  };

  const completeSection = async (score: number, max: number) => {
    if (!section) return;
    const next = { ...results, [section.id]: { score, max } };
    setResults(next);
    const isLast = active >= sections.length - 1;
    const nextActive = isLast ? active : active + 1;
    persist(next, nextActive);
    if (Object.keys(next).length >= sections.length) {
      await finishCourse(next);
    } else {
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
          <button onClick={() => navigate("/assignments")} className="text-muted-foreground hover:text-foreground">
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

          <AnimatePresence mode="wait">
            {section && (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22 }}
              >
                <div className="mb-4 rounded-2xl border-l-4 border-l-primary border border-border bg-card p-4">
                  <h2 className="text-base font-display font-black">
                    <span className="mr-2">{section.emoji}</span>
                    {section.title}
                  </h2>
                  {section.summary && <p className="mt-1 text-xs text-muted-foreground">{section.summary}</p>}
                </div>

                <StudentBlocks
                  blocks={kitBlocksToLessonBlocks(section.blocks, `mc-${section.id}`)}
                  persist={false}
                  readOnly={finished}
                  showActions={!finished}
                  onSubmitted={completeSection}
                />

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
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <PandaLookupFab label="Словник" />
    </div>
  );
}
