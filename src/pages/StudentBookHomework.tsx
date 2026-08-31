import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, BookMarked, CheckCircle2, Send, ZoomIn, X, Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { signedPageUrl, signedAudioUrl, type BookTaskContent } from "@/lib/books";
import BookTheoryBlock from "@/components/books/BookTheoryBlock";
import { toast } from "sonner";

interface BookTaskItem {
  prompt: string;
  options?: string[];
  correct_index?: number | null;
  answer?: string | null;
}

interface BookTaskPayload {
  id: string;
  code: string | null;
  kind: string | null;
  title: string | null;
  instructions: string | null;
  format: "choice" | "gap" | "open" | "audio" | "theory";
  theory?: BookTaskContent | null;
  items: BookTaskItem[];
  page_number: number | null;
  image_path: string | null;
}

interface AudioPayload {
  id: string;
  title: string;
  track_no: number | null;
  file_path: string;
}

interface Assignment {
  id: string;
  title: string;
  instructions: string | null;
  level: string | null;
  due_at: string | null;
  status: string;
  payload: {
    book?: { title?: string; kind?: string };
    tasks?: BookTaskPayload[];
    audio?: AudioPayload[];
  };
}


const KIND_LABEL: Record<string, string> = {
  reading: "Читання",
  listening: "Аудіювання",
  grammar: "Граматика",
  writing: "Письмо",
  speaking: "Говоріння",
  vocab: "Лексика",
  theory: "Теорія",
};

const isTheory = (t: BookTaskPayload) => t.format === "theory" || t.kind === "theory";

