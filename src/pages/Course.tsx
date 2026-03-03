import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, CheckCircle, Lock } from "lucide-react";

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
        <span className="text-muted-foreground">{lang === "uk" ? "Завантаження..." : "Загрузка..."}</span>
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
        <Lock className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          {lang === "uk" ? "Спочатку купіть курс у магазині" : "Сначала купите курс в магазине"}
        </p>
        <button
          onClick={() => navigate("/shop")}
          className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
        >
          {lang === "uk" ? "Перейти до магазину" : "Перейти в магазин"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-4 py-6 max-w-2xl">
      {/* Header */}
      <button onClick={() => navigate("/shop")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        {lang === "uk" ? "Магазин" : "Магазин"}
      </button>

      <div className="glass-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{course.level}</span>
          <h1 className="font-display text-lg font-bold text-foreground">{course.title}</h1>
        </div>
        {course.description && <p className="text-xs text-muted-foreground mt-1">{course.description}</p>}
        <p className="text-[10px] text-muted-foreground mt-2">{lessons.length} {lang === "uk" ? "уроків" : "уроков"}</p>
      </div>

      {/* Lessons */}
      <div className="space-y-2">
        {lessons.map((lesson, i) => (
          <div key={lesson.id} className="glass-card overflow-hidden">
            <button
              onClick={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-foreground flex-1">{lesson.title}</span>
              {expandedLesson === lesson.id ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {expandedLesson === lesson.id && (
              <div className="px-4 pb-4 space-y-3 animate-slide-up">
                {/* Theory */}
                {lesson.theory && (
                  <div className="p-3 rounded-lg bg-secondary border border-border">
                    <span className="text-[10px] text-muted-foreground font-bold block mb-1.5">
                      {lang === "uk" ? "ТЕОРІЯ" : "ТЕОРИЯ"}
                    </span>
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{lesson.theory}</div>
                  </div>
                )}

                {/* Vocab cards */}
                {lesson.exercises?.vocab_cards?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold block mb-1.5">
                      📖 {lang === "uk" ? "СЛОВНИК" : "СЛОВАРЬ"} ({lesson.exercises.vocab_cards.length})
                    </span>
                    <div className="grid gap-1.5">
                      {lesson.exercises.vocab_cards.map((card: any, ci: number) => (
                        <div key={ci} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 text-xs">
                          <span className="font-semibold text-foreground">{card.article ? `${card.article} ` : ""}{card.german}</span>
                          <span className="text-muted-foreground">— {card.russian}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Grammar questions */}
                {lesson.exercises?.grammar_questions?.length > 0 && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold block mb-1.5">
                      📝 {lang === "uk" ? "ГРАМАТИКА" : "ГРАММАТИКА"} ({lesson.exercises.grammar_questions.length})
                    </span>
                    <div className="space-y-2">
                      {lesson.exercises.grammar_questions.map((q: any, qi: number) => (
                        <div key={qi} className="p-2 rounded-lg bg-muted/30 text-xs">
                          <p className="font-medium text-foreground mb-1">{q.question}</p>
                          <div className="flex flex-wrap gap-1">
                            {q.options?.map((opt: string, oi: number) => (
                              <span key={oi} className={`px-2 py-0.5 rounded ${oi === q.correct_index ? "bg-primary/20 text-primary font-bold" : "bg-secondary text-muted-foreground"}`}>
                                {opt}
                              </span>
                            ))}
                          </div>
                          {q.explanation && <p className="text-muted-foreground mt-1 text-[10px]">💡 {q.explanation}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reading */}
                {lesson.exercises?.reading && (
                  <div>
                    <span className="text-[10px] text-muted-foreground font-bold block mb-1.5">
                      📚 {lang === "uk" ? "ЧИТАННЯ" : "ЧТЕНИЕ"}
                    </span>
                    <div className="p-2 rounded-lg bg-muted/30 text-xs">
                      <p className="font-medium text-foreground mb-1">{lesson.exercises.reading.title}</p>
                      <p className="text-muted-foreground whitespace-pre-wrap line-clamp-4">{lesson.exercises.reading.text}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Course;
