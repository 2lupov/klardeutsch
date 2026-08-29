import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ListChecks, FileText, BookOpen, GraduationCap, ChevronRight,
  Loader2, CheckCircle2, Clock, Layers, Mic, PenLine,
} from "lucide-react";

type Tab = "tests" | "homework" | "reading" | "courses";

interface Row {
  id: string;
  title: string;
  subtitle?: string;
  route: string;
  done: boolean;
  badge?: string;
  due_at?: string | null;
  icon: any;
}

const StudentAcademy = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("tests");
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Row[]>([]);
  const [homework, setHomework] = useState<Row[]>([]);
  const [reading, setReading] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // Assignments from teacher
      const { data: tasks } = await supabase
        .from("student_assignments")
        .select("id, type, title, instructions, status, due_at, payload, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      // Lesson homework
      const { data: lessons } = await supabase
        .from("tutoring_lessons")
        .select("id, title")
        .eq("student_id", user.id);
      const lessonIds = (lessons ?? []).map((l) => l.id);
      const lessonTitle = new Map((lessons ?? []).map((l) => [l.id, l.title]));
      const { data: hw } = lessonIds.length
        ? await supabase
            .from("tutoring_homework")
            .select("id, lesson_id, description, status, due_at, created_at")
            .in("lesson_id", lessonIds)
            .order("created_at", { ascending: false })
        : { data: [] as any[] };

      // Courses the student has access to
      const { data: purchases } = await supabase
        .from("course_purchases")
        .select("course_id")
        .eq("user_id", user.id);
      const courseIds = (purchases ?? []).map((p) => p.course_id);
      const { data: courseRows } = courseIds.length
        ? await supabase
            .from("courses")
            .select("id, title, description, level, total_lessons")
            .in("id", courseIds)
        : { data: [] as any[] };

      // Reading lessons inside those courses
      const { data: readLessons } = courseIds.length
        ? await supabase
            .from("course_lessons")
            .select("id, course_id, title, lesson_type, sort_order")
            .in("course_id", courseIds)
            .in("lesson_type", ["reading", "article", "dialogue_text"])
            .order("sort_order")
        : { data: [] as any[] };

      const hasReadingModule = (payload: any) => {
        const mods = payload?.modules;
        if (!Array.isArray(mods)) return false;
        return mods.some((m: any) =>
          ["reading", "lesen"].includes(String(m?.type ?? m?.kind ?? "").toLowerCase())
        );
      };

      const typeIcon: Record<string, any> = {
        test: ListChecks, homework: FileText, writing: PenLine, audio: Mic, modular: Layers,
      };

      const allTasks = tasks ?? [];

      setTests(
        allTasks
          .filter((tk: any) => tk.type !== "homework" && !hasReadingModule(tk.payload))
          .map((tk: any) => ({
            id: tk.id,
            title: tk.title,
            subtitle: tk.instructions ? String(tk.instructions).slice(0, 90) : undefined,
            route: `/task/${tk.id}`,
            done: tk.status === "graded" || tk.status === "submitted",
            badge: tk.status === "graded" ? "Оцінено" : tk.status === "submitted" ? "На перевірці" : undefined,
            due_at: tk.due_at,
            icon: typeIcon[tk.type] ?? ListChecks,
          }))
      );

      setHomework([
        ...allTasks
          .filter((tk: any) => tk.type === "homework")
          .map((tk: any) => ({
            id: tk.id,
            title: tk.title,
            subtitle: tk.instructions ? String(tk.instructions).slice(0, 90) : undefined,
            route: `/task/${tk.id}`,
            done: tk.status === "graded" || tk.status === "submitted",
            badge: tk.status === "graded" ? "Оцінено" : tk.status === "submitted" ? "На перевірці" : undefined,
            due_at: tk.due_at,
            icon: FileText,
          })),
        ...(hw ?? []).map((h: any) => ({
          id: h.id,
          title: lessonTitle.get(h.lesson_id) ?? "Домашнє завдання",
          subtitle: String(h.description ?? "").slice(0, 90),
          route: `/tutoring/homework/${h.id}`,
          done: h.status === "graded" || h.status === "submitted",
          badge: h.status === "graded" ? "Оцінено" : h.status === "submitted" ? "На перевірці" : undefined,
          due_at: h.due_at,
          icon: FileText,
        })),
      ]);

      setReading([
        ...allTasks
          .filter((tk: any) => hasReadingModule(tk.payload))
          .map((tk: any) => ({
            id: tk.id,
            title: tk.title,
            subtitle: "Читання від викладача",
            route: `/task/${tk.id}`,
            done: tk.status === "graded" || tk.status === "submitted",
            due_at: tk.due_at,
            icon: BookOpen,
          })),
        ...(readLessons ?? []).map((l: any) => ({
          id: l.id,
          title: l.title,
          subtitle: "Текст з курсу",
          route: `/academy/${l.course_id}/learn`,
          done: false,
          icon: BookOpen,
        })),
      ]);

      setCourses(
        (courseRows ?? []).map((c: any) => ({
          id: c.id,
          title: c.title,
          subtitle: c.description ? String(c.description).slice(0, 90) : undefined,
          route: `/academy/${c.id}`,
          done: false,
          badge: `${c.level}${c.total_lessons ? ` · ${c.total_lessons} уроків` : ""}`,
          icon: GraduationCap,
        }))
      );

      setLoading(false);
    };
    load();
  }, [user]);

  const pending = useMemo(
    () => ({
      tests: tests.filter((r) => !r.done).length,
      homework: homework.filter((r) => !r.done).length,
      reading: reading.filter((r) => !r.done).length,
      courses: courses.length,
    }),
    [tests, homework, reading, courses]
  );

  const totalTodo = pending.tests + pending.homework;

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "tests", label: "Тести", count: pending.tests },
    { key: "homework", label: "Домашка", count: pending.homework },
    { key: "reading", label: "Читання", count: pending.reading },
    { key: "courses", label: "Курси", count: pending.courses },
  ];

  const rows = tab === "tests" ? tests : tab === "homework" ? homework : tab === "reading" ? reading : courses;

  return (
    <div className="min-h-full bg-background">
      {/* Sticky header with the todo counter */}
      <div className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Моє навчання</p>
              <h1 className="font-display text-2xl font-black leading-tight">
                {totalTodo > 0 ? `Треба зробити: ${totalTodo}` : "Усе виконано 🎉"}
              </h1>
            </div>
            {totalTodo > 0 && (
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-lg shrink-0">
                {totalTodo}
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar -mx-1 px-1">
            {tabs.map((tb) => (
              <button
                key={tb.key}
                onClick={() => setTab(tb.key)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-bold transition flex items-center gap-2 ${
                  tab === tb.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {tb.label}
                {tb.count > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      tab === tb.key ? "bg-primary-foreground/20" : "bg-muted"
                    }`}
                  >
                    {tb.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-display font-bold">Тут поки що порожньо</p>
            <p className="text-sm text-muted-foreground">Викладач додасть матеріали найближчим часом</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const Icon = r.icon;
              return (
                <button
                  key={`${tab}-${r.id}`}
                  onClick={() => navigate(r.route)}
                  className="w-full text-left flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition group"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      r.done ? "bg-green-500/15 text-green-600" : "bg-primary/10 text-primary"
                    }`}
                  >
                    {r.done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm truncate">{r.title}</p>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      {r.subtitle && (
                        <span className="text-xs text-muted-foreground truncate max-w-[220px]">{r.subtitle}</span>
                      )}
                      {r.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {r.badge}
                        </span>
                      )}
                      {r.due_at && !r.done && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          до {new Date(r.due_at).toLocaleDateString("uk-UA")}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAcademy;
