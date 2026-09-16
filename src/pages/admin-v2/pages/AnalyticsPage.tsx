import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, StatCard, SectionHeader } from "./_ui";
import { useAdminLang } from "../LanguageContext";

export default function AnalyticsPage() {
  const { lang, meta, isAll } = useAdminLang();
  const [data, setData] = useState({
    totalUsers: 0,
    activeWeek: 0,
    completedLessons: 0,
    avgScore: 0,
    topCourses: [] as { title: string; completions: number }[],
    hardestLessons: [] as { title: string; avg: number }[],
  });

  useEffect(() => {
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();

      const coursesBase = supabase.from("courses").select("id,title");
      const coursesRes =
        lang !== "all"
          ? await coursesBase.eq("target_language", lang)
          : await coursesBase;
      const courses = (coursesRes.data as any[]) || [];
      const scopedCourseIds = courses.map((c) => c.id);

      const lessonsBase = supabase.from("course_lessons").select("id,title,course_id");
      const lessonsRes =
        lang !== "all" && scopedCourseIds.length
          ? await lessonsBase.in("course_id", scopedCourseIds)
          : lang !== "all"
          ? { data: [] as any[] }
          : await lessonsBase;
      const lessons = (lessonsRes.data as any[]) || [];
      const scopedLessonIds = new Set(lessons.map((l) => l.id));

      const [{ count: totalUsers }, { count: activeWeek }, { data: progress }] =
        await Promise.all([
          supabase.from("profiles").select("*", { count: "exact", head: true }),
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("last_active", weekAgo),
          supabase.from("course_lesson_progress").select("course_id,lesson_id,score,status").eq("status", "completed"),
        ]);

      const courseMap = new Map(courses.map((c: any) => [c.id, c.title]));
      const lessonMap = new Map(lessons.map((l: any) => [l.id, l.title]));

      const byCourse = new Map<string, number>();
      const byLesson = new Map<string, { sum: number; n: number }>();
      let scoreSum = 0, scoreN = 0;
      let completedCount = 0;

      const filteredProgress = (progress as any[] || []).filter((p) => {
        if (lang === "all") return true;
        // keep only rows whose lesson OR course belongs to selected language
        return (p.lesson_id && scopedLessonIds.has(p.lesson_id)) ||
               (p.course_id && scopedCourseIds.includes(p.course_id));
      });

      filteredProgress.forEach((p) => {
        completedCount++;
        if (p.course_id) byCourse.set(p.course_id, (byCourse.get(p.course_id) || 0) + 1);
        if (typeof p.score === "number") {
          scoreSum += p.score; scoreN++;
          const cur = byLesson.get(p.lesson_id) || { sum: 0, n: 0 };
          cur.sum += p.score; cur.n++;
          byLesson.set(p.lesson_id, cur);
        }
      });

      const topCourses = Array.from(byCourse.entries())
        .map(([id, n]) => ({ title: courseMap.get(id) || "—", completions: n }))
        .sort((a, b) => b.completions - a.completions).slice(0, 5);

      const hardestLessons = Array.from(byLesson.entries())
        .filter(([, v]) => v.n >= 3)
        .map(([id, v]) => ({ title: lessonMap.get(id) || "—", avg: Math.round(v.sum / v.n) }))
        .sort((a, b) => a.avg - b.avg).slice(0, 5);

      setData({
        totalUsers: totalUsers || 0,
        activeWeek: activeWeek || 0,
        completedLessons: completedCount,
        avgScore: scoreN ? Math.round(scoreSum / scoreN) : 0,
        topCourses,
        hardestLessons,
      });
    })();
  }, [lang]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Аналітика"
        subtitle="Показники школи"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Всього юзерів" value={data.totalUsers} accent="#4F46E5" />
        <StatCard label="Активні / тиждень" value={data.activeWeek} accent="#7C3AED" />
        <StatCard label="Завершено уроків" value={data.completedLessons} accent="#10B981" />
        <StatCard label="Середній бал" value={`${data.avgScore}%`} accent="#F59E0B" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <SectionHeader title="Топ курсів" subtitle="За кількістю завершень уроків" />
          {data.topCourses.length === 0 ? (
            <p className="text-sm text-slate-400">Даних поки немає</p>
          ) : (
            <div className="space-y-2">
              {data.topCourses.map((c, i) => {
                const max = data.topCourses[0].completions || 1;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700 truncate">{c.title}</span>
                      <span className="text-slate-500">{c.completions}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 mt-1 overflow-hidden">
                      <div className="h-full" style={{ width: `${(c.completions / max) * 100}%`, background: "#4F46E5" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <SectionHeader title="Найскладніші уроки" subtitle="Найнижчий середній бал (≥3 спроби)" />
          {data.hardestLessons.length === 0 ? (
            <p className="text-sm text-slate-400">Даних поки немає</p>
          ) : (
            <div className="space-y-2">
              {data.hardestLessons.map((l, i) => (
                <div key={i} className="flex justify-between text-sm py-1.5 border-b border-slate-100 last:border-0">
                  <span className="text-slate-700 truncate">{l.title}</span>
                  <span className={`font-semibold ${l.avg < 50 ? "text-red-500" : l.avg < 70 ? "text-amber-500" : "text-emerald-500"}`}>
                    {l.avg}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
