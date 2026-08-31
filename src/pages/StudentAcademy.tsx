import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ListChecks, FileText, BookOpen, GraduationCap, ChevronRight,
  Loader2, CheckCircle2, Clock, Layers, Mic, PenLine,
} from "lucide-react";
import pandaCelebrating from "@/assets/mascot/panda-celebrating.png";
import pandaSleeping from "@/assets/mascot/panda-sleeping.png";

type Tab = "tests" | "homework" | "reading" | "courses";

interface Row {
  id: string;
  title: string;
  subtitle?: string;
  route: string;
  done: boolean;
  graded: boolean;
  badge?: string;
  chip?: string;
  due_at?: string | null;
  created_at: string;
  icon: any;
}

const Stat = ({ value, label }: { value: number | string; label: string }) => (
  <div className="py-3 text-center">
    <div className="font-display font-black text-xl leading-none">{value}</div>
    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-1">{label}</div>
  </div>
);

const DueBadge = ({ due_at }: { due_at: string }) => {
  const due = new Date(due_at);
  const now = new Date();
  const overdue = due < now;
  const sameDay = due.toDateString() === now.toDateString();
  const d = due.toLocaleDateString("uk-UA", { day: "numeric", month: "short" });
  if (overdue) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 inline-flex items-center gap-1">
        <Clock className="w-3 h-3" /> термін минув ({d})
      </span>
    );
  }
  if (sameDay) {
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 inline-flex items-center gap-1">
        <Clock className="w-3 h-3" /> сьогодні
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground inline-flex items-center gap-1">
      <Clock className="w-3 h-3" /> до {d}
    </span>
  );
};

