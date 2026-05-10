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
import PresenterMode from "@/components/tutoring/PresenterMode";
import { Monitor } from "lucide-react";
import LessonTheoryRenderer from "@/components/tutoring/LessonTheoryRenderer";
import { AnimatePresence } from "framer-motion";

const EX_TYPES = [
  { id: "quiz", uk: "Тест (4 варіанти)", ru: "Тест (4 варианта)" },
  { id: "cloze", uk: "Заповнити пропуск", ru: "Заполнить пропуск" },
  { id: "translation", uk: "Переклад", ru: "Перевод" },
  { id: "article", uk: "Артикль der/die/das", ru: "Артикль der/die/das" },
  { id: "word_order", uk: "Скласти речення", ru: "Собрать предложение" },
  { id: "conjugation", uk: "Відмінювання дієслова", ru: "Спряжение глагола" },
  { id: "plural", uk: "Множина", ru: "Множественное число" },
  { id: "error_correction", uk: "Знайти помилку", ru: "Найти ошибку" },
  { id: "synonym", uk: "Синонім", ru: "Синоним" },
  { id: "antonym", uk: "Антонім", ru: "Антоним" },
  { id: "question_formation", uk: "Скласти питання", ru: "Составить вопрос" },
  { id: "dictation", uk: "Диктант", ru: "Диктант" },
];

// Нормалізація відповіді: lowercase, ä→ae, ö→oe, ü→ue, ß→ss, забрати пунктуацію, схлопнути пробіли
const normalizeAns = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/ё/g, "е").replace(/і/g, "и")
    .replace(/[.,!?;:"'`«»„""''()\[\]{}\-—–_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Levenshtein
const lev = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => i);
  for (let j = 1; j <= b.length; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= a.length; i++) {
      const tmp = dp[i];
      dp[i] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[i], dp[i - 1]);
      prev = tmp;
    }
  }
  return dp[a.length];
};

