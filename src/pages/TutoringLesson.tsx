import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Calendar, Clock, BookOpen, Sparkles,
  Plus, Trash2, Check, Edit3, Save, Loader2, FileText, ListChecks,
  GraduationCap, Send
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import LessonVideoRoom from "@/components/tutoring/LessonVideoRoom";
import LessonTheoryRenderer from "@/components/tutoring/LessonTheoryRenderer";
import LessonNotebook from "@/components/tutoring/LessonNotebook";
import PresenterMode from "@/components/tutoring/PresenterMode";
import { Monitor } from "lucide-react";
import { AnimatePresence } from "framer-motion";

const articleColor = (a: string | null) => {
  if (a === "der") return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (a === "die") return "bg-pink-500/10 text-pink-600 border-pink-500/20";
  if (a === "das") return "bg-green-500/10 text-green-600 border-green-500/20";
  return "bg-muted text-muted-foreground border-border";
};

const TutoringLesson = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const [lesson, setLesson] = useState<any>(null);
  const [words, setWords] = useState<any[]>([]);
  const [exercises, setExercises] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  // Edit state
  const [editingTheory, setEditingTheory] = useState(false);
  const [theoryDraft, setTheoryDraft] = useState("");
  const [newWord, setNewWord] = useState({ german: "", article: "", russian: "", example: "" });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [hwSubmissions, setHwSubmissions] = useState<Record<string, string>>({});
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  const load = async () => {
    if (!id || !user) return;
    setLoading(true);
    const { data: l } = await supabase.from("tutoring_lessons").select("*").eq("id", id).single();
    if (!l) { setLoading(false); return; }
    setLesson(l);
    setIsTeacher(l.teacher_id === user.id);
    setTheoryDraft(l.theory || "");

    const [w, e, h] = await Promise.all([
      supabase.from("tutoring_lesson_words").select("*").eq("lesson_id", id).order("sort_order"),
      supabase.from("tutoring_lesson_exercises").select("*").eq("lesson_id", id).order("sort_order"),
      supabase.from("tutoring_homework").select("*").eq("lesson_id", id).order("created_at"),
    ]);
    setWords(w.data || []);
    setExercises(e.data || []);
    setHomework(h.data || []);
    setHwSubmissions(
      (h.data || []).reduce((acc: any, hw: any) => ({ ...acc, [hw.id]: hw.submission || "" }), {})
    );
    // Load student profile (for presenter mode)
    if (l.teacher_id === user.id && l.student_id) {
      const { data: sp } = await supabase
        .from("profiles")
        .select("display_name,avatar_url,is_kid,age,recommended_level")
        .eq("user_id", l.student_id)
        .maybeSingle();
      setStudentProfile(sp);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user]);

  const saveTheory = async () => {
    await supabase.from("tutoring_lessons").update({ theory: theoryDraft }).eq("id", id);
    setLesson({ ...lesson, theory: theoryDraft });
    setEditingTheory(false);
    toast.success(t("Збережено", "Сохранено"));
  };

  const addWord = async () => {
    if (!newWord.german || !newWord.russian) return;
    const { data, error } = await supabase
      .from("tutoring_lesson_words")
      .insert({
        lesson_id: id,
        german: newWord.german,
        article: newWord.article || null,
        russian: newWord.russian,
        example: newWord.example || null,
        sort_order: words.length,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setWords([...words, data]);
    setNewWord({ german: "", article: "", russian: "", example: "" });
  };

  const delWord = async (wid: string) => {
    await supabase.from("tutoring_lesson_words").delete().eq("id", wid);
    setWords(words.filter((w) => w.id !== wid));
  };

  const completeLesson = async () => {
    await supabase.from("tutoring_lessons").update({ status: "completed" }).eq("id", id);
    setLesson({ ...lesson, status: "completed" });
    toast.success(t("Урок завершено", "Урок завершён"));
  };

  const submitHw = async (hwId: string) => {
    const text = hwSubmissions[hwId];
    if (!text?.trim()) return;
    const { error } = await supabase
      .from("tutoring_homework")
      .update({ submission: text, submitted_at: new Date().toISOString(), status: "submitted" })
      .eq("id", hwId);
    if (error) return toast.error(error.message);
    toast.success(t("Здано на перевірку", "Сдано на проверку"));
    load();
  };

  const gradeHw = async (hwId: string, grade: number, feedback: string) => {
    await supabase
      .from("tutoring_homework")
      .update({ grade, feedback, status: "graded" })
      .eq("id", hwId);
    toast.success(t("Оцінено", "Оценено"));
    load();
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }
  if (!lesson) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("Не знайдено", "Не найдено")}</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 lg:pb-12">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 lg:pt-10">
        <button onClick={() => navigate("/tutoring")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="w-4 h-4" /> {t("До списку", "К списку")}
        </button>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 lg:p-8 bg-gradient-to-br from-primary/10 via-card to-card border border-border shadow-sm mb-6"
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 rounded-md bg-primary text-primary-foreground text-xs font-bold">{lesson.level}</span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
              lesson.status === "completed" ? "bg-green-500/20 text-green-700"
              : lesson.status === "scheduled" ? "bg-blue-500/20 text-blue-700"
              : "bg-muted text-muted-foreground"
            }`}>
              {lesson.status === "completed" ? t("Завершено", "Завершён")
                : lesson.status === "scheduled" ? t("Заплановано", "Запланирован")
                : t("Чернетка", "Черновик")}
            </span>
            {isTeacher && <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold flex items-center gap-1"><GraduationCap className="w-3 h-3" />{t("Викладач", "Преподаватель")}</span>}
          </div>
          <h1 className="text-2xl lg:text-4xl font-display font-black mb-2">{lesson.title}</h1>
          {lesson.topic && <p className="text-muted-foreground">{lesson.topic}</p>}
          <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
            {lesson.scheduled_at && (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                {new Date(lesson.scheduled_at).toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU")}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" /> {lesson.duration_minutes} {t("хв", "мин")}
            </span>
            {isTeacher && lesson.status !== "completed" && (
              <Button size="sm" variant="outline" onClick={completeLesson} className="gap-2">
                <Check className="w-4 h-4" /> {t("Завершити", "Завершить")}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Video room with recording */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
          <LessonVideoRoom
            lessonId={lesson.id}
            teacherId={lesson.teacher_id}
            studentId={lesson.student_id}
            isTeacher={isTeacher}
            userName={user?.email?.split("@")[0] || "User"}
            lang={lang as "uk" | "ru"}
          />
        </motion.div>

        <Tabs defaultValue={isTeacher ? "theory" : "notebook"} className="w-full">
          <TabsList className={`mb-4 grid w-full ${isTeacher ? "grid-cols-5" : "grid-cols-4"}`}>
            {isTeacher && (
              <TabsTrigger value="theory" className="gap-1.5"><FileText className="w-4 h-4" /><span className="hidden sm:inline">{t("Теорія", "Теория")}</span></TabsTrigger>
            )}
            <TabsTrigger value="notebook" className="gap-1.5 relative">
              <Edit3 className="w-4 h-4" />
              <span className="hidden sm:inline">{t("Зошит", "Тетрадь")}</span>
              {!isTeacher && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="words" className="gap-1.5"><BookOpen className="w-4 h-4" /><span className="hidden sm:inline">{t("Слова", "Слова")}</span> <span className="text-[10px] opacity-60">({words.length})</span></TabsTrigger>
            <TabsTrigger value="exercises" className="gap-1.5"><ListChecks className="w-4 h-4" /><span className="hidden sm:inline">{t("Вправи", "Упражнения")}</span> <span className="text-[10px] opacity-60">({exercises.length})</span></TabsTrigger>
            <TabsTrigger value="homework" className="gap-1.5"><Sparkles className="w-4 h-4" /><span className="hidden sm:inline">{t("ДЗ", "ДЗ")}</span> <span className="text-[10px] opacity-60">({homework.length})</span></TabsTrigger>
          </TabsList>

          {/* NOTEBOOK — shared realtime canvas (first for student) */}
          <TabsContent value="notebook">
            <LessonNotebook lessonId={lesson.id} isTeacher={isTeacher} lang={lang as "uk" | "ru"} />
          </TabsContent>

          {/* THEORY — teacher only */}
          {isTeacher && (
          <TabsContent value="theory">
            <div className="rounded-2xl border border-border bg-card p-6">
              {isTeacher && !editingTheory && (
                <div className="flex justify-end mb-3">
                  <Button size="sm" variant="ghost" onClick={() => setEditingTheory(true)}><Edit3 className="w-4 h-4 mr-1" />{t("Редагувати", "Редактировать")}</Button>
                </div>
              )}
              {editingTheory ? (
                <div className="space-y-3">
                  <Textarea value={theoryDraft} onChange={(e) => setTheoryDraft(e.target.value)} rows={20} className="font-mono text-sm" />
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" onClick={() => { setEditingTheory(false); setTheoryDraft(lesson.theory || ""); }}>{t("Скасувати", "Отмена")}</Button>
                    <Button onClick={saveTheory}><Save className="w-4 h-4 mr-1" />{t("Зберегти", "Сохранить")}</Button>
                  </div>
                </div>
              ) : (
                <LessonTheoryRenderer content={lesson.theory || ""} />
              )}
            </div>
          </TabsContent>
          )}

          {/* WORDS */}
          <TabsContent value="words" className="space-y-3">
            {words.map((w) => (
              <div key={w.id} className="p-4 rounded-2xl border border-border bg-card flex items-center gap-4 group">
                {w.article && (
                  <span className={`px-2 py-1 rounded-md text-xs font-bold border ${articleColor(w.article)}`}>{w.article}</span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <p className="font-display font-bold text-lg">{w.german}</p>
                    <p className="text-muted-foreground">{w.russian}</p>
                  </div>
                  {w.example && <p className="text-sm text-muted-foreground italic mt-1">{w.example}</p>}
                </div>
                {isTeacher && (
                  <button onClick={() => delWord(w.id)} className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 p-2 rounded-lg transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
            {isTeacher && (
              <div className="p-4 rounded-2xl border-2 border-dashed border-border bg-card/50 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <select value={newWord.article} onChange={(e) => setNewWord({ ...newWord, article: e.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">—</option>
                    <option value="der">der</option><option value="die">die</option><option value="das">das</option>
                  </select>
                  <Input placeholder={t("Німецьке", "Немецкое")} value={newWord.german} onChange={(e) => setNewWord({ ...newWord, german: e.target.value })} />
                  <Input placeholder={t("Переклад", "Перевод")} value={newWord.russian} onChange={(e) => setNewWord({ ...newWord, russian: e.target.value })} />
                  <Button onClick={addWord} className="gap-1"><Plus className="w-4 h-4" />{t("Додати", "Добавить")}</Button>
                </div>
                <Input placeholder={t("Приклад речення (необов'язково)", "Пример (необязательно)")} value={newWord.example} onChange={(e) => setNewWord({ ...newWord, example: e.target.value })} />
              </div>
            )}
            {words.length === 0 && !isTeacher && (
              <div className="text-center py-12 text-muted-foreground">{t("Немає слів", "Нет слов")}</div>
            )}
          </TabsContent>

          {/* EXERCISES — split layout: exercises on the left, sticky shared notebook on the right */}
          <TabsContent value="exercises">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-4">
              <div className="space-y-3 min-w-0">
            {exercises.map((ex, idx) => {
              const userAns = answers[ex.id] || "";
              const isRevealed = revealed[ex.id];
              const correct = userAns.trim().toLowerCase() === (ex.correct_answer || "").trim().toLowerCase();
              return (
                <div key={ex.id} className="p-5 rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">{ex.exercise_type}</span>
                  </div>
                  <p className="font-medium mb-3 whitespace-pre-wrap">{ex.question}</p>
                  {ex.exercise_type === "quiz" && Array.isArray(ex.options) && ex.options.length > 0 ? (
                    <div className="space-y-1.5">
                      {ex.options.map((opt: string) => (
                        <button
                          key={opt}
                          disabled={isRevealed}
                          onClick={() => setAnswers({ ...answers, [ex.id]: opt })}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm transition ${
                            userAns === opt
                              ? isRevealed
                                ? opt === ex.correct_answer ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"
                                : "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          } ${isRevealed && opt === ex.correct_answer ? "border-green-500 bg-green-500/10" : ""}`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Input
                      value={userAns}
                      onChange={(e) => setAnswers({ ...answers, [ex.id]: e.target.value })}
                      disabled={isRevealed}
                      placeholder={t("Ваша відповідь…", "Ваш ответ…")}
                    />
                  )}
                  <div className="flex items-center gap-2 mt-3">
                    {!isRevealed ? (
                      <Button size="sm" onClick={() => setRevealed({ ...revealed, [ex.id]: true })}>{t("Перевірити", "Проверить")}</Button>
                    ) : (
                      <span className={`text-sm font-bold ${correct ? "text-green-600" : "text-destructive"}`}>
                        {correct ? `✓ ${t("Правильно", "Правильно")}` : `✗ ${t("Правильна відповідь", "Правильный ответ")}: ${ex.correct_answer}`}
                      </span>
                    )}
                  </div>
                  {isRevealed && ex.explanation && (
                    <p className="text-xs text-muted-foreground mt-2 p-2 rounded bg-muted">{ex.explanation}</p>
                  )}
                </div>
              );
            })}
            {exercises.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">{t("Немає вправ", "Нет упражнений")}</div>
            )}
              </div>
              {/* Sticky shared notebook — visible while solving exercises (desktop only) */}
              <aside className="hidden lg:block">
                <div className="sticky top-4">
                  <LessonNotebook lessonId={lesson.id} isTeacher={isTeacher} lang={lang as "uk" | "ru"} />
                </div>
              </aside>
            </div>
          </TabsContent>

          {/* HOMEWORK */}
          <TabsContent value="homework" className="space-y-3">
            {homework.map((hw) => (
              <div key={hw.id} className="p-5 rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    hw.status === "graded" ? "bg-green-500/10 text-green-600"
                    : hw.status === "submitted" ? "bg-blue-500/10 text-blue-600"
                    : "bg-muted text-muted-foreground"
                  }`}>
                    {hw.status === "graded" ? t("Оцінено", "Оценено")
                      : hw.status === "submitted" ? t("На перевірці", "На проверке")
                      : t("Чекає", "Ожидает")}
                  </span>
                  {hw.due_at && <span className="text-xs text-muted-foreground">до {new Date(hw.due_at).toLocaleDateString()}</span>}
                </div>
                <p className="whitespace-pre-wrap mb-3">{hw.description}</p>

                {!isTeacher && hw.status !== "graded" && (
                  <div className="space-y-2">
                    <Textarea
                      value={hwSubmissions[hw.id] || ""}
                      onChange={(e) => setHwSubmissions({ ...hwSubmissions, [hw.id]: e.target.value })}
                      placeholder={t("Ваша відповідь…", "Ваш ответ…")}
                      rows={4}
                    />
                    <Button size="sm" onClick={() => submitHw(hw.id)} className="gap-1">
                      <Send className="w-4 h-4" /> {hw.status === "submitted" ? t("Оновити", "Обновить") : t("Здати", "Сдать")}
                    </Button>
                  </div>
                )}

                {hw.submission && (
                  <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">{t("Відповідь учня", "Ответ ученика")}</p>
                    <p className="whitespace-pre-wrap text-sm">{hw.submission}</p>
                  </div>
                )}

                {isTeacher && hw.status === "submitted" && (
                  <TeacherGradeForm hw={hw} onGrade={gradeHw} t={t} />
                )}

                {hw.status === "graded" && (
                  <div className="mt-3 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold uppercase text-green-700">{t("Фідбек викладача", "Фидбек преподавателя")}</p>
                      {hw.grade !== null && <span className="font-bold text-green-700">{hw.grade}/10</span>}
                    </div>
                    {hw.feedback && <p className="text-sm whitespace-pre-wrap">{hw.feedback}</p>}
                  </div>
                )}
              </div>
            ))}
            {homework.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">{t("Немає домашніх завдань", "Нет домашних заданий")}</div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const TeacherGradeForm = ({ hw, onGrade, t }: any) => {
  const [grade, setGrade] = useState<number>(hw.grade || 8);
  const [feedback, setFeedback] = useState(hw.feedback || "");
  return (
    <div className="mt-3 p-3 rounded-lg border border-border space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-xs font-bold uppercase text-muted-foreground">{t("Оцінка", "Оценка")}</label>
        <Input type="number" min={1} max={10} value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="w-20" />
        <span className="text-xs text-muted-foreground">/ 10</span>
      </div>
      <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t("Коментар…", "Комментарий…")} rows={2} />
      <Button size="sm" onClick={() => onGrade(hw.id, grade, feedback)}><Check className="w-4 h-4 mr-1" />{t("Оцінити", "Оценить")}</Button>
    </div>
  );
};

export default TutoringLesson;
