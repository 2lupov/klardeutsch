import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CourseHero from "@/components/academy/CourseHero";
import CourseFilters from "@/components/academy/CourseFilters";
import CourseCard from "@/components/academy/CourseCard";

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

const Academy = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });

      setCourses((data as CourseRow[]) ?? []);

      if (user) {
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

  const levels = ["all", "A1", "A2", "B1", "B2", "C1"];
  const allTags = Array.from(new Set(courses.flatMap((c) => c.tags ?? [])));

  const filtered = courses.filter((c) => {
    if (levelFilter !== "all" && (c.difficulty ?? c.level) !== levelFilter) return false;
    if (tagFilter !== "all" && !(c.tags ?? []).includes(tagFilter)) return false;
    return true;
  });

  return (
    <div className="w-full mx-auto animate-slide-up">
      <CourseHero lang={lang} />

      <div className="max-w-6xl mx-auto px-4 pb-8">
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
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📚</p>
            <p className="text-muted-foreground text-sm">
              {lang === "uk" ? "Курсів поки немає" : "Курсов пока нет"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                lang={lang}
                isPurchased={purchasedIds.has(course.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Academy;
