import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, StatCard, SectionHeader } from "./_ui";
import { useAdminLang } from "../LanguageContext";

export default function DashboardPage() {
  const { lang, meta, isAll } = useAdminLang();
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    lessons: 0,
    modules: 0,
  });

  useEffect(() => {
    (async () => {
      // students count is global (not tied to a target language)
      const studentsQ = supabase.from("profiles").select("*", { count: "exact", head: true });

      // courses filtered by language
      const coursesBase = supabase.from("courses").select("id", { count: "exact" });
      const coursesRes =
        lang !== "all"
          ? await coursesBase.eq("target_language", lang)
          : await coursesBase;
      const courseIds = ((coursesRes.data as any[]) || []).map((c) => c.id);
      const coursesCount = coursesRes.count || 0;

      let modulesCount = 0;
      let lessonsCount = 0;

      if (lang === "all") {
        const [m, l] = await Promise.all([
          supabase.from("course_modules").select("*", { count: "exact", head: true }),
          supabase.from("course_lessons").select("*", { count: "exact", head: true }),
        ]);
        modulesCount = m.count || 0;
        lessonsCount = l.count || 0;
      } else if (courseIds.length) {
        const [m, l] = await Promise.all([
          supabase.from("course_modules").select("*", { count: "exact", head: true }).in("course_id", courseIds),
          supabase.from("course_lessons").select("*", { count: "exact", head: true }).in("course_id", courseIds),
        ]);
        modulesCount = m.count || 0;
        lessonsCount = l.count || 0;
      }

      const s = await studentsQ;
      setStats({
        students: s.count || 0,
        courses: coursesCount,
        modules: modulesCount,
        lessons: lessonsCount,
      });
    })();
  }, [lang]);

  return (
    <div className="space-y-6">
      <SectionHeader
        title={`Огляд · ${meta.flag} ${meta.label}`}
        subtitle={isAll ? "Статистика всіх мов школи" : `Показано лише курси мови: ${meta.label}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Всього студентів" value={stats.students} accent="#4F46E5" />
        <StatCard label={isAll ? "Активні курси" : `Курси (${meta.label})`} value={stats.courses} accent="#7C3AED" />
        <StatCard label="Модулі" value={stats.modules} accent="#F59E0B" />
        <StatCard label="Уроки" value={stats.lessons} accent="#10B981" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-2">
          <SectionHeader
            title="Активність за 30 днів"
            subtitle="Графік з'явиться після Фази 2"
          />
          <div
            className="h-56 rounded-xl flex items-center justify-center text-sm text-slate-400"
            style={{ background: "#F8FAFC" }}
          >
            Chart placeholder
          </div>
        </Card>

        <Card className="p-6">
          <SectionHeader title="Потребує ревʼю" subtitle="AI-згенерований контент" />
          <div className="text-4xl font-semibold text-slate-900">0</div>
          <p className="text-xs text-slate-500 mt-2">
            Тут зʼявляться вправи зі статусом pending після Фази 3.
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <SectionHeader title="Остання активність" />
        <div className="text-sm text-slate-400">Feed зʼявиться після підключення attempts (Фаза 5).</div>
      </Card>
    </div>
  );
}