const StudentAcademy = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("tests");
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Row[]>([]);
  const [homework, setHomework] = useState<Row[]>([]);
  const [reading, setReading] = useState<Row[]>([]);
  const [courses, setCourses] = useState<Row[]>([]);
  const [stats, setStats] = useState<{ active: number; graded: number; avg: number | null }>({
    active: 0,
    graded: 0,
    avg: null,
  });

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
            .select("id, lesson_id, description, status, due_at, grade, created_at")
            .in("lesson_id", lessonIds)
            .order("created_at", { ascending: false })
        : { data: [] as any[] };

      // Submissions — grades for the average score
      const { data: subs } = await supabase
        .from("student_submissions")
        .select("assignment_id, grade, auto_score, status")
        .eq("student_id", user.id);

      // Courses the student has access to
      const { data: purchases } = await supabase
        .from("course_purchases")
        .select("course_id")
        .eq("user_id", user.id);
      const courseIds = (purchases ?? []).map((p) => p.course_id);
      const { data: courseRows } = courseIds.length
        ? await supabase
            .from("courses")
            .select("id, title, description, level, total_lessons, created_at")
            .in("id", courseIds)
        : { data: [] as any[] };

      // Reading lessons inside those courses
      const { data: readLessons } = courseIds.length
        ? await supabase
            .from("course_lessons")
            .select("id, course_id, title, lesson_type, sort_order, created_at")
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
      const typeLabel: Record<string, string> = {
        test: "Тест", homework: "ДЗ", writing: "Письмо", audio: "Аудіо", modular: "Модуль",
      };

      const allTasks = tasks ?? [];

      const testRows: Row[] = allTasks
        .filter((tk: any) => tk.type !== "homework" && !hasReadingModule(tk.payload))
        .map((tk: any) => ({
          id: tk.id,
          title: tk.title,
          subtitle: tk.instructions ? String(tk.instructions).slice(0, 90) : undefined,
          route: `/task/${tk.id}`,
          done: tk.status === "graded" || tk.status === "submitted",
          graded: tk.status === "graded",
          chip: typeLabel[tk.type] ?? "Тест",
          badge: tk.status === "graded" ? "Оцінено" : tk.status === "submitted" ? "На перевірці" : undefined,
          due_at: tk.due_at,
          created_at: tk.created_at,
          icon: typeIcon[tk.type] ?? ListChecks,
        }));

      const hwRows: Row[] = [
        ...allTasks
          .filter((tk: any) => tk.type === "homework")
          .map((tk: any) => ({
            id: tk.id,
            title: tk.title,
            subtitle: tk.instructions ? String(tk.instructions).slice(0, 90) : undefined,
            route: `/task/${tk.id}`,
            done: tk.status === "graded" || tk.status === "submitted",
            graded: tk.status === "graded",
            chip: "ДЗ",
            badge: tk.status === "graded" ? "Оцінено" : tk.status === "submitted" ? "На перевірці" : undefined,
            due_at: tk.due_at,
            created_at: tk.created_at,
            icon: FileText,
          })),
        ...(hw ?? []).map((h: any) => ({
          id: h.id,
          title: lessonTitle.get(h.lesson_id) ?? "Домашнє завдання",
          subtitle: String(h.description ?? "").slice(0, 90),
          route: `/tutoring/homework/${h.id}`,
          done: h.status === "graded" || h.status === "submitted",
          graded: h.status === "graded",
          chip: "ДЗ",
          badge: h.status === "graded" ? "Оцінено" : h.status === "submitted" ? "На перевірці" : undefined,
          due_at: h.due_at,
          created_at: h.created_at,
          icon: FileText,
        })),
      ];

      const readRows: Row[] = [
        ...allTasks
          .filter((tk: any) => hasReadingModule(tk.payload))
          .map((tk: any) => ({
            id: tk.id,
            title: tk.title,
            subtitle: "Читання від викладача",
            route: `/task/${tk.id}`,
            done: tk.status === "graded" || tk.status === "submitted",
            graded: tk.status === "graded",
            chip: "Читання",
            due_at: tk.due_at,
            created_at: tk.created_at,
            icon: BookOpen,
          })),
        ...(readLessons ?? []).map((l: any) => ({
          id: l.id,
          title: l.title,
          subtitle: "Текст з курсу",
          route: `/academy/${l.course_id}/learn`,
          done: false,
          graded: false,
          chip: "Читання",
          created_at: l.created_at,
          icon: BookOpen,
        })),
      ];

      const courseRowsArr: Row[] = (courseRows ?? []).map((c: any) => ({
        id: c.id,
        title: c.title,
        subtitle: c.description ? String(c.description).slice(0, 90) : undefined,
        route: `/academy/${c.id}`,
        done: false,
        graded: false,
        chip: "Курс",
        badge: `${c.level}`,
        created_at: c.created_at,
        icon: GraduationCap,
      }));

      setTests(testRows);
      setHomework(hwRows);
      setReading(readRows);
      setCourses(courseRowsArr);

      // Stats: active / graded / average grade (0–100)
      const active = [...testRows, ...hwRows].filter((r) => !r.done).length;
      const graded = [...testRows, ...hwRows].filter((r) => r.graded).length;
      const grades: number[] = [];
      (subs ?? []).forEach((s: any) => {
        const g = s.grade ?? s.auto_score;
        if (typeof g === "number" && Number.isFinite(g)) grades.push(g);
      });
      (hw ?? []).forEach((h: any) => {
        if (typeof h.grade === "number" && Number.isFinite(h.grade)) grades.push(h.grade);
      });
      const avg = grades.length ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;
      setStats({ active, graded, avg });

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
  const showStats = stats.active > 0 || stats.graded > 0 || stats.avg != null;

  const nextUp = useMemo(() => {
    const candidates = [...tests, ...homework].filter((r) => !r.done);
    if (!candidates.length) return null;
    const withDue = candidates
      .filter((r) => r.due_at)
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
    if (withDue.length) return withDue[0];
    return [...candidates].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [tests, homework]);

  const tabs: Array<{ key: Tab; label: string; count: number }> = [
    { key: "tests", label: "Тести", count: pending.tests },
    { key: "homework", label: "Домашка", count: pending.homework },
    { key: "reading", label: "Читання", count: pending.reading },
    { key: "courses", label: "Курси", count: pending.courses },
  ];

  const rows = tab === "tests" ? tests : tab === "homework" ? homework : tab === "reading" ? reading : courses;
  const allClear = totalTodo === 0 && tab !== "courses";

  return (
    <div className="min-h-full bg-background">
      {/* Sticky header with todo counter + stats */}
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

          {showStats && (
            <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card">
              <Stat value={stats.active} label="Активні" />
              <Stat value={stats.graded} label="Оцінені" />
              <Stat value={stats.avg ?? "—"} label="Середній бал" />
            </div>
          )}

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
        ) : (
          <div className="space-y-4">
            {/* Next-up priority card */}
            {nextUp && (
              <button
                onClick={() => navigate(nextUp.route)}
                className="w-full text-left flex items-center gap-3 p-4 rounded-2xl border border-primary/30 bg-primary/[0.04] hover:border-primary/60 hover:shadow-sm transition group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <nextUp.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {nextUp.chip && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {nextUp.chip}
                      </span>
                    )}
                    {nextUp.due_at && <DueBadge due_at={nextUp.due_at} />}
                  </div>
                  <p className="font-display font-bold text-sm truncate mt-1">{nextUp.title}</p>
                </div>
                <span className="shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold group-hover:bg-primary/90 transition">
                  Виконати <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            )}

            {rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <img
                  src={allClear ? pandaCelebrating : pandaSleeping}
                  alt=""
                  className="w-24 h-24 mx-auto mb-3 object-contain"
                />
                <p className="font-display font-bold">
                  {allClear ? "Усе виконано! 🎉" : "Тут поки що порожньо"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {allClear
                    ? "Гарна робота! Заглянь сюди пізніше"
                    : "Викладач додасть матеріали найближчим часом"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {rows.map((r, idx) => {
                  const Icon = r.icon;
                  return (
                    <motion.button
                      key={`${tab}-${r.id}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                      onClick={() => navigate(r.route)}
                      className="w-full text-left flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:-translate-y-0.5 transition group"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          r.done ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
                        }`}
                      >
                        {r.done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-display font-bold text-sm truncate">{r.title}</p>
                        <div className="flex items-center gap-2 flex-wrap mt-1">
                          {r.subtitle && (
                            <span className="text-xs text-muted-foreground truncate max-w-[200px]">{r.subtitle}</span>
                          )}
                          {r.badge && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                r.graded ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {r.badge}
                            </span>
                          )}
                          {r.due_at && !r.done && <DueBadge due_at={r.due_at} />}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-0.5 transition" />
                    </motion.button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAcademy;