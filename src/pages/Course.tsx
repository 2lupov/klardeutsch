import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp, Lock, Volume2, Eye, EyeOff, CheckCircle, XCircle, Lightbulb, MessageCircle, Globe } from "lucide-react";

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

/* ─── Cloze Exercise Component ─── */
const ClozeExercise = ({ ex, lang }: { ex: any; lang: string }) => {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = answer.trim().toLowerCase() === ex.answer.toLowerCase();
  const hint = lang === "uk" ? ex.hint?.ua : ex.hint?.ru;
  const explanation = lang === "uk" ? ex.explanation?.ua : ex.explanation?.ru;

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
      <p className="text-sm font-medium text-foreground mb-2">{ex.text_de}</p>
      {hint && !submitted && <p className="text-[10px] text-muted-foreground mb-2">💡 {hint}</p>}
      <div className="flex gap-2">
        <input
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); setSubmitted(false); }}
          placeholder="..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
          onKeyDown={(e) => e.key === "Enter" && setSubmitted(true)}
        />
        <button
          onClick={() => setSubmitted(true)}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold"
        >
          ✓
        </button>
      </div>
      {submitted && (
        <div className={`mt-2 flex items-start gap-1.5 text-xs ${isCorrect ? "text-green-500" : "text-destructive"}`}>
          {isCorrect ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
          <div>
            {isCorrect ? (lang === "uk" ? "Правильно!" : "Правильно!") : (
              <span>{lang === "uk" ? "Відповідь" : "Ответ"}: <strong>{ex.answer}</strong></span>
            )}
            {explanation && <p className="text-muted-foreground mt-0.5">{explanation}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Multiple Choice Component ─── */
const MCExercise = ({ ex, lang }: { ex: any; lang: string }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const question = lang === "uk" ? ex.question?.ua : ex.question?.ru;
  const explanation = lang === "uk" ? ex.explanation?.ua : ex.explanation?.ru;

  return (
    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
      <p className="text-sm font-medium text-foreground mb-2">{question}</p>
      <div className="grid gap-1.5">
        {ex.options?.map((opt: any, i: number) => {
          const label = typeof opt === "string" ? opt : opt.text || opt.de;
          const isCorrect = i === ex.correct_index;
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => setSelected(i)}
              disabled={selected !== null}
              className={`text-left px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                selected === null
                  ? "bg-secondary border-border hover:border-primary/50"
                  : isCorrect
                  ? "bg-green-500/10 border-green-500/30 text-green-500"
                  : isSelected
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : "bg-secondary border-border opacity-50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {selected !== null && explanation && (
        <p className="text-[10px] text-muted-foreground mt-2 flex items-start gap-1">
          <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
          {explanation}
        </p>
      )}
    </div>
  );
};

/* ─── Main Course Page ─── */
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

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

  const renderLessonContent = (lesson: CourseLesson) => {
    const ex = lesson.exercises || {};
    const vocab = ex.vocabulary || ex.vocab_cards || [];
    const exercises = ex.exercises || [];
    const dialog = ex.practice_dialog;
    const culturalNotes = ex.cultural_notes || [];
    const topicDesc = lang === "uk" ? ex.topic_description?.ua : ex.topic_description?.ru;

    const clozeExercises = exercises.filter((e: any) => e.type === "cloze");
    const mcExercises = exercises.filter((e: any) => e.type === "multiple_choice");

    const sectionKey = (name: string) => `${lesson.id}-${name}`;

    return (
      <div className="px-4 pb-4 space-y-3 animate-slide-up">
        {/* Topic description */}
        {topicDesc && (
          <p className="text-xs text-muted-foreground italic">{topicDesc}</p>
        )}

        {/* Theory */}
        {lesson.theory && (
          <div>
            <button onClick={() => toggleSection(sectionKey("theory"))} className="w-full flex items-center gap-2 text-[10px] text-muted-foreground font-bold mb-1.5">
              📖 {lang === "uk" ? "ТЕОРІЯ" : "ТЕОРИЯ"}
              {expandedSections[sectionKey("theory")] ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {expandedSections[sectionKey("theory")] && (
              <div className="p-3 rounded-lg bg-secondary border border-border">
                <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed prose-sm">{lesson.theory}</div>
              </div>
            )}
          </div>
        )}

        {/* Vocabulary */}
        {vocab.length > 0 && (
          <div>
            <button onClick={() => toggleSection(sectionKey("vocab"))} className="w-full flex items-center gap-2 text-[10px] text-muted-foreground font-bold mb-1.5">
              📚 {lang === "uk" ? "СЛОВНИК" : "СЛОВАРЬ"} ({vocab.length})
              {expandedSections[sectionKey("vocab")] ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {expandedSections[sectionKey("vocab")] && (
              <div className="grid gap-1.5">
                {vocab.map((v: any, i: number) => {
                  const german = v.de || v.german || "";
                  const translation = lang === "uk" ? (v.ua || v.ukrainian || v.ru || v.russian) : (v.ru || v.russian || "");
                  const example = v.example_de || v.example || "";
                  return (
                    <div key={i} className="p-2.5 rounded-lg bg-muted/30 border border-border/20">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-foreground">{german}</span>
                        <span className="text-muted-foreground">— {translation}</span>
                      </div>
                      {example && <p className="text-[10px] text-muted-foreground mt-0.5 italic">💬 {example}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Cloze exercises */}
        {clozeExercises.length > 0 && (
          <div>
            <button onClick={() => toggleSection(sectionKey("cloze"))} className="w-full flex items-center gap-2 text-[10px] text-muted-foreground font-bold mb-1.5">
              ✍️ {lang === "uk" ? "ЗАПОВНІТЬ ПРОПУСКИ" : "ЗАПОЛНИТЕ ПРОПУСКИ"} ({clozeExercises.length})
              {expandedSections[sectionKey("cloze")] ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {expandedSections[sectionKey("cloze")] && (
              <div className="space-y-2">
                {clozeExercises.map((e: any, i: number) => (
                  <ClozeExercise key={i} ex={e} lang={lang} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Multiple choice */}
        {mcExercises.length > 0 && (
          <div>
            <button onClick={() => toggleSection(sectionKey("mc"))} className="w-full flex items-center gap-2 text-[10px] text-muted-foreground font-bold mb-1.5">
              📝 {lang === "uk" ? "ВИБЕРІТЬ ВІДПОВІДЬ" : "ВЫБЕРИТЕ ОТВЕТ"} ({mcExercises.length})
              {expandedSections[sectionKey("mc")] ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {expandedSections[sectionKey("mc")] && (
              <div className="space-y-2">
                {mcExercises.map((e: any, i: number) => (
                  <MCExercise key={i} ex={e} lang={lang} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legacy grammar questions support */}
        {ex.grammar_questions?.length > 0 && !exercises.length && (
          <div>
            <span className="text-[10px] text-muted-foreground font-bold block mb-1.5">
              📝 {lang === "uk" ? "ГРАМАТИКА" : "ГРАММАТИКА"} ({ex.grammar_questions.length})
            </span>
            <div className="space-y-2">
              {ex.grammar_questions.map((q: any, qi: number) => (
                <MCExercise key={qi} ex={q} lang={lang} />
              ))}
            </div>
          </div>
        )}

        {/* Practice Dialog */}
        {dialog && (
          <div>
            <button onClick={() => toggleSection(sectionKey("dialog"))} className="w-full flex items-center gap-2 text-[10px] text-muted-foreground font-bold mb-1.5">
              <MessageCircle className="w-3 h-3" />
              {lang === "uk" ? "ДІАЛОГ" : "ДИАЛОГ"}: {lang === "uk" ? dialog.title?.ua : dialog.title?.ru}
              {expandedSections[sectionKey("dialog")] ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {expandedSections[sectionKey("dialog")] && (
              <div className="space-y-2 p-3 rounded-lg bg-secondary border border-border">
                {dialog.dialog?.map((line: any, i: number) => {
                  const role = lang === "uk" ? line.role?.ua : line.role?.ru;
                  const translation = lang === "uk" ? line.text_ua : line.text_ru;
                  return (
                    <div key={i} className={`flex gap-2 ${line.speaker === "B" ? "flex-row-reverse text-right" : ""}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        line.speaker === "A" ? "bg-primary/15 text-primary" : "bg-accent text-accent-foreground"
                      }`}>
                        {line.speaker}
                      </div>
                      <div className={`flex-1 p-2 rounded-lg text-xs ${
                        line.speaker === "A" ? "bg-primary/5 border border-primary/10" : "bg-muted/50 border border-border/30"
                      }`}>
                        <p className="font-medium text-foreground">{line.text_de}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5">{translation}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Cultural Notes */}
        {culturalNotes.length > 0 && (
          <div>
            <button onClick={() => toggleSection(sectionKey("culture"))} className="w-full flex items-center gap-2 text-[10px] text-muted-foreground font-bold mb-1.5">
              <Globe className="w-3 h-3" />
              {lang === "uk" ? "КУЛЬТУРА" : "КУЛЬТУРА"} ({culturalNotes.length})
              {expandedSections[sectionKey("culture")] ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
            </button>
            {expandedSections[sectionKey("culture")] && (
              <div className="space-y-2">
                {culturalNotes.map((note: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-accent/30 border border-accent/20">
                    <p className="text-xs font-semibold text-foreground mb-1">
                      🌍 {lang === "uk" ? note.title?.ua : note.title?.ru}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {lang === "uk" ? note.content?.ua : note.content?.ru}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Legacy reading support */}
        {ex.reading && (
          <div>
            <span className="text-[10px] text-muted-foreground font-bold block mb-1.5">
              📚 {lang === "uk" ? "ЧИТАННЯ" : "ЧТЕНИЕ"}
            </span>
            <div className="p-2 rounded-lg bg-muted/30 text-xs">
              <p className="font-medium text-foreground mb-1">{ex.reading.title}</p>
              <p className="text-muted-foreground whitespace-pre-wrap">{ex.reading.text}</p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full mx-auto px-4 py-6 max-w-2xl">
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

            {expandedLesson === lesson.id && renderLessonContent(lesson)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Course;
