import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GraduationCap, Users, Plus, Search, Sparkles, Calendar,
  BookOpen, Clock, Video, ChevronRight, Check, X, Loader2, UserPlus
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

const Tutoring = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const [mode, setMode] = useState<Mode>(null);
  const [loading, setLoading] = useState(true);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);

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
  const [meetingLink, setMeetingLink] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [generating, setGenerating] = useState(false);

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
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("Запит надіслано", "Запрос отправлен"));
    setFindOpen(false);
    setRequestNote("");
    loadData();
  };

  // ===== Teacher: accept/decline =====
  const updateRelStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("tutoring_relationships")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Оновлено", "Обновлено"));
    loadData();
  };

  // ===== Teacher: create lesson with AI =====
  const generateAndCreate = async () => {
    if (!selectedStudent || !lessonTopic) {
      toast.error(t("Оберіть учня та тему", "Выберите ученика и тему"));
      return;
    }
    setGenerating(true);
    try {
      const res = await fetchEdgeFunction("generate-tutoring-lesson", {
        json: { topic: lessonTopic, level: lessonLevel, focus: lessonFocus },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI error");

      const ai = data.lesson;
      const { data: created, error: createErr } = await supabase
        .from("tutoring_lessons")
        .insert({
          teacher_id: user!.id,
          student_id: selectedStudent,
          title: ai.title || lessonTopic,
          topic: lessonTopic,
          level: lessonLevel,
          theory: ai.theory || "",
          meeting_link: meetingLink || null,
          scheduled_at: scheduledAt || null,
          status: scheduledAt ? "scheduled" : "draft",
          ai_prompt: lessonFocus || null,
        })
        .select()
        .single();
      if (createErr) throw createErr;

      // Insert words
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
      // Insert exercises
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
      // Insert homework
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
      setLessonTopic(""); setLessonFocus(""); setMeetingLink(""); setScheduledAt("");
      navigate(`/tutoring/lesson/${created.id}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
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
                ? t("Готуйте уроки з AI, відстежуйте прогрес учнів", "Готовьте уроки с AI, отслеживайте прогресс учеников")
                : t("Особисті заняття з вашим викладачем", "Персональные занятия с вашим преподавателем")}
            </p>
          </div>

          {mode === "teacher" ? (
            <Button onClick={() => setCreateOpen(true)} size="lg" className="gap-2 shadow-lg">
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("Створити урок з AI", "Создать урок с AI")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                {t("Учень", "Ученик")}
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
            <div>
              <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">
                {t("Особливий фокус (необов'язково)", "Особый фокус (необязательно)")}
              </label>
              <Textarea
                value={lessonFocus}
                onChange={(e) => setLessonFocus(e.target.value)}
                placeholder={t("Напр. розмовна практика, граматика…", "Напр. разговорная практика, грамматика…")}
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
            <Button onClick={generateAndCreate} disabled={generating} className="w-full" size="lg">
              {generating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("Генеруємо…", "Генерируем…")}</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />{t("Згенерувати урок", "Сгенерировать урок")}</>
              )}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              {t("AI створить теорію, словник, вправи та ДЗ", "AI создаст теорию, словарь, упражнения и ДЗ")}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Tutoring;