// Перевірка з толерантністю до дрібних помилок (опечатки, артиклі, регістр, умляути)
const checkAnswer = (user: string, correct: string, type: string): boolean => {
  if (!correct) return false;
  const u = normalizeAns(user);
  const c = normalizeAns(correct);
  if (!u) return false;
  if (u === c) return true;
  // Quiz/article — суворіше (вибір з варіантів)
  if (type === "quiz" || type === "article") return u === c;
  // Часто учень забуває або додає артикль (der/die/das/ein/eine)
  const stripArt = (s: string) => s.replace(/^(der|die|das|den|dem|des|ein|eine|einen|einem|einer|eines)\s+/, "");
  if (stripArt(u) === stripArt(c)) return true;
  // Підрядок (наприклад відповідь з пунктуацією або без зайвого слова)
  if (c.length >= 4 && (u.includes(c) || c.includes(u))) {
    const ratio = Math.min(u.length, c.length) / Math.max(u.length, c.length);
    if (ratio >= 0.6) return true;
  }
  // Levenshtein-толерантність: ~15% довжини або мінімум 1-2 опечатки
  const dist = lev(u, c);
  const maxLen = Math.max(u.length, c.length);
  const tol = maxLen <= 4 ? 1 : maxLen <= 10 ? 2 : Math.ceil(maxLen * 0.18);
  return dist <= tol;
};

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
  const [showAddEx, setShowAddEx] = useState(false);
  const [newEx, setNewEx] = useState<{ exercise_type: string; question: string; options: string; correct_answer: string; explanation: string }>({ exercise_type: "quiz", question: "", options: "", correct_answer: "", explanation: "" });
  const [savingEx, setSavingEx] = useState(false);
  const [showAiEx, setShowAiEx] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiTypes, setAiTypes] = useState<string[]>(["quiz", "cloze", "translation"]);
  const [aiLoading, setAiLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [hwSubmissions, setHwSubmissions] = useState<Record<string, string>>({});
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  const load = async () => {
    if (!id || !user) return;
    setLoading(true);
    const { data: l } = await supabase.from("tutoring_lessons").select("*").eq("id", id).single();
    if (!l) {
      toast.error(t("Урок не знайдено", "Урок не найден"));
      navigate("/assignments");
      return;
    }
    // Server-side guard: only the lesson's teacher or student may view.
    if (l.teacher_id !== user.id && l.student_id !== user.id) {
      toast.error(t("Немає доступу", "Нет доступа"));
      navigate("/assignments");
      return;
    }
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

  const addExercise = async () => {
    if (!newEx.question.trim()) {
      toast.error(t("Введіть питання", "Введите вопрос"));
      return;
    }
    const opts = newEx.exercise_type === "quiz"
      ? newEx.options.split("\n").map(s => s.trim()).filter(Boolean)
      : [];
    if (newEx.exercise_type === "quiz" && opts.length < 2) {
      toast.error(t("Додайте хоча б 2 варіанти", "Добавьте хотя бы 2 варианта"));
      return;
    }
    if (newEx.exercise_type === "quiz" && newEx.correct_answer && !opts.includes(newEx.correct_answer.trim())) {
      toast.error(t("Правильна відповідь має співпадати з одним з варіантів", "Правильный ответ должен совпадать с одним из вариантов"));
      return;
    }
    setSavingEx(true);
    const { data, error } = await supabase
      .from("tutoring_lesson_exercises")
      .insert({
        lesson_id: id,
        exercise_type: newEx.exercise_type,
        question: newEx.question.trim(),
        options: opts,
        correct_answer: newEx.correct_answer.trim() || null,
        explanation: newEx.explanation.trim() || null,
        sort_order: exercises.length,
      })
      .select()
      .single();
    setSavingEx(false);
    if (error) return toast.error(error.message);
    setExercises([...exercises, data]);
    setNewEx({ exercise_type: "quiz", question: "", options: "", correct_answer: "", explanation: "" });
    setShowAddEx(false);
    toast.success(t("Вправу додано", "Упражнение добавлено"));
  };

  const delExercise = async (exId: string) => {
    if (!confirm(t("Видалити вправу?", "Удалить упражнение?"))) return;
    await supabase.from("tutoring_lesson_exercises").delete().eq("id", exId);
    setExercises(exercises.filter(e => e.id !== exId));
  };

  const generateAiExercises = async () => {
    if (aiTypes.length === 0) {
      toast.error(t("Оберіть хоча б один тип", "Выберите хотя бы один тип"));
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-extra-exercises", {
        body: { lesson_id: id, prompt: aiPrompt.trim(), types: aiTypes, count: aiCount },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const added = data?.exercises || [];
      setExercises([...exercises, ...added]);
      toast.success(t(`Додано вправ: ${added.length}`, `Добавлено упражнений: ${added.length}`));
      setAiPrompt("");
      setShowAiEx(false);
    } catch (e: any) {
      const msg = String(e?.message || e);
      if (msg.includes("402")) toast.error(t("Закінчились AI-кредити", "Закончились AI-кредиты"));
      else if (msg.includes("429")) toast.error(t("Забагато запитів. Спробуйте пізніше", "Слишком много запросов. Попробуйте позже"));
      else toast.error(msg);
    } finally {
      setAiLoading(false);
    }
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
              <>
                <Button size="sm" onClick={() => setPresenterOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg">
                  <Monitor className="w-4 h-4" /> {t("Провести урок", "Провести урок")}
                </Button>
                <Button size="sm" variant="outline" onClick={completeLesson} className="gap-2">
                  <Check className="w-4 h-4" /> {t("Завершити", "Завершить")}
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Theory, words, exercises, homework tabs */}

        <Tabs defaultValue={isTeacher ? "theory" : "words"} className="w-full">
          <TabsList className={`mb-4 grid w-full ${isTeacher ? "grid-cols-4" : "grid-cols-3"}`}>
            {isTeacher && (
              <TabsTrigger value="theory" className="gap-1.5"><FileText className="w-4 h-4" /><span className="hidden sm:inline">{t("Теорія", "Теория")}</span></TabsTrigger>
            )}
            <TabsTrigger value="words" className="gap-1.5"><BookOpen className="w-4 h-4" /><span className="hidden sm:inline">{t("Слова", "Слова")}</span> <span className="text-[10px] opacity-60">({words.length})</span></TabsTrigger>
            <TabsTrigger value="exercises" className="gap-1.5"><ListChecks className="w-4 h-4" /><span className="hidden sm:inline">{t("Вправи", "Упражнения")}</span> <span className="text-[10px] opacity-60">({exercises.length})</span></TabsTrigger>
            <TabsTrigger value="homework" className="gap-1.5"><Sparkles className="w-4 h-4" /><span className="hidden sm:inline">{t("ДЗ", "ДЗ")}</span> <span className="text-[10px] opacity-60">({homework.length})</span></TabsTrigger>
          </TabsList>

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

          {/* EXERCISES */}
          <TabsContent value="exercises">
            <div className="space-y-3">
            {isTeacher && (
              <div className="flex justify-end gap-2 flex-wrap">
                <Button size="sm" variant={showAiEx ? "outline" : "default"} onClick={() => { setShowAiEx(!showAiEx); setShowAddEx(false); }} className="gap-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:opacity-90">
                  <Sparkles className="w-4 h-4" /> {showAiEx ? t("Сховати ШІ", "Скрыть ИИ") : t("Згенерувати ШІ", "Сгенерировать ИИ")}
                </Button>
                <Button size="sm" variant={showAddEx ? "outline" : "secondary"} onClick={() => { setShowAddEx(!showAddEx); setShowAiEx(false); }} className="gap-1.5">
                  <Plus className="w-4 h-4" /> {showAddEx ? t("Сховати", "Скрыть") : t("Додати вручну", "Добавить вручную")}
                </Button>
              </div>
            )}
            {isTeacher && showAiEx && (
              <div className="p-4 rounded-2xl border-2 border-dashed border-primary/40 bg-gradient-to-br from-primary/5 via-primary/[0.02] to-transparent space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="text-sm font-bold">{t("Згенерувати додаткові вправи через ШІ", "Сгенерировать доп. упражнения через ИИ")}</span>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t("Що саме потренувати?", "Что именно потренировать?")}</label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder={t("Напр.: вправи на минулий час Perfekt зі словами уроку", "Напр.: упражнения на Perfekt со словами урока")}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t("Кількість", "Количество")}</label>
                    <Input type="number" min={1} max={40} value={aiCount} onChange={(e) => setAiCount(Math.max(1, Math.min(40, Number(e.target.value) || 1)))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t("Типи вправ", "Типы упражнений")}</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EX_TYPES.map(et => {
                      const active = aiTypes.includes(et.id);
                      return (
                        <button
                          key={et.id}
                          type="button"
                          onClick={() => setAiTypes(active ? aiTypes.filter(x => x !== et.id) : [...aiTypes, et.id])}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                            active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:border-primary/40"
                          }`}
                        >
                          {lang === "uk" ? et.uk : et.ru}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={generateAiExercises} disabled={aiLoading} className="gap-1.5">
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {aiLoading ? t("Генерую…", "Генерирую…") : t("Згенерувати", "Сгенерировать")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAiEx(false)} disabled={aiLoading}>{t("Скасувати", "Отмена")}</Button>
                </div>
              </div>
            )}
            {isTeacher && showAddEx && (
              <div className="p-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t("Тип вправи", "Тип упражнения")}</label>
                  <select
                    value={newEx.exercise_type}
                    onChange={(e) => setNewEx({ ...newEx, exercise_type: e.target.value })}
                    className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
                  >
                    {EX_TYPES.map(ex => (
                      <option key={ex.id} value={ex.id}>{lang === "uk" ? ex.uk : ex.ru}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t("Питання / Завдання", "Вопрос / Задание")}</label>
                  <Textarea
                    value={newEx.question}
                    onChange={(e) => setNewEx({ ...newEx, question: e.target.value })}
                    placeholder={t("Напр.: Ich ___ heute ins Kino. (gehen)", "Напр.: Ich ___ heute ins Kino. (gehen)")}
                    rows={2}
                  />
                </div>
                {newEx.exercise_type === "quiz" && (
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t("Варіанти (по одному в рядку)", "Варианты (по одному в строке)")}</label>
                    <Textarea
                      value={newEx.options}
                      onChange={(e) => setNewEx({ ...newEx, options: e.target.value })}
                      placeholder={"gehe\ngehst\ngeht\ngehen"}
                      rows={4}
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t("Правильна відповідь", "Правильный ответ")}</label>
                  <Input
                    value={newEx.correct_answer}
                    onChange={(e) => setNewEx({ ...newEx, correct_answer: e.target.value })}
                    placeholder={t("Точна відповідь", "Точный ответ")}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase text-muted-foreground mb-1 block">{t("Пояснення (необов'язково)", "Пояснение (необязательно)")}</label>
                  <Textarea
                    value={newEx.explanation}
                    onChange={(e) => setNewEx({ ...newEx, explanation: e.target.value })}
                    placeholder={t("Чому саме така відповідь", "Почему именно такой ответ")}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={addExercise} disabled={savingEx} className="gap-1.5">
                    {savingEx ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {t("Зберегти", "Сохранить")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddEx(false)}>{t("Скасувати", "Отмена")}</Button>
                </div>
              </div>
            )}
            {exercises.map((ex, idx) => {
              const userAns = answers[ex.id] || "";
              const isRevealed = revealed[ex.id];
              const correct = checkAnswer(userAns, ex.correct_answer || "", ex.exercise_type);
              return (
                <div key={ex.id} className="p-5 rounded-2xl border border-border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                    <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase">{ex.exercise_type}</span>
                    {isTeacher && (
                      <button onClick={() => delExercise(ex.id)} className="ml-auto text-muted-foreground hover:text-destructive transition" aria-label="delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
            {exercises.length === 0 && !showAddEx && (
              <div className="text-center py-12 text-muted-foreground">{t("Немає вправ", "Нет упражнений")}</div>
            )}
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
      <AnimatePresence>
        {presenterOpen && isTeacher && (
          <PresenterMode
            lesson={lesson}
            words={words}
            exercises={exercises}
            studentName={studentProfile?.display_name || t("Учень", "Ученик")}
            studentProfile={studentProfile}
            onClose={() => setPresenterOpen(false)}
          />
        )}
      </AnimatePresence>
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