export default function StudentBookHomework() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, Record<number, string | number>>>({});
  const [pageUrls, setPageUrls] = useState<Record<string, string>>({});
  const [zoom, setZoom] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ correct: number; total: number; score: number | null } | null>(null);

  const storageKey = `klar-book-hw-${id}`;

  useEffect(() => {
    if (!user || !id) return;
    (async () => {
      const { data, error } = await supabase
        .from("student_assignments")
        .select("id, title, instructions, level, due_at, status, payload")
        .eq("id", id)
        .maybeSingle();
      if (error || !data) {
        toast.error("Завдання не знайдено");
        setLoading(false);
        return;
      }
      setAssignment(data as any);

      const paths = [
        ...new Set(((data as any).payload?.tasks ?? []).map((t: BookTaskPayload) => t.image_path).filter(Boolean)),
      ] as string[];
      const urls: Record<string, string> = {};
      await Promise.all(
        paths.map(async (p) => {
          const u = await signedPageUrl(p);
          if (u) urls[p] = u;
        }),
      );
      setPageUrls(urls);

      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { setAnswers(JSON.parse(saved)); } catch { /* ignore */ }
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  useEffect(() => {
    if (Object.keys(answers).length) localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, storageKey]);

  const allBlocks = useMemo(() => assignment?.payload?.tasks ?? [], [assignment]);
  const theoryBlocks = useMemo(() => allBlocks.filter(isTheory), [allBlocks]);
  const tasks = useMemo(() => allBlocks.filter((t) => !isTheory(t)), [allBlocks]);
  const done = assignment?.status === "submitted" || assignment?.status === "graded";

  const setAnswer = (taskId: string, index: number, value: string | number) =>
    setAnswers((prev) => ({ ...prev, [taskId]: { ...(prev[taskId] ?? {}), [index]: value } }));

  const submit = async () => {
    if (!assignment) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-student-assignment", {
        body: {
          assignment_id: assignment.id,
          book_answers: tasks.map((t) => ({
            task_id: t.id,
            answers: t.items.map((_, i) => answers[t.id]?.[i] ?? null),
          })),
        },
      });
      if (error) throw error;
      const res = data as any;
      if (res?.error) throw new Error(res.error);
      setResult({ correct: res.correct ?? 0, total: res.total ?? 0, score: res.auto_score ?? null });
      setAssignment({ ...assignment, status: "submitted" });
      localStorage.removeItem(storageKey);
      toast.success("Домашку відправлено викладачу");
    } catch (e: any) {
      toast.error(e?.message ?? "Не вдалося відправити");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Завдання недоступне.
        <button onClick={() => navigate("/assignments")} className="ml-2 underline">До завдань</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 pb-28 pt-4">
      <button
        onClick={() => navigate("/assignments")}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Завдання
      </button>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3">
        <div className="flex items-center gap-2 text-primary">
          <BookMarked className="w-5 h-5" />
          <span className="text-xs font-medium uppercase tracking-wide">
            {assignment.payload?.book?.title ?? "Підручник"}
          </span>
        </div>
        <h1 className="mt-1 text-2xl font-bold">{assignment.title}</h1>
        {assignment.instructions && (
          <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{assignment.instructions}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {assignment.level && <span>Рівень {assignment.level}</span>}
          {assignment.due_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              до {new Date(assignment.due_at).toLocaleString("uk-UA")}
            </span>
          )}
        </div>
      </motion.div>

      {(done || result) && (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4" /> Домашку здано
          </div>
          {result && result.total > 0 && (
            <p className="mt-1">Автоперевірка: {result.correct}/{result.total} ({result.score ?? 0}%)</p>
          )}
        </div>
      )}

      {theoryBlocks.length > 0 && (
        <div className="mt-6 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Теорія до завдання
          </h2>
          {theoryBlocks.map((t) => (
            <BookTheoryBlock
              key={t.id}
              title={t.title}
              content={t.theory ?? { summary: t.instructions }}
            />
          ))}
        </div>
      )}

      <div className="mt-6 space-y-6">
        {tasks.map((t) => (
          <div key={t.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              {t.code && (
                <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                  №{t.code}
                </span>
              )}
              <h2 className="text-base font-semibold">{t.title || "Вправа"}</h2>
              <span className="text-xs text-muted-foreground">
                {KIND_LABEL[t.kind ?? ""] ?? ""}{t.page_number ? ` · с. ${t.page_number}` : ""}
              </span>
            </div>
            {t.instructions && (
              <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-wrap">{t.instructions}</p>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {/* original page scan */}
              {t.image_path && pageUrls[t.image_path] && (
                <button
                  onClick={() => setZoom(pageUrls[t.image_path!])}
                  className="relative group rounded-xl overflow-hidden border border-border"
                >
                  <img
                    src={pageUrls[t.image_path]}
                    alt={`Сторінка ${t.page_number ?? ""} підручника`}
                    loading="lazy"
                    className="w-full"
                  />
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-background/90 text-xs">
                    <ZoomIn className="w-3.5 h-3.5" /> Збільшити
                  </span>
                </button>
              )}

              {/* answers */}
              <div className="space-y-3">
                {t.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Виконайте вправу в зошиті — викладач перевірить на уроці.
                  </p>
                )}
                {t.items.map((it, i) => (
                  <div key={i} className="rounded-xl bg-muted/40 p-3">
                    <p className="text-sm font-medium">{i + 1}. {it.prompt}</p>
                    {t.format === "choice" && it.options?.length ? (
                      <div className="mt-2 space-y-1.5">
                        {it.options.map((opt, oi) => {
                          const on = answers[t.id]?.[i] === oi;
                          return (
                            <button
                              key={oi}
                              disabled={done}
                              onClick={() => setAnswer(t.id, i, oi)}
                              className={`w-full text-left px-3 py-2 rounded-lg border text-sm transition-colors ${
                                on ? "border-primary bg-primary/10" : "border-border hover:bg-accent"
                              } disabled:opacity-60`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <textarea
                        disabled={done}
                        value={String(answers[t.id]?.[i] ?? "")}
                        onChange={(e) => setAnswer(t.id, i, e.target.value)}
                        rows={t.format === "gap" ? 1 : 3}
                        placeholder={t.format === "gap" ? "Ваша відповідь" : "Напишіть відповідь…"}
                        className="mt-2 w-full px-3 py-2 rounded-lg border border-border bg-background text-sm disabled:opacity-60"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {!done && (
        <div className="fixed bottom-20 left-0 right-0 px-4 md:bottom-6">
          <div className="max-w-5xl mx-auto">
            <button
              onClick={submit}
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold shadow-lg disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Відправити домашку
            </button>
          </div>
        </div>
      )}

      {zoom && (
        <div className="fixed inset-0 z-50 bg-background/95 p-4 overflow-auto" onClick={() => setZoom(null)}>
          <button className="fixed top-4 right-4 p-2 rounded-full bg-card border border-border">
            <X className="w-5 h-5" />
          </button>
          <img src={zoom} alt="Сторінка підручника" className="mx-auto max-w-3xl w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
