import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";
import CourseHeader from "@/components/course/CourseHeader";
import LessonCard from "@/components/course/LessonCard";

interface CourseLesson {
  id: string;
  title: string;
  theory: string;
  exercises: any;
  sort_order: number;
}

interface CourseInfo {
  id: string;
  title: string;
  description: string | null;
  level: string;
}

const Course = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const [{ data: courseData }, { data: purchaseData }, { data: lessonsData }] = await Promise.all([
        supabase.from("courses").select("id, title, description, level").eq("id", id).single(),
        supabase.from("course_purchases").select("id").eq("user_id", user.id).eq("course_id", id),
        supabase.from("course_lessons").select("*").eq("course_id", id).order("sort_order"),
      ]);
      setCourse(courseData as CourseInfo | null);
      setHasAccess((purchaseData ?? []).length > 0);
      setLessons((lessonsData as CourseLesson[]) ?? []);
      setLoading(false);
    };
    load();
  }, [user, id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm text-muted-foreground">
            {lang === "uk" ? "Завантаження..." : "Загрузка..."}
          </span>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-muted-foreground">{lang === "uk" ? "Курс не знайдено" : "Курс не найден"}</p>
        <button onClick={() => navigate("/shop")} className="text-primary text-sm hover:underline">
          ← {lang === "uk" ? "До магазину" : "В магазин"}
        </button>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 px-4">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-center text-sm">
          {lang === "uk" ? "Спочатку купіть курс у магазині" : "Сначала купите курс в магазине"}
        </p>
        <button
          onClick={() => navigate("/shop")}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm glow-yellow hover:brightness-110 active:scale-95 transition-all"
        >
          {lang === "uk" ? "Перейти до магазину" : "Перейти в магазин"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-4 py-6 max-w-2xl animate-slide-up">
      <CourseHeader
        title={course.title}
        description={course.description}
        level={course.level}
        lessonCount={lessons.length}
        completedSections={0}
        totalSections={lessons.length}
        lang={lang}
      />

      <div className="space-y-3">
        {lessons.map((lesson, i) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            index={i}
            lang={lang}
            isExpanded={expandedLesson === lesson.id}
            onToggle={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default Course;
