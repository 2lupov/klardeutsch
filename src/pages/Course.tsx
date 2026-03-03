import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Lock, ChevronRight } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";
import CourseLevelLogo from "@/components/course/CourseLevelLogo";
import LessonCard from "@/components/course/LessonCard";
import CourseHeader from "@/components/course/CourseHeader";

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
  const { isMobile } = usePlatform();
  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [lessons, setLessons] = useState<CourseLesson[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeLesson, setActiveLesson] = useState<CourseLesson | null>(null);
  const [clarity, setClarity] = useState(0);
  const [sectionsOpened, setSectionsOpened] = useState(0);

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

  // Reset clarity when entering a lesson
  useEffect(() => {
    if (activeLesson) {
      setClarity(0);
      setSectionsOpened(0);
    }
  }, [activeLesson?.id]);

  const handleSectionOpen = () => {
    setSectionsOpened(prev => {
      const next = prev + 1;
      // Each section opened bumps clarity
      const totalSections = countSections(activeLesson!);
      setClarity(Math.min(1, next / Math.max(totalSections, 1)));
      return next;
    });
  };

  const countSections = (lesson: CourseLesson) => {
    const ex = lesson.exercises || {};
    let count = 0;
    if (lesson.theory) count++;
    const vocab = ex.vocabulary || ex.vocab_cards || [];
    if (vocab.length > 0) count++;
    const exercises = ex.exercises || [];
    const cloze = exercises.filter((e: any) => e.type === "cloze");
    const mc = exercises.filter((e: any) => e.type === "multiple_choice");
    if (cloze.length > 0) count++;
    if (mc.length > 0) count++;
    if (ex.practice_dialog) count++;
    if ((ex.cultural_notes || []).length > 0) count++;
    if (ex.grammar_questions?.length > 0 && !exercises.length) count++;
    if (ex.reading) count++;
    return count;
  };

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

  // ─── Lesson detail view (with fog + filling effect) ───
  if (activeLesson) {
    const lessonIndex = lessons.findIndex(l => l.id === activeLesson.id);
    const totalSections = countSections(activeLesson);
    const progressPercent = totalSections > 0 ? Math.min(100, Math.round((sectionsOpened / totalSections) * 100)) : 0;

    return (
      <div className={`flex flex-col ${isMobile ? "min-h-full" : "h-full"}`}>
        {/* Fog overlay */}
        <div className="fog-overlay" style={{ "--clarity": clarity } as React.CSSProperties} />

        <div className={`flex-1 w-full mx-auto px-4 relative z-10 ${isMobile ? "max-w-md py-4" : "max-w-2xl py-6"}`}>
          {/* Back button */}
          <button
            onClick={() => setActiveLesson(null)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            {lang === "uk" ? "До уроків" : "К урокам"}
          </button>

          {/* Level logo with fill effect */}
          <div className="flex flex-col items-center mb-6">
            <CourseLevelLogo
              level={course.level}
              progress={progressPercent}
              completed={progressPercent >= 100}
            />
            <p className="text-sm text-muted-foreground mt-3 font-medium">
              {lang === "uk" ? "Урок" : "Урок"} {lessonIndex + 1}
            </p>
            <h2 className="font-display text-lg font-bold text-foreground mt-1 text-center">
              {activeLesson.title}
            </h2>
          </div>

          {/* Lesson sections */}
          <LessonCard
            lesson={activeLesson}
            index={lessonIndex}
            lang={lang}
            level={course.level}
            isExpanded={true}
            onToggle={() => {}}
            onSectionOpen={handleSectionOpen}
            hideHeader
          />
        </div>
      </div>
    );
  }

  // ─── Lessons list view ───
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

      <div className="space-y-2">
        {lessons.map((lesson, i) => (
          <button
            key={lesson.id}
            onClick={() => setActiveLesson(lesson)}
            className="w-full flex items-center gap-3.5 p-4 rounded-2xl border border-border/30 bg-card/60 hover:bg-card/80 hover:border-border/50 transition-all text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 font-display font-bold text-sm group-hover:bg-primary/20 transition-colors">
              {i + 1}
            </div>
            <span className="text-sm font-semibold text-foreground flex-1">{lesson.title}</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default Course;
