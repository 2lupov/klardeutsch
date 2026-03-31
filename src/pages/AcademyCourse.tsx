import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/hooks/usePlatform";
import { ArrowLeft } from "lucide-react";
import CourseHeroPlayer from "@/components/academy/CourseHeroPlayer";
import CurriculumAccordion from "@/components/academy/CurriculumAccordion";
import CourseCheckout from "@/components/academy/CourseCheckout";
import InstructorCard from "@/components/academy/InstructorCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CourseDetail {
  id: string;
  title: string;
  description: string | null;
  level: string;
  price: number;
  available: boolean;
  image_url: string | null;
  thumbnail_url: string | null;
  trailer_url: string | null;
  instructor_name: string | null;
  instructor_avatar: string | null;
  instructor_bio: string | null;
  total_modules: number;
  total_lessons: number;
  total_hours: number;
  difficulty: string | null;
  price_coins: number | null;
  cohort_start_date: string | null;
  is_featured: boolean;
  tags: string[] | null;
  outcomes: string[] | null;
}

interface ModuleRow {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_free_preview: boolean;
}

interface LessonRow {
  id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  lesson_type: string;
  estimated_minutes: number;
  is_free_preview: boolean;
}

const AcademyCourse = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { isMobile } = usePlatform();
  const navigate = useNavigate();

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [isPurchased, setIsPurchased] = useState(false);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    const load = async () => {
      const [{ data: courseData }, { data: modulesData }, { data: lessonsData }] = await Promise.all([
        supabase.from("courses").select("*").eq("id", courseId).single(),
        supabase.from("course_modules").select("*").eq("course_id", courseId).order("sort_order"),
        supabase.from("course_lessons").select("id, module_id, title, description, sort_order, lesson_type, estimated_minutes, is_free_preview").eq("course_id", courseId).order("sort_order"),
      ]);

      setCourse(courseData as CourseDetail | null);
      setModules((modulesData as ModuleRow[]) ?? []);
      setLessons((lessonsData as LessonRow[]) ?? []);

      if (user) {
        const { data: purchases } = await supabase
          .from("course_purchases")
          .select("id")
          .eq("user_id", user.id)
          .eq("course_id", courseId);
        setIsPurchased((purchases ?? []).length > 0);
      }
      setLoading(false);
    };
    load();
  }, [courseId, user]);

  const handlePurchase = async (method: "coins" | "eur") => {
    if (!user || !courseId || purchasing) return;
    setPurchasing(true);
    if (method === "coins") {
      const { data } = await supabase.rpc("purchase_course", {
        p_user_id: user.id,
        p_course_id: courseId,
      });
      if (data) {
        setIsPurchased(true);
      }
    }
    setPurchasing(false);
  };

  const handleStart = () => {
    navigate(`/academy/${courseId}/learn`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-muted-foreground">{lang === "uk" ? "Курс не знайдено" : "Курс не найден"}</p>
        <button onClick={() => navigate("/academy")} className="text-primary text-sm hover:underline">
          ← {lang === "uk" ? "До академії" : "В академию"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto animate-slide-up">
      {/* Back */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <button
          onClick={() => navigate("/academy")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors group mb-4"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          {lang === "uk" ? "Академія" : "Академия"}
        </button>
      </div>

      <div className={`max-w-6xl mx-auto px-4 pb-8 ${isMobile ? "" : "flex gap-8"}`}>
        {/* Left column */}
        <div className={isMobile ? "w-full" : "flex-1 min-w-0"}>
          <CourseHeroPlayer
            title={course.title}
            thumbnailUrl={course.thumbnail_url || course.image_url}
            trailerUrl={course.trailer_url}
            difficulty={course.difficulty ?? course.level}
          />

          <Tabs defaultValue="about" className="mt-6">
            <TabsList className="bg-muted/30 border border-border/30 w-full justify-start">
              <TabsTrigger value="about" className="text-xs">
                {lang === "uk" ? "Про курс" : "О курсе"}
              </TabsTrigger>
              <TabsTrigger value="curriculum" className="text-xs">
                {lang === "uk" ? "Програма" : "Программа"}
              </TabsTrigger>
              <TabsTrigger value="instructor" className="text-xs">
                {lang === "uk" ? "Викладач" : "Преподаватель"}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="mt-4 space-y-6">
              {/* Outcomes */}
              {(course.outcomes ?? []).length > 0 && (
                <div>
                  <h3 className="font-display font-bold text-sm text-foreground mb-3">
                    {lang === "uk" ? "Що ти дізнаєшся" : "Чему ты научишься"}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {course.outcomes!.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="text-primary mt-0.5">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {course.description && (
                <div>
                  <h3 className="font-display font-bold text-sm text-foreground mb-2">
                    {lang === "uk" ? "Опис" : "Описание"}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
                </div>
              )}

              {/* Tags */}
              {(course.tags ?? []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {course.tags!.map((tag) => (
                    <span key={tag} className="px-3 py-1 rounded-full bg-muted/50 text-xs text-muted-foreground">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="curriculum" className="mt-4">
              <CurriculumAccordion
                modules={modules}
                lessons={lessons}
                isPurchased={isPurchased}
                lang={lang}
              />
            </TabsContent>

            <TabsContent value="instructor" className="mt-4">
              <InstructorCard
                name={course.instructor_name}
                avatar={course.instructor_avatar}
                bio={course.instructor_bio}
                lang={lang}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right column — checkout (desktop sticky, mobile at bottom) */}
        <div className={isMobile ? "mt-6" : "w-80 flex-shrink-0"}>
          <div className={isMobile ? "" : "sticky top-6"}>
            <CourseCheckout
              course={course}
              isPurchased={isPurchased}
              purchasing={purchasing}
              onPurchase={handlePurchase}
              onStart={handleStart}
              lang={lang}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcademyCourse;
