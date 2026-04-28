import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardList, GraduationCap, ListChecks, BookOpen, Sparkles, Clock,
  CheckCircle2, AlertCircle, ChevronRight, Loader2, Award, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

type AssignmentItem =
  | {
      kind: "placement";
      id: string;
      title: string;
      subtitle: string;
      status: "pending" | "in_progress" | "completed";
      created_at: string;
      action: string;
      route: string;
      teacherName?: string;
    }
  | {
      kind: "homework";
      id: string;
      title: string;
      subtitle: string;
      status: "assigned" | "submitted" | "graded";
      created_at: string;
      action: string;
      route: string;
      lessonTitle?: string;
      due_at?: string | null;
      grade?: number | null;
    }
  | {
      kind: "lesson";
      id: string;
      title: string;
      subtitle: string;
      status: "scheduled" | "draft" | "in_progress" | "completed";
      created_at: string;
      action: string;
      route: string;
      level: string;
      exercisesCount: number;
    };

type Filter = "all" | "active" | "done";

const StudentAssignments = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("active");

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);

      // 1. Placement tests assigned to this student
      const { data: placements } = await supabase
        .from("tutoring_placement_assignments")
        .select("id, status, created_at, recommended_level, selected_levels, teacher_id")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false });

      // 2. Lessons (with exercises count) where student
      const { data: lessons } = await supabase
        .from("tutoring_lessons")
        .select("id, title, topic, level, status, scheduled_at, created_at, teacher_id")
        .eq("student_id", user.id)
        .order("scheduled_at", { ascending: false, nullsFirst: false });

      const lessonIds = (lessons ?? []).map((l) => l.id);

      // 3. Homework attached to those lessons
      const { data: homeworks } = lessonIds.length
        ? await supabase
            .from("tutoring_homework")
            .select("id, lesson_id, description, status, due_at, grade, created_at")
            .in("lesson_id", lessonIds)
            .order("created_at", { ascending: false })
        : { data: [] as any[] };

      // 4. Exercise counts per lesson
      const exCounts: Record<string, number> = {};
      if (lessonIds.length) {
        const { data: exs } = await supabase
          .from("tutoring_lesson_exercises")
          .select("lesson_id")
          .in("lesson_id", lessonIds);
        (exs ?? []).forEach((e: any) => {
          exCounts[e.lesson_id] = (exCounts[e.lesson_id] ?? 0) + 1;
        });
      }

      // Resolve teacher names
      const teacherIds = Array.from(
        new Set([
          ...(placements ?? []).map((p) => p.teacher_id),
          ...(lessons ?? []).map((l) => l.teacher_id),
        ])
      );
      const { data: teachers } = teacherIds.length
        ? await supabase.from("profiles").select("user_id, display_name, nickname").in("user_id", teacherIds)
        : { data: [] as any[] };
      const teacherMap = new Map((teachers ?? []).map((t: any) => [t.user_id, t.display_name || t.nickname || "—"]));

      const lessonTitleMap = new Map((lessons ?? []).map((l) => [l.id, l.title]));

      const merged: AssignmentItem[] = [
        ...(placements ?? []).map<AssignmentItem>((p) => ({
          kind: "placement",
          id: p.id,
          title: t("Тест на визначення рівня", "Тест на определение уровня"),
          subtitle:
            p.status === "completed"
              ? t(`Рівень: ${p.recommended_level ?? "?"}`, `Уровень: ${p.recommended_level ?? "?"}`)
              : t(`Рівні: ${(p.selected_levels as any[])?.join(", ")}`, `Уровни: ${(p.selected_levels as any[])?.join(", ")}`),
          status: p.status as any,
          created_at: p.created_at,
          action: p.status === "completed" ? t("Переглянути результат", "Посмотреть результат") : t("Пройти тест", "Пройти тест"),
          route: `/tutoring/placement/${p.id}`,
          teacherName: teacherMap.get(p.teacher_id),
        })),
        ...(homeworks ?? []).map<AssignmentItem>((h: any) => ({
          kind: "homework",
          id: h.id,
          title: t("Домашнє завдання", "Домашнее задание"),
          subtitle: h.description.slice(0, 120) + (h.description.length > 120 ? "…" : ""),
          status: h.status,
          created_at: h.created_at,
          action:
            h.status === "graded"
              ? t("Подивитися оцінку", "Посмотреть оценку")
              : h.status === "submitted"
              ? t("На перевірці", "На проверке")
              : t("Виконати", "Выполнить"),
          route: `/tutoring/lesson/${h.lesson_id}`,
          lessonTitle: lessonTitleMap.get(h.lesson_id),
          due_at: h.due_at,
          grade: h.grade,
        })),
        ...(lessons ?? [])
          .filter((l) => (exCounts[l.id] ?? 0) > 0 && l.status !== "completed")
          .map<AssignmentItem>((l) => ({
            kind: "lesson",
            id: l.id,
            title: l.title,
            subtitle: l.topic ?? t("Вправи з уроку", "Упражнения из урока"),
            status: l.status as any,
            created_at: l.created_at,
            action: t("Виконати вправи", "Выполнить упражнения"),
            route: `/tutoring/lesson/${l.id}`,
            level: l.level,
            exercisesCount: exCounts[l.id] ?? 0,
          })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setItems(merged);
      setLoading(false);
    };
    load();
  }, [user, lang]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    const isDone = (i: AssignmentItem) =>
      (i.kind === "placement" && i.status === "completed") ||
      (i.kind === "homework" && i.status === "graded") ||
      (i.kind === "lesson" && i.status === "completed");
    return filter === "done" ? items.filter(isDone) : items.filter((i) => !isDone(i));
  }, [items, filter]);

  const counts = useMemo(() => {
    const active = items.filter(
      (i) =>
        !(
          (i.kind === "placement" && i.status === "completed") ||
          (i.kind === "homework" && i.status === "graded") ||
          (i.kind === "lesson" && i.status === "completed")
        )
    ).length;
    return { all: items.length, active, done: items.length - active };
  }, [items]);

  const meta = (item: AssignmentItem) => {
    if (item.kind === "placement") {
      return {
        Icon: GraduationCap,
        accent: "from-amber-500/15 to-yellow-500/5 text-amber-700 dark:text-amber-300",
        chip: { label: t("Тест", "Тест"), bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
      };
    }
    if (item.kind === "homework") {
      return {
        Icon: Sparkles,
        accent: "from-pink-500/15 to-rose-500/5 text-pink-700 dark:text-pink-300",
        chip: { label: t("ДЗ", "ДЗ"), bg: "bg-pink-500/15 text-pink-700 dark:text-pink-300" },
      };
    }
    return {
      Icon: ListChecks,
      accent: "from-blue-500/15 to-indigo-500/5 text-blue-700 dark:text-blue-300",
      chip: { label: t("Вправи", "Упражнения"), bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300" },
    };
  };

  const statusBadge = (item: AssignmentItem) => {
    const map: Record<string, { label: string; cls: string; Icon: any }> = {
      pending: { label: t("Очікує", "Ожидает"), cls: "bg-muted text-muted-foreground", Icon: Clock },
      in_progress: { label: t("У процесі", "В процессе"), cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300", Icon: Loader2 },
      assigned: { label: t("Призначено", "Назначено"), cls: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300", Icon: AlertCircle },
      submitted: { label: t("На перевірці", "На проверке"), cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300", Icon: Loader2 },
      graded: { label: t("Оцінено", "Оценено"), cls: "bg-green-500/15 text-green-700 dark:text-green-300", Icon: Award },
      scheduled: { label: t("Заплановано", "Запланирован"), cls: "bg-blue-500/15 text-blue-700 dark:text-blue-300", Icon: Clock },
      draft: { label: t("Чернетка", "Черновик"), cls: "bg-muted text-muted-foreground", Icon: FileText },
      completed: { label: t("Готово", "Готово"), cls: "bg-green-500/15 text-green-700 dark:text-green-300", Icon: CheckCircle2 },
    };
    return map[item.status] ?? { label: item.status, cls: "bg-muted text-muted-foreground", Icon: Clock };
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-background to-primary/5 pb-24 lg:pb-12">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-6 lg:pt-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 lg:p-8 bg-gradient-to-br from-primary/10 via-card to-card border border-border shadow-sm mb-5"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-display font-black leading-tight">
                {t("Мої завдання", "Мои задания")}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t("Тести, вправи та домашні роботи в одному місці", "Тесты, упражнения и домашние работы в одном месте")}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filter chips */}
        <div className="flex gap-2 mb-4">
          {([
            ["active", t("Активні", "Активные"), counts.active],
            ["done", t("Виконані", "Выполненные"), counts.done],
            ["all", t("Усі", "Все"), counts.all],
          ] as const).map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key as Filter)}
              className={`px-4 py-2 rounded-full text-sm font-bold transition flex items-center gap-2 ${
                filter === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === key ? "bg-primary-foreground/20" : "bg-muted"}`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="font-display font-bold text-lg mb-1">
              {filter === "active"
                ? t("Усе виконано! 🎉", "Всё выполнено! 🎉")
                : t("Поки що порожньо", "Пока пусто")}
            </p>
            <p className="text-sm text-muted-foreground">
              {t("Завдання з'являться, коли викладач їх призначить", "Задания появятся, когда преподаватель их назначит")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((item, idx) => {
              const m = meta(item);
              const s = statusBadge(item);
              const Icon = m.Icon;
              const StatusIcon = s.Icon;
              return (
                <motion.button
                  key={`${item.kind}-${item.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                  onClick={() => navigate(item.route)}
                  className="w-full text-left rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition overflow-hidden group"
                >
                  <div className={`bg-gradient-to-r ${m.accent} px-5 py-3 flex items-center gap-3`}>
                    <div className="w-9 h-9 rounded-xl bg-background/70 backdrop-blur flex items-center justify-center">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.chip.bg}`}>
                          {m.chip.label}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${s.cls}`}>
                          <StatusIcon className="w-3 h-3" />
                          {s.label}
                        </span>
                        {item.kind === "lesson" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                            {item.level} · {item.exercisesCount} {t("вправ", "упр.")}
                          </span>
                        )}
                        {item.kind === "homework" && item.grade != null && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-300">
                            {item.grade}/100
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-foreground/50 group-hover:translate-x-1 transition" />
                  </div>
                  <div className="px-5 py-4">
                    <h3 className="font-display font-bold text-foreground leading-tight mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.subtitle}
                    </p>
                    <div className="flex items-center justify-between gap-3 mt-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-3 flex-wrap">
                        {item.kind === "homework" && item.lessonTitle && (
                          <span className="inline-flex items-center gap-1">
                            <BookOpen className="w-3 h-3" /> {item.lessonTitle}
                          </span>
                        )}
                        {item.kind === "homework" && item.due_at && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {t("До", "До")}: {new Date(item.due_at).toLocaleDateString(lang === "uk" ? "uk-UA" : "ru-RU")}
                          </span>
                        )}
                        {item.kind === "placement" && item.teacherName && (
                          <span className="inline-flex items-center gap-1">
                            <GraduationCap className="w-3 h-3" /> {item.teacherName}
                          </span>
                        )}
                      </div>
                      <span className="font-bold text-primary">{item.action} →</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAssignments;
