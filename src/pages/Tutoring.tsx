import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Users, Sparkles, Calendar, FileStack,
  BookOpen, Clock, Video, ChevronRight, Check, X, Loader2, UserPlus, Search,
  Wand2, Save, Trash2, Copy, Plus, Paperclip, Image as ImageIcon, Mail, Key, Eye, EyeOff
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { fetchEdgeFunction } from "@/lib/auth-fetch";

type Mode = "teacher" | "student" | null;

interface Relationship {
  id: string;
  student_id: string;
  teacher_id: string;
  status: string;
  note: string | null;
  created_at: string;
  profile?: { display_name: string | null; avatar_url: string | null; nickname: string | null };
}

interface Lesson {
  id: string;
  title: string;
  topic: string | null;
  level: string;
  status: string;
  scheduled_at: string | null;
  meeting_link: string | null;
  teacher_id: string;
  student_id: string;
  duration_minutes: number;
}

interface Template {
  id: string;
  name: string;
  description: string | null;
  level: string;
  topic: string | null;
  focus: string | null;
  default_meeting_link: string | null;
  default_duration_minutes: number;
  words_count: number;
  exercises_count: number;
  exercise_types: string[];
  vocabulary: any[];
  theory_template: string | null;
  use_count: number;
  created_at: string;
}

const EX_TYPES = [
  { id: "quiz", uk: "Тест (4 варіанти)", ru: "Тест (4 варианта)" },
  { id: "cloze", uk: "Заповнити пропуск", ru: "Заполнить пропуск" },
  { id: "translation", uk: "Переклад", ru: "Перевод" },
];

