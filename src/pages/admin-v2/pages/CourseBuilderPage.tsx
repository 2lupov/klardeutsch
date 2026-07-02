import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { Sparkles, Play, CheckCircle2, XCircle, Loader2, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAdminLang } from "../LanguageContext";

interface Course {
  id: string;
  title: string;
  level: string | null;
  target_language: string | null;
  total_lessons: number | null;
}

type BatchStatus = "pending" | "running" | "done" | "error";
interface Batch { start: number; size: number; status: BatchStatus; message?: string; }

const BATCH_SIZE = 5;
const TOTAL_TOPICS = 25;

export default function CourseBuilderPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [running, setRunning] = useState(false);
  const [existingLessons, setExistingLessons] = useState(0);

  const selected = courses.find((c) => c.id === selectedId);

  const loadCourses = async () => {
    const { data } = await supabase
      .from("courses")
      .select("id,title,level,target_language,total_lessons")
      .order("created_at", { ascending: false });
    setCourses((data as any) || []);
  };

  const loadLessonCount = async (courseId: string) => {
    const { count } = await supabase
      .from("course_lessons")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId);
    setExistingLessons(count || 0);
  };

  useEffect(() => { loadCourses(); }, []);

  useEffect(() => {
    const h = (e: any) => setSelectedId(e.detail?.courseId);
    window.addEventListener("admin-v2:open-builder", h);
    return () => window.removeEventListener("admin-v2:open-builder", h);
  }, []);

  useEffect(() => {
    if (selectedId) loadLessonCount(selectedId);
  }, [selectedId]);

  const initBatches = () => {
    const arr: Batch[] = [];
    for (let s = 0; s < TOTAL_TOPICS; s += BATCH_SIZE) {
      arr.push({ start: s, size: Math.min(BATCH_SIZE, TOTAL_TOPICS - s), status: "pending" });
    }
    setBatches(arr);
  };

  const runGeneration = async () => {
    if (!selected) return;
    initBatches();
    setRunning(true);

    const level = selected.level || "A1";
    const total = Math.ceil(TOTAL_TOPICS / BATCH_SIZE);

    for (let i = 0; i < total; i++) {
      const start = i * BATCH_SIZE;
      const size = Math.min(BATCH_SIZE, TOTAL_TOPICS - start);
      setBatches((prev) => prev.map((b) => b.start === start ? { ...b, status: "running" } : b));

      try {
        const { data, error } = await supabase.functions.invoke("generate-full-course", {
          body: { courseId: selected.id, level, batchStart: start, batchSize: size },
        });
        if (error || (data as any)?.error) throw new Error(error?.message || (data as any).error);
        setBatches((prev) => prev.map((b) => b.start === start
          ? { ...b, status: "done", message: `${(data as any).lessonsGenerated} уроків` } : b));
      } catch (e: any) {
        setBatches((prev) => prev.map((b) => b.start === start
          ? { ...b, status: "error", message: e.message } : b));
        toast({ title: `Помилка на batch ${i + 1}`, description: e.message });
      }
    }

    setRunning(false);
    await loadLessonCount(selected.id);
    await loadCourses();
    toast({ title: "Генерацію завершено" });
  };

  const doneCount = batches.filter((b) => b.status === "done").length;
  const progress = batches.length ? (doneCount / batches.length) * 100 : 0;

  if (!selectedId) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="AI Course Builder"
          subtitle="Обери курс — AI згенерує повний контент (25 уроків: теорія, слова, вправи, читання, діалоги, культурні нотатки)"
        />
        {courses.length === 0 ? (
          <EmptyState title="Немає курсів" description="Спочатку створи курс у вкладці Courses." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className="text-left">
                <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#FEF3C7", color: "#92400E" }}>{c.level}</span>
                        <span className="text-[10px] text-slate-500">{c.total_lessons || 0} уроків</span>
                      </div>
                      <h3 className="mt-2 font-semibold text-slate-900 truncate">{c.title}</h3>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={selected?.title || "Course"}
        subtitle={`Рівень ${selected?.level} • ${existingLessons} існуючих уроків`}
        action={
          <button onClick={() => setSelectedId(null)}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            ← До списку
          </button>
        }
      />

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
            <Sparkles className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Згенерувати повний курс</h3>
            <p className="text-sm text-slate-500 mt-1">
              AI створить {TOTAL_TOPICS} уроків для рівня {selected?.level} батчами по {BATCH_SIZE}.
              Кожен урок: 8-15 блоків теорії, 10-15 слів, 6-8 вправ, читання, діалог, культурна нотатка.
            </p>
            {existingLessons > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                ⚠️ У курсі вже {existingLessons} уроків — нові будуть додані додатково.
              </p>
            )}
            <button
              onClick={runGeneration}
              disabled={running}
              className="mt-4 px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{ background: "#4F46E5" }}>
              {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {running ? "Генерація..." : "Запустити генерацію"}
            </button>
          </div>
        </div>
      </Card>

      {batches.length > 0 && (
        <Card className="p-6">
          <SectionHeader title="Прогрес" subtitle={`${doneCount} / ${batches.length} батчів`} />
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div className="h-full transition-all" style={{ width: `${progress}%`, background: "#4F46E5" }} />
          </div>
          <div className="space-y-2">
            {batches.map((b) => (
              <div key={b.start} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                <div className="w-5 h-5 shrink-0">
                  {b.status === "done" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {b.status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                  {b.status === "running" && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
                  {b.status === "pending" && <div className="w-3 h-3 mt-1 ml-1 rounded-full bg-slate-300" />}
                </div>
                <div className="flex-1 text-sm">
                  <span className="text-slate-700 font-medium">
                    Уроки {b.start + 1}—{b.start + b.size}
                  </span>
                  {b.message && (
                    <span className={`ml-2 text-xs ${b.status === "error" ? "text-red-500" : "text-slate-500"}`}>
                      {b.message}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
