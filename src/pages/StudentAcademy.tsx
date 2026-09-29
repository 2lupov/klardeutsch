import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  ListChecks, FileText, BookOpen, GraduationCap, ChevronRight,
  Loader2, CheckCircle2, Clock, Layers, Mic, PenLine,
  ClipboardList, Palette, LibraryBig, NotebookTabs, UserRound,
  NotebookPen, FolderOpen,
} from "lucide-react";
import StudentTextbooks from "@/components/textbook/StudentTextbooks";
import StudentBoard from "@/components/student/StudentBoard";
import StudentProfilePanel from "@/components/student/StudentProfilePanel";
import StudentDictionary from "@/pages/StudentDictionary";
import StudentWriting from "@/components/student/StudentWriting";
import StudentReading from "@/components/student/StudentReading";
import StudentNotes from "@/components/student/StudentNotes";
import StudentFolders from "@/components/student/StudentFolders";
import { bgCss } from "@/components/student/academyBackgrounds";
import { Button } from "@/components/ui/button";
import pandaCelebrating from "@/assets/mascot/panda-celebrating.png";
import pandaSleeping from "@/assets/mascot/panda-sleeping.png";

type Tab = "tests" | "homework" | "writing" | "reading" | "notes" | "folders" | "board" | "textbook" | "dict" | "profile";

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
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get("tab") || "homework") as Tab;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [navCollapsed, setNavCollapsed] = useState(() => localStorage.getItem("academy_nav_collapsed") === "1");
  const [liveCls, setLiveCls] = useState<{ id: string; created_at: string } | null>(null);
  const [nowTs, setNowTs] = useState(Date.now());
  const [bg, setBg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<Row[]>([]);
  const [homework, setHomework] = useState<Row[]>([]);
  const [writingTodo, setWritingTodo] = useState(0);
  const [readingTodo, setReadingTodo] = useState(0);
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
      supabase.from("profiles").select("academy_bg" as any).eq("user_id", user.id).maybeSingle().then(({ data }: any) => setBg(data?.academy_bg ?? null));

      // Active live lesson (for the "back to lesson" button)
      supabase.from("live_classes").select("id, created_at").eq("student_id", user.id).eq("status", "active")
        .order("created_at", { ascending: false }).limit(1).maybeSingle()
        .then(({ data }: any) => setLiveCls(data ?? null));

      // Textbook homework pages
      const { data: sbooks } = await (supabase as any).from("student_books").select("id, book:book_files(title)").eq("student_id", user.id);
      const sbIds = (sbooks ?? []).map((b: any) => b.id);
      const sbTitle = new Map((sbooks ?? []).map((b: any) => [b.id, b.book?.title ?? "Підручник"]));
      const { data: bookHw } = sbIds.length
        ? await (supabase as any).from("student_book_pages").select("id, student_book_id, page_number, homework_note, homework_status, updated_at").in("student_book_id", sbIds).in("homework_status", ["assigned", "done"])
        : { data: [] as any[] };

      // Assignments from teacher
      const { data: tasks } = await supabase
        .from("student_assignments")
        .select("id, type, title, instructions, status, due_at, payload, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      // Placement tests assigned by the teacher
      const { data: placements } = await supabase
        .from("tutoring_placement_assignments")
        .select("id, status, created_at, recommended_level, selected_levels")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      // Lesson homework
      const { data: lessons } = await supabase
        .from("tutoring_lessons")
        .select("id, title, status, topic, level, created_at")
        .eq("student_id", user.id);
      const lessonIds = (lessons ?? []).map((l) => l.id);
      const { data: lessonExs } = lessonIds.length
        ? await supabase.from("tutoring_lesson_exercises").select("lesson_id").in("lesson_id", lessonIds)
        : { data: [] as any[] };
      const exCount = new Map<string, number>();
      (lessonExs ?? []).forEach((e: any) => exCount.set(e.lesson_id, (exCount.get(e.lesson_id) ?? 0) + 1));
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
        book: FileText, book_plan: Layers, blocks: Layers, minicourse: Layers,
      };
      const typeLabel: Record<string, string> = {
        test: "Тест", homework: "ДЗ", writing: "Письмо", audio: "Аудіо", modular: "Модуль",
        book: "Підручник", book_plan: "Урок", blocks: "Урок", minicourse: "Мінікурс",
      };
      const taskRoute = (tk: any) =>
        tk.type === "book" || tk.type === "book_plan"
          ? `/book-task/${tk.id}`
          : tk.type === "blocks"
            ? `/blocks-task/${tk.id}`
            : tk.type === "minicourse"
              ? `/minicourse/${tk.id}`
              : `/task/${tk.id}`;



      const allTasks = tasks ?? [];
      setWritingTodo(allTasks.filter((tk: any) => tk.type === "writing" && ["assigned", "in_progress"].includes(tk.status)).length);
      setReadingTodo(allTasks.filter((tk: any) => tk.type === "reading" && ["assigned", "in_progress"].includes(tk.status)).length);

      const testRows: Row[] = allTasks
        .filter((tk: any) => !["homework", "book", "book_plan", "writing", "reading"].includes(tk.type))
        .map((tk: any) => ({
          id: tk.id,
          title: tk.title,
          subtitle: tk.instructions ? String(tk.instructions).slice(0, 90) : undefined,
          route: taskRoute(tk),
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
          .filter((tk: any) => ["homework", "book", "book_plan"].includes(tk.type))
          .map((tk: any) => ({
            id: tk.id,
            title: tk.title,
            subtitle: tk.instructions ? String(tk.instructions).slice(0, 90) : undefined,
            route: taskRoute(tk),
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
        ...(bookHw ?? []).map((h: any) => ({
          id: h.id,
          title: `${sbTitle.get(h.student_book_id)} · с. ${h.page_number}`,
          subtitle: h.homework_note ? String(h.homework_note).slice(0, 90) : "Сторінка підручника",
          route: "#textbook",
          done: h.homework_status === "done",
          graded: false,
          chip: "Підручник",
          badge: h.homework_status === "done" ? "Здано" : undefined,
          created_at: h.updated_at,
          icon: BookOpen,
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const readRows: Row[] = [
        ...allTasks
          .filter((tk: any) => hasReadingModule(tk.payload))
          .map((tk: any) => ({
            id: tk.id,
            title: tk.title,
            subtitle: "Читання від викладача",
            route: taskRoute(tk),
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

      const placementRows: Row[] = (placements ?? []).map((p: any) => ({
        id: p.id,
        title: "Тест на визначення рівня",
        subtitle:
          p.status === "completed"
            ? `Рівень: ${p.recommended_level ?? "?"}`
            : `Рівні: ${(p.selected_levels as any[])?.join(", ") ?? "—"}`,
        route: `/tutoring/placement/${p.id}`,
        done: p.status === "completed",
        graded: p.status === "completed",
        chip: "Рівень",
        created_at: p.created_at,
        icon: ListChecks,
      }));

      const lessonRows: Row[] = (lessons ?? [])
        .filter((l: any) => (exCount.get(l.id) ?? 0) > 0 && l.status !== "completed")
        .map((l: any) => ({
          id: l.id,
          title: l.title,
          subtitle: [l.topic, l.level].filter(Boolean).join(" · ") || "Урок з викладачем",
          route: `/tutoring/lesson/${l.id}`,
          done: false,
          graded: false,
          chip: "Урок",
          created_at: l.created_at ?? new Date().toISOString(),
          icon: Layers,
        }));

      setTests([...placementRows, ...testRows, ...lessonRows]);
      setHomework(hwRows);
      setReading(readRows);
      setCourses(courseRowsArr);

// Stats: active / graded / average grade (0–100)
      const taskRows = [...testRows, ...hwRows, ...readRows.filter((r) => r.route.startsWith("/task/"))];
      const active = taskRows.filter((r) => !r.done).length;
      const graded = taskRows.filter((r) => r.graded).length;
      const toPct = (g: number, scale: number) => Math.round((g / scale) * 100);
      const grades: number[] = [];
      (subs ?? []).forEach((s: any) => {
        // Manual grade is 1–12 scale, auto_score is already a percentage
        const g = s.grade != null ? toPct(s.grade, 12) : s.auto_score;
        if (typeof g === "number" && Number.isFinite(g)) grades.push(g);
      });
      (hw ?? []).forEach((h: any) => {
        if (typeof h.grade === "number" && Number.isFinite(h.grade)) grades.push(toPct(h.grade, 5));
      });
      const avg = grades.length ? Math.round(grades.reduce((a, b) => a + b, 0) / grades.length) : null;
      setStats({ active, graded, avg });

      setLoading(false);
    };
    load();
  }, [user]);

  // Tick every 15s so the lesson timer stays fresh
  useEffect(() => {
    if (!liveCls) return;
    const t = setInterval(() => setNowTs(Date.now()), 15000);
    return () => clearInterval(t);
  }, [liveCls]);

  const liveElapsed = useMemo(() => {
    if (!liveCls) return "";
    const mins = Math.max(0, Math.floor((nowTs - new Date(liveCls.created_at).getTime()) / 60000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return h > 0 ? `${h} год ${m} хв` : `${m} хв`;
  }, [liveCls, nowTs]);

  const pending = useMemo(
    () => ({
      tests: tests.filter((r) => !r.done).length,
      homework: homework.filter((r) => !r.done).length,
      reading: reading.filter((r) => !r.done).length,
      courses: courses.length,
      writing: writingTodo,
    }),
    [tests, homework, reading, courses, writingTodo]
  );

  const totalTodo = pending.tests + pending.homework;
  const showStats = stats.active > 0 || stats.graded > 0 || stats.avg != null;
  const isTaskTab = tab === "tests" || tab === "homework";

const nextUp = useMemo(() => {
    const candidates = [...tests, ...homework, ...reading.filter((r) => r.route.startsWith("/task/"))].filter((r) => !r.done);
    if (!candidates.length) return null;
    const withDue = candidates
      .filter((r) => r.due_at)
      .sort((a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime());
    if (withDue.length) return withDue[0];
    return [...candidates].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0];
  }, [tests, homework]);

  const tabs = [
    { key: "homework", label: "Домашка", count: pending.homework, icon: ClipboardList },
    { key: "tests", label: "Тести", count: pending.tests, icon: ListChecks },
    { key: "reading", label: "Читання", count: readingTodo, icon: BookOpen },
    { key: "writing", label: "Письмо", count: pending.writing, icon: PenLine },
    { key: "notes", label: "Нотатки", count: 0, icon: NotebookPen },
    { key: "folders", label: "Папки", count: 0, icon: FolderOpen },
    { key: "board", label: "Дошка", count: 0, icon: Palette },
    { key: "textbook", label: "Підручники", count: 0, icon: LibraryBig },
    { key: "dict", label: "Словник", count: 0, icon: NotebookTabs },
    { key: "profile", label: "Профіль", count: 0, icon: UserRound },
  ];

const rows = tab === "tests" ? tests : homework;
  const hasAnyContent = tests.length + homework.length + reading.length > 0;
  const allClear = totalTodo === 0 && hasAnyContent && (tab === "tests" || tab === "homework");

  return (
    <div className="min-h-full bg-background bg-fixed bg-cover flex min-w-0" style={bgCss(bg) ? { backgroundImage: bgCss(bg) } : undefined}>
      {/* Collapsible sidebar */}
      <aside className={`sticky top-0 h-[100dvh] shrink-0 border-r border-border bg-background/90 backdrop-blur flex flex-col transition-all ${navCollapsed ? "w-14" : "w-14 md:w-52"}`}>
        <div className={`flex items-center gap-2 px-3 py-4 ${navCollapsed ? "justify-center" : ""}`}>
          <span className="font-display font-black text-lg text-foreground">{navCollapsed ? "K" : "KLAR"}</span>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {tabs.map((tb) => {
            const active = tab === tb.key;
            const Icon = tb.icon;
            return (
              <Button
                 animated={false}
                key={tb.key}
                 variant="ghost"
                title={tb.label}
                onClick={() => setTab(tb.key as Tab)}
                 className={`relative w-full flex items-center ${navCollapsed ? "justify-center" : ""} gap-3 px-3 py-2.5 rounded-md text-sm font-display font-medium transition ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {!navCollapsed && <span className="hidden md:inline truncate">{tb.label}</span>}
                {tb.count > 0 && (
                   <span className="absolute right-2 top-1.5 md:static md:ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {tb.count}
                  </span>
                )}
              </Button>
            );
          })}
        </nav>
        <Button
           animated={false}
           variant="ghost"
          onClick={() => setNavCollapsed((v) => { localStorage.setItem("academy_nav_collapsed", v ? "0" : "1"); return !v; })}
          title={navCollapsed ? "Розгорнути" : "Згорнути"}
           className="hidden md:flex m-2 h-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground text-sm"
        >
          {navCollapsed ? "»" : "« Згорнути"}
        </Button>
      </aside>

      <div className="flex-1 min-w-0">
      {/* Progress is only relevant while choosing tasks, not while reading or drawing. */}
      {isTaskTab && <div className="border-b border-border bg-background/90">
        <div className="max-w-2xl mx-auto px-4 pt-5 pb-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Моє навчання</p>
              <h1 className="font-display text-2xl font-black leading-tight">
                {totalTodo > 0 ? `Треба зробити: ${totalTodo}` : hasAnyContent ? "Усе виконано 🎉" : "Ласкаво просимо 👋"}
              </h1>
            </div>
            {totalTodo > 0 && (
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-display font-black text-lg shrink-0">
                {totalTodo}
              </div>
            )}
          </div>

          {liveCls && (
             <Button
               animated={false}
              onClick={() => navigate(`/live/${liveCls.id}`)}
               className="mt-4 w-full flex items-center justify-center gap-2 bg-destructive text-destructive-foreground font-display font-bold text-sm hover:bg-destructive/90 transition"
            >
               <span className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
              Повернутись на урок · триває {liveElapsed}
             </Button>
          )}

          {showStats && (
            <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card">
              <Stat value={stats.active} label="Активні" />
              <Stat value={stats.graded} label="Оцінені" />
              <Stat value={stats.avg ?? "—"} label="Середній бал" />
            </div>
          )}
        </div>
      </div>}

      <div className={`${tab === "board" || tab === "textbook" ? "max-w-[1200px]" : "max-w-2xl"} w-full mx-auto px-3 sm:px-6 ${isTaskTab ? "py-5" : "py-3 sm:py-5"}`}>


        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {tab === "profile" && liveCls && (
              <Button variant="outline" animated={false} onClick={() => navigate(`/live/${liveCls.id}`)}>
                Повернутись на урок · {liveElapsed}
              </Button>
            )}
            {/* Next-up priority card */}
             {isTaskTab && nextUp && (
              <button
                onClick={() => (nextUp.route === "#textbook" ? setTab("textbook") : navigate(nextUp.route))}
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

            {tab === "textbook" ? (
              <StudentTextbooks />
            ) : tab === "board" ? (
               <StudentBoard className="h-[calc(100dvh-6rem)] min-h-[420px]" />
            ) : tab === "writing" ? (
              <StudentWriting />
            ) : tab === "reading" ? (
              <StudentReading />
            ) : tab === "notes" ? (
              <StudentNotes />
            ) : tab === "folders" ? (
              <StudentFolders onOpenTab={(t) => setTab(t)} />
            ) : tab === "dict" ? (
              <StudentDictionary />
            ) : tab === "profile" ? (
              <StudentProfilePanel bg={bg} onBg={setBg} />
            ) : rows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <img
                  src={allClear ? pandaCelebrating : pandaSleeping}
                  alt=""
                  className="w-24 h-24 mx-auto mb-3 object-contain"
                />
                {allClear ? (
                  <>
                    <p className="font-display font-bold">Усе виконано! 🎉</p>
                    <p className="text-sm text-muted-foreground">Гарна робота! Заглянь сюди пізніше</p>
                  </>
                ) : hasAnyContent ? (
                  <>
                    <p className="font-display font-bold">Немає завдань у цьому розділі</p>
                    <p className="text-sm text-muted-foreground">Спробуй інший розділ вище</p>
                  </>
                ) : (
                  <>
                    <p className="font-display font-bold">Тут поки що порожньо</p>
                    <p className="text-sm text-muted-foreground">Викладач додасть матеріали найближчим часом</p>
                  </>
                )}
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
                      onClick={() => (r.route === "#textbook" ? setTab("textbook") : navigate(r.route))}
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
                          <span className="text-[10px] text-muted-foreground">дано {new Date(r.created_at).toLocaleDateString("uk-UA", { day: "numeric", month: "short" })}</span>
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
    </div>
  );
};

export default StudentAcademy;