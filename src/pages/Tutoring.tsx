import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Users, Sparkles, Calendar, FileStack,
  BookOpen, Clock, Video, ChevronRight, Check, X, Loader2, UserPlus, Search,
  Wand2, Save, Trash2, Copy, Plus, Paperclip, Image as ImageIcon, Mail, Key, Eye, EyeOff, ClipboardCheck, Award
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

  // ===== Placement test dialog =====
  const [placementOpen, setPlacementOpen] = useState(false);
  const [placementStudent, setPlacementStudent] = useState<string>("");
  const [placementLevels, setPlacementLevels] = useState<string[]>(["A1", "A2"]);
  const [placementPerLevel, setPlacementPerLevel] = useState(8);
  const [placementSubmitting, setPlacementSubmitting] = useState(false);

  const openPlacementDialog = (studentId: string) => {
    setPlacementStudent(studentId);
    setPlacementLevels(["A1", "A2"]);
    setPlacementPerLevel(8);
    setPlacementOpen(true);
  };
  const togglePlacementLevel = (lvl: string) => {
    setPlacementLevels((prev) =>
      prev.includes(lvl) ? prev.filter((l) => l !== lvl) : [...prev, lvl].sort((a, b) => ["A1","A2","B1","B2","C1"].indexOf(a) - ["A1","A2","B1","B2","C1"].indexOf(b))
    );
  };

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

  // ===== Placement test =====
  const assignPlacementTest = async () => {
    if (!user || !placementStudent) return;
    if (!placementLevels.length) {
      toast.error(t("Оберіть хоча б один рівень", "Выберите хотя бы один уровень"));
      return;
    }
    setPlacementSubmitting(true);
    try {
      const { data: allQs } = await supabase
        .from("tutoring_placement_questions")
        .select("id, level")
        .in("level", placementLevels);
      if (!allQs || !allQs.length) {
        toast.error(t("Банк питань порожній для цих рівнів", "Банк вопросов пуст для этих уровней"));
        setPlacementSubmitting(false);
        return;
      }
      const byLevel: Record<string, string[]> = {};
      allQs.forEach((q: any) => {
        byLevel[q.level] = byLevel[q.level] || [];
        byLevel[q.level].push(q.id);
      });
      const picked: string[] = [];
      for (const lvl of placementLevels) {
        const ids = (byLevel[lvl] || []).sort(() => Math.random() - 0.5).slice(0, placementPerLevel);
        picked.push(...ids);
      }
      if (!picked.length) {
        toast.error(t("Немає питань для обраних рівнів", "Нет вопросов для выбранных уровней"));
        setPlacementSubmitting(false);
        return;
      }
      const { data: created, error } = await supabase
        .from("tutoring_placement_assignments")
        .insert({
          teacher_id: user.id,
          student_id: placementStudent,
          status: "pending",
          question_ids: picked,
          total_questions: picked.length,
          selected_levels: placementLevels,
        })
        .select()
        .single();
      if (error) { toast.error(error.message); setPlacementSubmitting(false); return; }
      toast.success(t("Тест призначено", "Тест назначен"));
      const url = `${window.location.origin}/tutoring/placement/${created.id}`;
      try {
        await navigator.clipboard?.writeText(url);
        toast.info(t("Посилання скопійовано", "Ссылка скопирована"));
      } catch {}
      setPlacementOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setPlacementSubmitting(false);
    }
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
    if (!freePrompt && attachedFiles.length === 0) {
      toast.error(t("Опишіть урок або додайте файл", "Опишите урок или добавьте файл"));
      return;
    }
    setGenerating(true);
    try {
      // Pull student level hint from latest placement test (if any)
      const { data: lastTest } = await supabase
        .from("tutoring_placement_assignments")
        .select("recommended_level")
        .eq("student_id", selectedStudent)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const res = await fetchEdgeFunction("generate-tutoring-lesson", {
        json: {
          freePrompt,
          autoMode: true,
          studentLevelHint: lastTest?.recommended_level || null,
          imageUrls: attachedFiles.filter(f => f.type.startsWith("image/")).map(f => f.url),
          fileNames: attachedFiles.map(f => f.name),
          attachedFiles: attachedFiles
            .filter(f => !f.type.startsWith("image/"))
            .map(f => ({ name: f.name, url: f.url, type: f.type })),
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
          title: ai.title || "Lektion",
          topic: ai.topic || null,
          level: ai.level || lastTest?.recommended_level || "A1",
          theory: ai.theory || "",
          meeting_link: meetingLink || null,
          scheduled_at: scheduledAt || null,
          duration_minutes: ai.duration_minutes || 60,
          status: scheduledAt ? "scheduled" : "draft",
          ai_prompt: freePrompt || null,
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
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => { setCreatedCredentials(null); setCreateStudentOpen(true); }}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                <UserPlus className="w-4 h-4" />
                {t("Створити учня", "Создать ученика")}
              </Button>
              <Button onClick={() => { resetCreateForm(); setCreateOpen(true); }} size="lg" className="gap-2 shadow-lg">
                <Sparkles className="w-4 h-4" />
                {t("Створити урок з AI", "Создать урок с AI")}
              </Button>
            </div>
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
                  {mode === "teacher" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => assignPlacementTest(r.student_id)}
                      title={t("Призначити тест на рівень", "Назначить тест на уровень")}
                    >
                      <ClipboardCheck className="w-4 h-4 mr-1" />
                      {t("Тест", "Тест")}
                    </Button>
                  )}
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

      {/* ===== TEACHER: Create lesson dialog (simple AI mode) ===== */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("AI-урок за хвилину", "AI-урок за минуту")}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                {t("Учень", "Ученик")} *
              </label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium"
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
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block flex items-center gap-1.5">
                <Wand2 className="w-3 h-3" />
                {t("Опишіть урок своїми словами", "Опишите урок своими словами")}
              </label>
              <Textarea
                value={freePrompt}
                onChange={(e) => setFreePrompt(e.target.value)}
                placeholder={t(
                  "Напр.: «Хочу пройти Perfekt з sein, тренуємо розповідь про вихідні» — або просто завантажте файл/фото",
                  "Напр.: «Хочу пройти Perfekt с sein, тренируем рассказ о выходных» — или просто загрузите файл/фото"
                )}
                rows={4}
                className="resize-none text-sm"
                autoFocus
              />
            </div>

            <div>
              {attachedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachedFiles.map((f, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20"
                    >
                      {f.type.startsWith("image/") ? <ImageIcon className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                      <span className="max-w-[140px] truncate">{f.name}</span>
                      <button onClick={() => removeAttachment(i)} className="hover:opacity-70">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition cursor-pointer text-sm">
                {uploading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{t("Завантаження…", "Загрузка…")}</>
                ) : (
                  <><Paperclip className="w-4 h-4" />{t("Додати фото, PDF або документ", "Добавить фото, PDF или документ")}</>
                )}
                <input
                  type="file"
                  multiple
                  accept="image/*,application/pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => { handleUpload(e.target.files); e.target.value = ""; }}
                  disabled={uploading}
                />
              </label>
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-xs font-bold uppercase text-muted-foreground hover:text-foreground">
                {t("Додатково (Zoom, час)", "Дополнительно (Zoom, время)")}
              </summary>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <Input
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                  placeholder="Zoom/Meet link"
                />
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>
            </details>

            <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground flex items-start gap-2">
              <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span>
                {t(
                  "AI сам визначить рівень (за останнім тестом учня), тему, словник, теорію, вправи та домашнє завдання.",
                  "AI сам определит уровень (по последнему тесту ученика), тему, словарь, теорию, упражнения и домашнее задание."
                )}
              </span>
            </div>

            <Button onClick={generateAndCreate} disabled={generating || !selectedStudent} className="w-full" size="lg">
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("AI створює урок…", "AI создаёт урок…")}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />{t("Створити урок", "Создать урок")}</>
              )}
            </Button>
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

      {/* ===== Create Student Dialog ===== */}
      <Dialog open={createStudentOpen} onOpenChange={(o) => { setCreateStudentOpen(o); if (!o) setCreatedCredentials(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {createdCredentials
                ? t("Акаунт створено", "Аккаунт создан")
                : t("Створити учня", "Создать ученика")}
            </DialogTitle>
          </DialogHeader>

          {createdCredentials ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">Email</p>
                  <p className="font-mono font-bold text-sm break-all">{createdCredentials.email}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1">{t("Пароль", "Пароль")}</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono font-bold text-sm flex-1">
                      {showPwd ? createdCredentials.password : "•".repeat(createdCredentials.password.length)}
                    </p>
                    <button onClick={() => setShowPwd(!showPwd)} className="text-muted-foreground hover:text-primary">
                      {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Передайте ці дані учню. Він зможе увійти і змінити пароль у профілі.",
                  "Передайте эти данные ученику. Он сможет войти и сменить пароль в профиле."
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyCredentials} className="flex-1 gap-2">
                  <Copy className="w-4 h-4" />{t("Копіювати", "Копировать")}
                </Button>
                <Button onClick={() => { setCreatedCredentials(null); setCreateStudentOpen(false); }} className="flex-1">
                  {t("Готово", "Готово")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Ім'я учня", "Имя ученика")} *
                </label>
                <Input
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder={t("Напр. Анна Шмідт", "Напр. Анна Шмидт")}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email *
                </label>
                <Input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="anna@example.com"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block flex items-center gap-1">
                  <Key className="w-3 h-3" /> {t("Пароль (необов'язково)", "Пароль (необязательно)")}
                </label>
                <Input
                  value={newStudentPassword}
                  onChange={(e) => setNewStudentPassword(e.target.value)}
                  placeholder={t("Згенерую автоматично", "Сгенерирую автоматически")}
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                  {t("Замітка (необов'язково)", "Заметка (необязательно)")}
                </label>
                <Textarea
                  value={newStudentNote}
                  onChange={(e) => setNewStudentNote(e.target.value)}
                  rows={2}
                  placeholder={t("Рівень, цілі, особливості…", "Уровень, цели, особенности…")}
                />
              </div>
              <Button onClick={createStudent} disabled={creatingStudent} className="w-full gap-2" size="lg">
                {creatingStudent ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{t("Створюємо…", "Создаём…")}</>
                ) : (
                  <><UserPlus className="w-4 h-4" />{t("Створити акаунт", "Создать аккаунт")}</>
                )}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                {t("Email буде автоматично підтверджено", "Email будет автоматически подтверждён")}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tutoring;
