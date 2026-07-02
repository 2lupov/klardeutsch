import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, StatCard, SectionHeader } from "./_ui";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    students: 0,
    courses: 0,
    lessons: 0,
    modules: 0,
  });

  useEffect(() => {
    (async () => {
      const [s, c, l, m] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("courses").select("*", { count: "exact", head: true }),
        supabase.from("course_lessons").select("*", { count: "exact", head: true }),
        supabase.from("course_modules").select("*", { count: "exact", head: true }),
      ]);
      setStats({
        students: s.count || 0,
        courses: c.count || 0,
        lessons: l.count || 0,
        modules: m.count || 0,
      });
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Всього студентів" value={stats.students} accent="#4F46E5" />
        <StatCard label="Активні курси" value={stats.courses} accent="#7C3AED" />
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
