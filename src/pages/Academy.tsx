import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useIsManagedStudent } from "@/hooks/useIsManagedStudent";
import StudentAcademy from "@/pages/StudentAcademy";
import CourseHero from "@/components/academy/CourseHero";
import CourseFilters from "@/components/academy/CourseFilters";
import CourseCard from "@/components/academy/CourseCard";
import GermanA2Banner from "@/components/academy/GermanA2Banner";
import ProgramCatalog from "@/features/academy-engine/ProgramCatalog";
import AcademyTour, { openAcademyTour } from "@/components/academy/AcademyTour";
import { canSeeSpanish } from "@/features/spanish/access";

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  level: string;
  price: number;
  price_coins: number | null;
  available: boolean;
  image_url: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  instructor_avatar: string | null;
  total_modules: number;
  total_lessons: number;
  total_hours: number;
  difficulty: string | null;
  is_featured: boolean;
  tags: string[] | null;
  outcomes: string[] | null;
}

const T = {
  uk: { courses: "Курси", empty: "Курсів поки немає. Незабаром з'являться нові.", reset: "Скинути фільтри" },
  ru: { courses: "Курсы", empty: "Курсов пока нет. Скоро появятся новые.", reset: "Сбросить фильтры" },
} as const;

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const Academy = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isStudent, loading: studentLoading } = useIsManagedStudent();
  const t = T[lang === "uk" ? "uk" : "ru"];

  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const coursesRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });
      setCourses((data as CourseRow[]) ?? []);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", user.id)
          .maybeSingle();
        if (canSeeSpanish(profile?.nickname)) {
          navigate("/spanish", { replace: true });
          return;
        }
        const { data: purchases } = await supabase
          .from("course_purchases")
          .select("course_id")
          .eq("user_id", user.id);
        setPurchasedIds(new Set((purchases ?? []).map((p) => p.course_id)));
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Managed students get the minimal dashboard
  if (studentLoading) return <Spinner />;
  if (isStudent) return <StudentAcademy />;

  const levels = ["all", "A1", "A2", "B1", "B2", "C1"];
  const allTags = Array.from(new Set(courses.flatMap((c) => c.tags ?? [])));
  const filtered = courses.filter((c) => {
    if (levelFilter !== "all" && c.level !== levelFilter) return false;
    if (tagFilter !== "all" && !(c.tags ?? []).includes(tagFilter)) return false;
    return true;
  });

  const scrollToCourses = () => coursesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto w-full">
      <AcademyTour lang={lang} />
      <CourseHero lang={lang} onPickCourse={scrollToCourses} onOpenA2={() => navigate("/course/a2")} />
      <div className="mx-auto max-w-6xl px-4 pt-3 md:px-6">
        <button type="button" onClick={openAcademyTour} className="text-sm font-semibold text-accent underline underline-offset-4">
          {lang === "uk" ? "🐼 Екскурсія по Академії" : "🐼 Экскурсия по Академии"}
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-10 pt-6 md:px-6">
        <GermanA2Banner />
        <ProgramCatalog lang={lang} />


        <section ref={coursesRef} className="scroll-mt-4">
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">{t.courses}</h2>

          <CourseFilters
            lang={lang}
            levels={levels}
            tags={allTags}
            levelFilter={levelFilter}
            tagFilter={tagFilter}
            onLevelChange={setLevelFilter}
            onTagChange={setTagFilter}
          />

          {loading ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-muted-foreground">{t.empty}</p>
              {(levelFilter !== "all" || tagFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => { setLevelFilter("all"); setTagFilter("all"); }}
                  className="mt-3 text-sm font-semibold text-primary underline underline-offset-4"
                >
                  {t.reset}
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((course) => (
                <CourseCard key={course.id} course={course} lang={lang} isPurchased={purchasedIds.has(course.id)} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default Academy;