const Tutoring = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const [mode, setMode] = useState<Mode>(null);
  const [loading, setLoading] = useState(true);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  // Find teacher dialog (student)
  const [findOpen, setFindOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [searchRes, setSearchRes] = useState<any[]>([]);
  const [requestNote, setRequestNote] = useState("");

  // Create lesson dialog (teacher)
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [lessonTopic, setLessonTopic] = useState("");
  const [lessonLevel, setLessonLevel] = useState("A1");
  const [lessonFocus, setLessonFocus] = useState("");
  const [freePrompt, setFreePrompt] = useState("");
  const [wordsCount, setWordsCount] = useState(10);
  const [exercisesCount, setExercisesCount] = useState(8);
  const [exerciseTypes, setExerciseTypes] = useState<string[]>(["quiz", "cloze", "translation"]);
  const [vocabularyText, setVocabularyText] = useState("");
  const [theoryTemplate, setTheoryTemplate] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  // Save template dialog
  const [saveTplOpen, setSaveTplOpen] = useState(false);
  const [tplName, setTplName] = useState("");
  const [tplDescription, setTplDescription] = useState("");

  // Attached materials for AI generation
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string; type: string; size: number }[]>([]);
  const [uploading, setUploading] = useState(false);

  // Create student dialog
  const [createStudentOpen, setCreateStudentOpen] = useState(false);
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentPassword, setNewStudentPassword] = useState("");
  const [newStudentNote, setNewStudentNote] = useState("");
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isTeacher = roles?.some((r: any) => r.role === "teacher" || r.role === "admin");
      setMode(isTeacher ? "teacher" : "student");
    })();
  }, [user]);

  const loadData = async () => {
    if (!user || !mode) return;
    setLoading(true);
    const col = mode === "teacher" ? "teacher_id" : "student_id";
    const otherCol = mode === "teacher" ? "student_id" : "teacher_id";

    const { data: rels } = await supabase
      .from("tutoring_relationships")
      .select("*")
      .eq(col, user.id)
      .order("created_at", { ascending: false });

    if (rels && rels.length) {
      const otherIds = [...new Set(rels.map((r: any) => r[otherCol]))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, nickname")
        .in("user_id", otherIds);
      const profMap = new Map((profs || []).map((p: any) => [p.user_id, p]));
      setRelationships(
        rels.map((r: any) => ({ ...r, profile: profMap.get(r[otherCol]) }))
      );
    } else {
      setRelationships([]);
    }

    const { data: ls } = await supabase
      .from("tutoring_lessons")
      .select("*")
      .eq(col, user.id)
      .order("created_at", { ascending: false });
    setLessons(ls || []);

    if (mode === "teacher") {
      const { data: tpls } = await supabase
        .from("tutoring_lesson_templates")
        .select("*")
        .eq("teacher_id", user.id)
        .order("updated_at", { ascending: false });
      setTemplates((tpls as any) || []);
    }

    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user, mode]);

  // ===== Student: search teachers =====
  const handleSearch = async (q: string) => {
    setSearchQ(q);
    const { data, error } = await supabase.rpc("search_teachers", { p_query: q });
    if (!error) setSearchRes(data || []);
  };

  const sendRequest = async (teacherId: string) => {
    if (!user) return;
    const { error } = await supabase.from("tutoring_relationships").insert({
      student_id: user.id,
      teacher_id: teacherId,
      note: requestNote || null,
      status: "pending",
    });
    if (error) { toast.error(error.message); return; }
    toast.success(t("Запит надіслано", "Запрос отправлен"));
    setFindOpen(false);
    setRequestNote("");
    loadData();
  };

  const updateRelStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("tutoring_relationships")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Оновлено", "Обновлено"));
    loadData();
  };

  // ===== Templates =====
  const resetCreateForm = () => {
    setLessonTopic(""); setLessonFocus(""); setFreePrompt("");
    setMeetingLink(""); setScheduledAt(""); setLessonLevel("A1");
    setWordsCount(10); setExercisesCount(8);
    setExerciseTypes(["quiz", "cloze", "translation"]);
    setVocabularyText(""); setTheoryTemplate("");
    setDurationMinutes(60);
    setActiveTemplateId(null);
    setAttachedFiles([]);
  };

  // ===== Upload materials (images / PDF / docs) =====
  const handleUpload = async (files: FileList | null) => {
    if (!files || !files.length || !user) return;
    setUploading(true);
    try {
      const uploaded: typeof attachedFiles = [];
      for (const file of Array.from(files)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(t(`Файл "${file.name}" >10MB`, `Файл "${file.name}" >10MB`));
          continue;
        }
        const ext = file.name.split(".").pop() || "bin";
        const path = `${user.id}/draft/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("tutoring-materials")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) { toast.error(upErr.message); continue; }
        const { data: signed } = await supabase.storage
          .from("tutoring-materials")
          .createSignedUrl(path, 60 * 60 * 2); // 2h
        uploaded.push({
          name: file.name,
          url: signed?.signedUrl || "",
          type: file.type,
          size: file.size,
        });
      }
      setAttachedFiles(prev => [...prev, ...uploaded]);
      if (uploaded.length) toast.success(t(`Завантажено: ${uploaded.length}`, `Загружено: ${uploaded.length}`));
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  // ===== Create student account =====
  const createStudent = async () => {
    if (!newStudentEmail || !newStudentName) {
      toast.error(t("Заповніть email та ім'я", "Заполните email и имя"));
      return;
    }
    setCreatingStudent(true);
    try {
      const res = await fetchEdgeFunction("teacher-create-student", {
        json: {
          email: newStudentEmail,
          display_name: newStudentName,
          password: newStudentPassword || undefined,
          note: newStudentNote,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setCreatedCredentials({ email: data.email, password: data.password });
      setNewStudentEmail(""); setNewStudentName(""); setNewStudentPassword(""); setNewStudentNote("");
      loadData();
      toast.success(t("Акаунт створено", "Аккаунт создан"));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreatingStudent(false);
    }
  };

  const copyCredentials = () => {
    if (!createdCredentials) return;
    const text = `Email: ${createdCredentials.email}\nПароль: ${createdCredentials.password}\nВхід: https://klardeutsch.org`;
    navigator.clipboard.writeText(text);
    toast.success(t("Скопійовано", "Скопировано"));
  };


  const applyTemplate = (tpl: Template) => {
    setActiveTemplateId(tpl.id);
    setLessonLevel(tpl.level);
    setLessonTopic(tpl.topic || "");
    setLessonFocus(tpl.focus || "");
    setMeetingLink(tpl.default_meeting_link || "");
    setDurationMinutes(tpl.default_duration_minutes);
    setWordsCount(tpl.words_count);
    setExercisesCount(tpl.exercises_count);
    setExerciseTypes(tpl.exercise_types || ["quiz","cloze","translation"]);
    setVocabularyText((tpl.vocabulary || []).map((v: any) => typeof v === "string" ? v : v.german).join(", "));
    setTheoryTemplate(tpl.theory_template || "");
    setCreateOpen(true);
    toast.success(t(`Шаблон "${tpl.name}" застосовано`, `Шаблон "${tpl.name}" применён`));
  };

  const saveTemplate = async () => {
    if (!user || !tplName.trim()) {
      toast.error(t("Введіть назву шаблону", "Введите название шаблона"));
      return;
    }
    const vocab = vocabularyText.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
    const payload = {
      teacher_id: user.id,
      name: tplName.trim(),
      description: tplDescription.trim() || null,
      level: lessonLevel,
      topic: lessonTopic || null,
      focus: lessonFocus || null,
      default_meeting_link: meetingLink || null,
      default_duration_minutes: durationMinutes,
      words_count: wordsCount,
      exercises_count: exercisesCount,
      exercise_types: exerciseTypes,
      vocabulary: vocab,
      theory_template: theoryTemplate || null,
    };
    const { error } = await supabase.from("tutoring_lesson_templates").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(t("Шаблон збережено", "Шаблон сохранён"));
    setSaveTplOpen(false);
    setTplName(""); setTplDescription("");
    loadData();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm(t("Видалити шаблон?", "Удалить шаблон?"))) return;
    const { error } = await supabase.from("tutoring_lesson_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Видалено", "Удалено"));
    loadData();
  };

  // ===== Generate lesson =====
  const generateAndCreate = async () => {
    if (!selectedStudent) {
      toast.error(t("Оберіть учня", "Выберите ученика"));
      return;
    }
    if (!lessonTopic && !freePrompt) {
      toast.error(t("Вкажіть тему або опишіть заняття", "Укажите тему или опишите занятие"));
      return;
    }
    setGenerating(true);
    try {
      const vocab = vocabularyText.split(/[,\n;]+/).map(s => s.trim()).filter(Boolean);
      const res = await fetchEdgeFunction("generate-tutoring-lesson", {
        json: {
          topic: lessonTopic || "Allgemein",
          level: lessonLevel,
          focus: lessonFocus,
          freePrompt,
          wordsCount,
          exercisesCount,
          exerciseTypes,
          vocabulary: vocab,
          theoryTemplate,
          imageUrls: attachedFiles.filter(f => f.type.startsWith("image/")).map(f => f.url),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI error");

      const ai = data.lesson;
      const { data: created, error: createErr } = await supabase
        .from("tutoring_lessons")
        .insert({
          teacher_id: user!.id,
          student_id: selectedStudent,
          title: ai.title || lessonTopic || "Lektion",
          topic: lessonTopic || null,
          level: lessonLevel,
          theory: ai.theory || "",
          meeting_link: meetingLink || null,
          scheduled_at: scheduledAt || null,
          duration_minutes: durationMinutes,
          status: scheduledAt ? "scheduled" : "draft",
          ai_prompt: freePrompt || lessonFocus || null,
        })
        .select()
        .single();
      if (createErr) throw createErr;

      if (ai.words?.length) {
        await supabase.from("tutoring_lesson_words").insert(
          ai.words.map((w: any, i: number) => ({
            lesson_id: created.id,
            german: w.german,
            article: w.article === "null" ? null : w.article,
            russian: w.russian,
            example: w.example,
            sort_order: i,
          }))
        );
      }
      if (ai.exercises?.length) {
        await supabase.from("tutoring_lesson_exercises").insert(
          ai.exercises.map((e: any, i: number) => ({
            lesson_id: created.id,
            exercise_type: e.type || "quiz",
            question: e.question,
            options: e.options || [],
            correct_answer: e.correct_answer,
            explanation: e.explanation,
            sort_order: i,
          }))
        );
      }
      if (ai.homework?.length) {
        await supabase.from("tutoring_homework").insert(
          ai.homework.map((h: any) => ({
            lesson_id: created.id,
            description: h.description,
          }))
        );
      }

      // Increment template use count
      if (activeTemplateId) {
        const tpl = templates.find(x => x.id === activeTemplateId);
        if (tpl) {
          await supabase
            .from("tutoring_lesson_templates")
            .update({ use_count: tpl.use_count + 1 })
            .eq("id", activeTemplateId);
        }
      }

      toast.success(t("Урок створено!", "Урок создан!"));
      setCreateOpen(false);
      resetCreateForm();
      navigate(`/tutoring/lesson/${created.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const toggleExType = (id: string) => {
    setExerciseTypes(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const activeStudents = useMemo(
    () => relationships.filter((r) => r.status === "active"),
    [relationships]
  );
  const pendingRels = useMemo(
    () => relationships.filter((r) => r.status === "pending"),
    [relationships]
  );

  if (!user || !mode) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 lg:pb-12">
      <div className="max-w-6xl mx-auto px-4 lg:px-8 pt-6 lg:pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-8 flex-wrap gap-4"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-3">
              <GraduationCap className="w-3.5 h-3.5" />
              {mode === "teacher" ? t("Кабінет викладача", "Кабинет преподавателя") : t("Мої заняття", "Мои занятия")}
            </div>
            <h1 className="text-3xl lg:text-4xl font-display font-black">
              {mode === "teacher" ? t("Викладання", "Преподавание") : t("Онлайн-уроки", "Онлайн-уроки")}
            </h1>
            <p className="text-muted-foreground mt-2 max-w-xl">
              {mode === "teacher"
                ? t("Готуйте уроки з AI, зберігайте як шаблони, відстежуйте учнів", "Готовьте уроки с AI, сохраняйте шаблоны, отслеживайте учеников")
                : t("Особисті заняття з вашим викладачем", "Персональные занятия с вашим преподавателем")}
            </p>
          </div>

          {mode === "teacher" ? (
            <Button onClick={() => { resetCreateForm(); setCreateOpen(true); }} size="lg" className="gap-2 shadow-lg">
              <Sparkles className="w-4 h-4" />
              {t("Створити урок з AI", "Создать урок с AI")}
            </Button>
          ) : (
            <Button onClick={() => setFindOpen(true)} size="lg" className="gap-2 shadow-lg">
              <UserPlus className="w-4 h-4" />
              {t("Знайти викладача", "Найти преподавателя")}
            </Button>
          )}
        </motion.div>

        <Tabs defaultValue="lessons" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="lessons" className="gap-2">
              <BookOpen className="w-4 h-4" />
              {t("Уроки", "Уроки")} ({lessons.length})
            </TabsTrigger>
            {mode === "teacher" && (
              <TabsTrigger value="templates" className="gap-2">
                <FileStack className="w-4 h-4" />
                {t("Шаблони", "Шаблоны")} ({templates.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="people" className="gap-2">
              <Users className="w-4 h-4" />
              {mode === "teacher" ? t("Учні", "Ученики") : t("Викладачі", "Преподаватели")} ({activeStudents.length})
              {pendingRels.length > 0 && (
                <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] rounded-full px-1.5 py-0.5">
                  {pendingRels.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* LESSONS TAB */}
          <TabsContent value="lessons" className="space-y-3">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin" /></div>
            ) : lessons.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border-2 border-dashed border-border">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {mode === "teacher"
                    ? t("Створіть свій перший урок з AI", "Создайте свой первый урок с AI")
                    : t("Поки що немає уроків", "Пока нет уроков")}
                </p>
              </div>
            ) : (
              lessons.map((l) => (
                <motion.button
                  key={l.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => navigate(`/tutoring/lesson/${l.id}`)}
                  className="w-full text-left p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                          {l.level}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          l.status === "completed" ? "bg-green-500/10 text-green-600"
                          : l.status === "scheduled" ? "bg-blue-500/10 text-blue-600"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {l.status === "completed" ? t("Завершено", "Завершён")
                            : l.status === "scheduled" ? t("Заплановано", "Запланирован")
                            : t("Чернетка", "Черновик")}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-lg truncate">{l.title}</h3>
                      {l.topic && <p className="text-sm text-muted-foreground truncate">{l.topic}</p>}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        {l.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(l.scheduled_at).toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU", {
                              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {l.duration_minutes} {t("хв", "мин")}
                        </span>
                        {l.meeting_link && (
                          <span className="flex items-center gap-1 text-primary">
                            <Video className="w-3.5 h-3.5" /> Online
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.button>
              ))
            )}
          </TabsContent>

          {/* TEMPLATES TAB */}
          {mode === "teacher" && (
            <TabsContent value="templates" className="space-y-3">
              {templates.length === 0 ? (
                <div className="text-center py-16 rounded-3xl border-2 border-dashed border-border">
                  <FileStack className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground mb-4">
                    {t("Поки немає шаблонів", "Пока нет шаблонов")}
                  </p>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    {t(
                      "Налаштуйте новий урок і натисніть 'Зберегти як шаблон' — і ви зможете повторно використовувати ту саму структуру.",
                      "Настройте новый урок и нажмите 'Сохранить как шаблон' — и вы сможете повторно использовать ту же структуру."
                    )}
                  </p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {templates.map((tpl) => (
                    <motion.div
                      key={tpl.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 rounded-2xl border border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                            {tpl.level}
                          </span>
                          {tpl.use_count > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {t("викор.", "исп.")} {tpl.use_count}×
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => deleteTemplate(tpl.id)}
                          className="text-muted-foreground hover:text-destructive transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <h3 className="font-display font-bold text-lg mb-1">{tpl.name}</h3>
                      {tpl.topic && <p className="text-sm text-muted-foreground mb-1">{tpl.topic}</p>}
                      {tpl.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{tpl.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1.5 text-[10px] mb-4">
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {tpl.words_count} {t("слів", "слов")}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {tpl.exercises_count} {t("вправ", "упр")}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {tpl.default_duration_minutes} {t("хв", "мин")}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        className="w-full gap-2"
                        onClick={() => applyTemplate(tpl)}
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        {t("Створити урок", "Создать урок")}
                      </Button>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

          {/* PEOPLE TAB */}
          <TabsContent value="people" className="space-y-3">
            {pendingRels.length > 0 && (
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-2 px-1">
                  {t("Очікують", "Ожидают")}
                </p>
                {pendingRels.map((r) => (
                  <div key={r.id} className="p-4 rounded-2xl border border-border bg-card mb-2 flex items-center gap-3">
                    {r.profile?.avatar_url ? (
                      <img src={r.profile.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {(r.profile?.display_name || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{r.profile?.display_name || r.profile?.nickname || "User"}</p>
                      {r.note && <p className="text-xs text-muted-foreground truncate">{r.note}</p>}
                    </div>
                    {mode === "teacher" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => updateRelStatus(r.id, "declined")}>
                          <X className="w-4 h-4" />
                        </Button>
                        <Button size="sm" onClick={() => updateRelStatus(r.id, "active")}>
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeStudents.length === 0 && pendingRels.length === 0 ? (
              <div className="text-center py-16 rounded-3xl border-2 border-dashed border-border">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {mode === "teacher" ? t("Поки немає учнів", "Пока нет учеников") : t("Немає викладачів", "Нет преподавателей")}
                </p>
              </div>
            ) : (
              activeStudents.map((r) => (
                <div key={r.id} className="p-4 rounded-2xl border border-border bg-card flex items-center gap-3">
                  {r.profile?.avatar_url ? (
                    <img src={r.profile.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {(r.profile?.display_name || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{r.profile?.display_name || r.profile?.nickname || "User"}</p>
                    <p className="text-xs text-green-600">{t("Активний", "Активный")}</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ===== STUDENT: Find teacher dialog ===== */}
      <Dialog open={findOpen} onOpenChange={setFindOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("Знайти викладача", "Найти преподавателя")}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQ}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={t("Ім'я або нікнейм…", "Имя или ник…")}
              className="pl-9"
              autoFocus
            />
          </div>
          <Textarea
            value={requestNote}
            onChange={(e) => setRequestNote(e.target.value)}
            placeholder={t("Коротке повідомлення (необов'язково)", "Короткое сообщение (необязательно)")}
            rows={2}
          />
          <div className="max-h-72 overflow-y-auto -mx-2 px-2 space-y-1">
            {searchRes.length === 0 && searchQ && (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t("Нічого не знайдено", "Ничего не найдено")}
              </p>
            )}
            {searchRes.map((tch) => (
              <button
                key={tch.user_id}
                onClick={() => sendRequest(tch.user_id)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition text-left"
              >
                {tch.avatar_url ? (
                  <img src={tch.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {(tch.display_name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{tch.display_name || tch.nickname}</p>
                  {tch.nickname && <p className="text-xs text-muted-foreground">@{tch.nickname}</p>}
                </div>
                <UserPlus className="w-4 h-4 text-primary" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== TEACHER: Create lesson dialog ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("Створити урок з AI", "Создать урок с AI")}
              {activeTemplateId && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                  {t("із шаблону", "из шаблона")}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Templates quick-pick */}
            {templates.length > 0 && (
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Швидкий шаблон", "Быстрый шаблон")}
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {templates.slice(0, 8).map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                        activeTemplateId === tpl.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Copy className="w-3 h-3" />
                      {tpl.name}
                      <span className="text-[10px] opacity-60">{tpl.level}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Free-form prompt */}
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                <Wand2 className="w-3 h-3" />
                {t("Опишіть, що робимо сьогодні", "Опишите, что делаем сегодня")}
              </label>
              <Textarea
                value={freePrompt}
                onChange={(e) => setFreePrompt(e.target.value)}
                placeholder={t(
                  "Напр.: Вивчаємо Perfekt з sein, тренуємо розповідь про вихідні, граємо в рольову гру 'У лікаря'…",
                  "Напр.: Изучаем Perfekt с sein, тренируем рассказ о выходных, играем в ролевую игру 'У врача'…"
                )}
                rows={3}
                className="resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                {t("AI підготує презентацію, теорію, словник, вправи та ДЗ", "AI подготовит презентацию, теорию, словарь, упражнения и ДЗ")}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Учень", "Ученик")} *
                </label>
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t("Оберіть…", "Выберите…")}</option>
                  {activeStudents.map((r) => (
                    <option key={r.id} value={r.student_id}>
                      {r.profile?.display_name || r.profile?.nickname || "User"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Рівень", "Уровень")}
                </label>
                <select
                  value={lessonLevel}
                  onChange={(e) => setLessonLevel(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {["A1","A2","B1","B2","C1"].map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Тема", "Тема")}
                </label>
                <Input
                  value={lessonTopic}
                  onChange={(e) => setLessonTopic(e.target.value)}
                  placeholder={t("Напр. Perfekt", "Напр. Perfekt")}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Фокус", "Фокус")}
                </label>
                <Input
                  value={lessonFocus}
                  onChange={(e) => setLessonFocus(e.target.value)}
                  placeholder={t("розмова, граматика…", "разговор, грамматика…")}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Слів", "Слов")}
                </label>
                <Input
                  type="number" min={3} max={30}
                  value={wordsCount}
                  onChange={(e) => setWordsCount(parseInt(e.target.value) || 10)}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Вправ", "Упр.")}
                </label>
                <Input
                  type="number" min={3} max={20}
                  value={exercisesCount}
                  onChange={(e) => setExercisesCount(parseInt(e.target.value) || 8)}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Тривалість, хв", "Длит., мин")}
                </label>
                <Input
                  type="number" min={15} max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 60)}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                {t("Типи вправ", "Типы упражнений")}
              </label>
              <div className="flex flex-wrap gap-2">
                {EX_TYPES.map(et => (
                  <button
                    key={et.id}
                    type="button"
                    onClick={() => toggleExType(et.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                      exerciseTypes.includes(et.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border text-muted-foreground"
                    }`}
                  >
                    {lang === "uk" ? et.uk : et.ru}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                {t("Словник (через кому, необов'язково)", "Словарь (через запятую, необязательно)")}
              </label>
              <Textarea
                value={vocabularyText}
                onChange={(e) => setVocabularyText(e.target.value)}
                placeholder="Haus, gehen, schön, der Arzt…"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  Zoom/Meet link
                </label>
                <Input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Час", "Время")}
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-1">
              <Button
                variant="outline"
                onClick={() => setSaveTplOpen(true)}
                className="gap-2"
                disabled={generating}
              >
                <Save className="w-4 h-4" />
                {t("Як шаблон", "Как шаблон")}
              </Button>
              <Button onClick={generateAndCreate} disabled={generating} className="flex-1" size="lg">
                {generating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("Генеруємо…", "Генерируем…")}</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />{t("Згенерувати урок", "Сгенерировать урок")}</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ===== Save Template Dialog ===== */}
      <Dialog open={saveTplOpen} onOpenChange={setSaveTplOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="w-5 h-5 text-primary" />
              {t("Зберегти як шаблон", "Сохранить как шаблон")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                {t("Назва шаблону", "Название шаблона")} *
              </label>
              <Input
                value={tplName}
                onChange={(e) => setTplName(e.target.value)}
                placeholder={t("Напр. Perfekt B1 — стандарт", "Напр. Perfekt B1 — стандарт")}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                {t("Опис (необов'язково)", "Описание (необязательно)")}
              </label>
              <Textarea
                value={tplDescription}
                onChange={(e) => setTplDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="p-3 rounded-xl bg-muted/50 text-xs space-y-1">
              <p className="flex justify-between"><span className="text-muted-foreground">{t("Рівень", "Уровень")}</span><b>{lessonLevel}</b></p>
              <p className="flex justify-between"><span className="text-muted-foreground">{t("Слів / Вправ", "Слов / Упр")}</span><b>{wordsCount} / {exercisesCount}</b></p>
              <p className="flex justify-between"><span className="text-muted-foreground">{t("Типи", "Типы")}</span><b>{exerciseTypes.join(", ")}</b></p>
            </div>
            <Button onClick={saveTemplate} className="w-full gap-2">
              <Save className="w-4 h-4" />
              {t("Зберегти шаблон", "Сохранить шаблон")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tutoring;
