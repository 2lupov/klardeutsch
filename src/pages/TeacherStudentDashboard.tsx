import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Sparkles, BookOpen, Trophy, Coins, Flame, Clock,
  ClipboardCheck, Plus, Pin, PinOff, Trash2, Save, Loader2,
  GraduationCap, Calendar, MessageCircle, Star, Radio, Send, Eye,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import TeacherAIAssistant from "@/components/tutoring/TeacherAIAssistant";

interface StudentProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  nickname: string | null;
  is_kid: boolean;
  age: number | null;
  recommended_level: string | null;
  preferred_lang: string | null;
  last_active: string | null;
  daily_goal_minutes: number | null;
}

interface LessonRow {
  id: string;
  title: string;
  level: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
}

interface HomeworkRow {
  id: string;
  lesson_id: string;
  description: string;
  status: string;
  due_at: string | null;
  submission: string | null;
  submitted_at: string | null;
  feedback: string | null;
  grade: number | null;
  created_at: string;
}

interface NoteRow {
  id: string;
  content: string;
  pinned: boolean;
  category: string;
  created_at: string;
  updated_at: string;
}

const TeacherStudentDashboard = () => {
  const { studentId } = useParams();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [stats, setStats] = useState({
    xp: 0, coins: 0, streak: 0, words: 0, lessons: 0, dailyMinutes: 0,
  });
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [homework, setHomework] = useState<HomeworkRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const [newNote, setNewNote] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  // Quick assignment form
  const [qaTitle, setQaTitle] = useState("");
  const [qaDescription, setQaDescription] = useState("");
  const [qaDueDate, setQaDueDate] = useState("");
  const [qaSaving, setQaSaving] = useState(false);

  useEffect(() => {
    if (!user || !studentId) return;
    void loadAll();
    // eslint-disable-next-line
  }, [user, studentId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [
        { data: prof },
        { data: xp },
        { data: coins },
        { data: bonus },
        { data: words },
        { data: progress },
        { data: lessonRows },
        { data: lastSavedWords },
      ] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, avatar_url, nickname, is_kid, age, recommended_level, preferred_lang, last_active, daily_goal_minutes").eq("user_id", studentId).maybeSingle(),
        supabase.from("user_xp").select("total_xp").eq("user_id", studentId).maybeSingle(),
        supabase.from("user_coins").select("balance").eq("user_id", studentId).maybeSingle(),
        supabase.from("daily_bonuses").select("streak").eq("user_id", studentId).maybeSingle(),
        supabase.from("saved_words").select("id", { count: "exact", head: true }).eq("user_id", studentId),
        supabase.from("user_progress").select("id", { count: "exact", head: true }).eq("user_id", studentId).eq("completed", true),
        supabase.from("tutoring_lessons").select("id, title, level, status, scheduled_at, created_at").eq("teacher_id", user!.id).eq("student_id", studentId).order("created_at", { ascending: false }).limit(20),
        supabase.from("saved_words").select("learned_at, vocab_card_id, vocab_cards(german, russian, article)").eq("user_id", studentId).order("learned_at", { ascending: false }).limit(10),
      ]);

      setProfile(prof as any);
      setStats({
        xp: xp?.total_xp || 0,
        coins: coins?.balance || 0,
        streak: bonus?.streak || 0,
        words: (words as any)?.count || 0,
        lessons: (progress as any)?.count || 0,
        dailyMinutes: prof?.daily_goal_minutes || 15,
      });
      setLessons((lessonRows || []) as any);
      setRecentActivity((lastSavedWords || []) as any);

      const lessonIds = (lessonRows || []).map((l: any) => l.id);
      if (lessonIds.length > 0) {
        const { data: hw } = await supabase
          .from("tutoring_homework")
          .select("id, lesson_id, description, status, due_at, submission, submitted_at, feedback, grade, created_at")
          .in("lesson_id", lessonIds)
          .order("created_at", { ascending: false });
        setHomework((hw || []) as any);
      } else {
        setHomework([]);
      }

      const { data: notesData } = await supabase
        .from("teacher_student_notes" as any)
        .select("*")
        .eq("teacher_id", user!.id)
        .eq("student_id", studentId)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      setNotes((notesData || []) as any);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !user || !studentId) return;
    const { data, error } = await supabase
      .from("teacher_student_notes" as any)
      .insert({ teacher_id: user.id, student_id: studentId, content: newNote.trim() })
      .select("*")
      .single();
    if (error) return toast.error(error.message);
    setNotes((p) => [data as any, ...p]);
    setNewNote("");
    toast.success(t("Нотатку збережено", "Заметка сохранена"));
  };

  const togglePin = async (n: NoteRow) => {
    const { error } = await supabase
      .from("teacher_student_notes" as any)
      .update({ pinned: !n.pinned })
      .eq("id", n.id);
    if (error) return toast.error(error.message);
    setNotes((p) => [...p.map((x) => (x.id === n.id ? { ...x, pinned: !x.pinned } : x))].sort((a, b) => Number(b.pinned) - Number(a.pinned)));
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from("teacher_student_notes" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    setNotes((p) => p.filter((x) => x.id !== id));
  };

  const createQuickAssignment = async () => {
    if (!qaTitle.trim() || !qaDescription.trim() || !user || !studentId) {
      return toast.error(t("Заповніть назву й опис", "Заполните название и описание"));
    }
    setQaSaving(true);
    try {
      const { data: lesson, error: e1 } = await supabase
        .from("tutoring_lessons")
        .insert({
          teacher_id: user.id,
          student_id: studentId,
          title: qaTitle.trim(),
          level: profile?.recommended_level || "A1",
          status: "scheduled",
        })
        .select("id")
        .single();
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("tutoring_homework").insert({
        lesson_id: lesson.id,
        description: qaDescription.trim(),
        due_at: qaDueDate ? new Date(qaDueDate).toISOString() : null,
      });
      if (e2) throw e2;

      toast.success(t("Завдання надіслано учню ✅", "Задание отправлено ученику ✅"));
      setQaTitle(""); setQaDescription(""); setQaDueDate("");
      void loadAll();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setQaSaving(false);
    }
  };

  const giveFeedback = async (hw: HomeworkRow, feedback: string, grade: number | null) => {
    const { error } = await supabase
      .from("tutoring_homework")
      .update({ feedback, grade, status: "graded" })
      .eq("id", hw.id);
    if (error) return toast.error(error.message);
    toast.success(t("Оцінка збережена", "Оценка сохранена"));
    setHomework((p) => p.map((x) => (x.id === hw.id ? { ...x, feedback, grade, status: "graded" } : x)));
  };

  const lastActiveLabel = useMemo(() => {
    if (!profile?.last_active) return "—";
    const d = new Date(profile.last_active);
    const diffH = Math.floor((Date.now() - d.getTime()) / 1000 / 3600);
    if (diffH < 1) return t("щойно", "только что");
    if (diffH < 24) return t(`${diffH} год тому`, `${diffH} ч назад`);
    return d.toLocaleDateString();
  }, [profile, lang]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">{t("Учня не знайдено", "Ученик не найден")}</p>
        <Button onClick={() => navigate("/tutoring")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("Назад", "Назад")}
        </Button>
      </div>
    );
  }

  const submittedCount = homework.filter((h) => h.status === "submitted").length;
  const gradedCount = homework.filter((h) => h.status === "graded").length;
  const overdueCount = homework.filter((h) => h.due_at && new Date(h.due_at) < new Date() && h.status === "assigned").length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/tutoring")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
              {(profile.display_name || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-black text-lg truncate flex items-center gap-2">
              {profile.display_name || profile.nickname || "Ученик"}
              {profile.is_kid && <span title="Дитина">🧒</span>}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("Активність", "Активность")}: {lastActiveLabel} · {t("Рівень", "Уровень")} {profile.recommended_level || "A1"}
            </p>
          </div>
          <Button onClick={() => setAiOpen(true)} className="gap-1 bg-gradient-to-r from-primary to-primary/80">
            <Sparkles className="w-4 h-4" /> AI
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <StatCard icon={<Trophy className="w-5 h-5" />} label="XP" value={stats.xp} color="from-amber-400 to-orange-500" />
          <StatCard icon={<Coins className="w-5 h-5" />} label={t("Монети", "Монеты")} value={stats.coins} color="from-yellow-400 to-amber-500" />
          <StatCard icon={<Flame className="w-5 h-5" />} label={t("Стрик", "Стрик")} value={`${stats.streak} 🔥`} color="from-red-400 to-pink-500" />
          <StatCard icon={<BookOpen className="w-5 h-5" />} label={t("Слова", "Слова")} value={stats.words} color="from-blue-400 to-indigo-500" />
          <StatCard icon={<GraduationCap className="w-5 h-5" />} label={t("Уроки", "Уроки")} value={stats.lessons} color="from-emerald-400 to-teal-500" />
          <StatCard icon={<Clock className="w-5 h-5" />} label={t("Хв/день", "Мин/день")} value={stats.dailyMinutes} color="from-purple-400 to-violet-500" />
        </div>

        {/* Homework alert */}
        {(submittedCount > 0 || overdueCount > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 flex items-center gap-3 flex-wrap"
          >
            <ClipboardCheck className="w-5 h-5 text-primary" />
            <div className="flex-1 text-sm font-medium">
              {submittedCount > 0 && <span>📥 {submittedCount} {t("на перевірці", "на проверке")}</span>}
              {submittedCount > 0 && overdueCount > 0 && " · "}
              {overdueCount > 0 && <span className="text-red-600">⏰ {overdueCount} {t("прострочено", "просрочено")}</span>}
            </div>
          </motion.div>
        )}

        <Tabs defaultValue="assign" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="assign">📚 {t("Завдання", "Задания")}</TabsTrigger>
            <TabsTrigger value="homework">✅ {t("Перевірка", "Проверка")} {homework.length > 0 && `(${homework.length})`}</TabsTrigger>
            <TabsTrigger value="activity">📊 {t("Активність", "Активность")}</TabsTrigger>
            <TabsTrigger value="notes">📝 {t("Нотатки", "Заметки")} {notes.length > 0 && `(${notes.length})`}</TabsTrigger>
          </TabsList>

          {/* ===== ASSIGN ===== */}
          <TabsContent value="assign" className="space-y-4">
            <div className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <h3 className="font-display font-bold flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                {t("Швидке завдання", "Быстрое задание")}
              </h3>
              <Input
                value={qaTitle}
                onChange={(e) => setQaTitle(e.target.value)}
                placeholder={t("Назва уроку (напр. «Перфект з sein»)", "Название урока (напр. «Перфект с sein»)")}
              />
              <Textarea
                value={qaDescription}
                onChange={(e) => setQaDescription(e.target.value)}
                placeholder={t("Опис завдання для учня — поясни простими словами що зробити", "Описание задания для ученика — объясни простыми словами что сделать")}
                rows={4}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <label className="text-xs text-muted-foreground block mb-1">{t("Дедлайн (необов'язково)", "Дедлайн (необязательно)")}</label>
                  <Input type="datetime-local" value={qaDueDate} onChange={(e) => setQaDueDate(e.target.value)} />
                </div>
                <Button onClick={createQuickAssignment} disabled={qaSaving} className="self-end">
                  {qaSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" /> {t("Надіслати", "Отправить")}</>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 {t("Створить урок-чернетку + домашнє завдання. Учень побачить його у себе одразу.", "Создаст черновой урок + домашнее задание. Ученик увидит его сразу.")}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider">
                {t("Останні уроки", "Последние уроки")}
              </h3>
              {lessons.length === 0 ? (
                <div className="text-center py-8 rounded-2xl border-2 border-dashed border-border text-muted-foreground text-sm">
                  {t("Уроків ще немає", "Уроков ещё нет")}
                </div>
              ) : (
                lessons.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => navigate(`/tutoring/lesson/${l.id}`)}
                    className="w-full p-4 rounded-2xl border border-border bg-card hover:border-primary/40 transition flex items-center gap-3 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {l.level}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleDateString()} · {l.status}
                      </p>
                    </div>
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))
              )}
            </div>
          </TabsContent>

          {/* ===== HOMEWORK REVIEW ===== */}
          <TabsContent value="homework" className="space-y-3">
            {homework.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border-2 border-dashed border-border text-muted-foreground">
                {t("Домашніх завдань ще немає", "Домашних заданий ещё нет")}
              </div>
            ) : (
              homework.map((hw) => (
                <HomeworkCard
                  key={hw.id}
                  hw={hw}
                  lessonTitle={lessons.find((l) => l.id === hw.lesson_id)?.title || ""}
                  onSave={giveFeedback}
                  t={t}
                />
              ))
            )}
          </TabsContent>

          {/* ===== ACTIVITY ===== */}
          <TabsContent value="activity" className="space-y-3">
            <div className="p-4 rounded-2xl border border-border bg-card">
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                {t("Останні вивчені слова", "Последние выученные слова")}
              </h3>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  {t("Поки немає активності", "Пока нет активности")}
                </p>
              ) : (
                <div className="space-y-2">
                  {recentActivity.map((a, i) => {
                    const c = a.vocab_cards;
                    if (!c) return null;
                    const articleColor = c.article === "der" ? "text-blue-500" : c.article === "die" ? "text-pink-500" : "text-green-500";
                    return (
                      <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-border/50 last:border-0">
                        <span className={`font-bold ${articleColor}`}>{c.article}</span>
                        <span className="font-display font-bold flex-1">{c.german}</span>
                        <span className="text-muted-foreground">{c.russian}</span>
                        <span className="text-xs text-muted-foreground/60 ml-2">
                          {new Date(a.learned_at).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ===== NOTES ===== */}
          <TabsContent value="notes" className="space-y-3">
            <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder={t("Спостереження про учня — сильні сторони, складнощі, рекомендації…", "Наблюдение об ученике — сильные стороны, трудности, рекомендации…")}
                rows={3}
              />
              <div className="flex justify-end">
                <Button onClick={addNote} disabled={!newNote.trim()} size="sm">
                  <Plus className="w-4 h-4 mr-1" /> {t("Додати", "Добавить")}
                </Button>
              </div>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {t("Нотаток ще немає. Це приватні нотатки — учень їх не бачить.", "Заметок ещё нет. Это приватные заметки — ученик их не видит.")}
              </div>
            ) : (
              notes.map((n) => (
                <div key={n.id} className={`p-4 rounded-2xl border bg-card ${n.pinned ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                  <p className="whitespace-pre-wrap text-sm mb-2">{n.content}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(n.created_at).toLocaleString()}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => togglePin(n)} className="p-1.5 rounded hover:bg-muted">
                        {n.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => deleteNote(n.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>

      <TeacherAIAssistant
        open={aiOpen}
        onOpenChange={setAiOpen}
        studentId={profile.user_id}
        studentName={profile.display_name || "Ученик"}
        isKid={profile.is_kid}
      />
    </div>
  );
};

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: any; color: string }) => (
  <div className="p-3 rounded-2xl border border-border bg-card relative overflow-hidden">
    <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${color} opacity-20 blur-xl`} />
    <div className="relative">
      <div className="text-muted-foreground mb-1">{icon}</div>
      <div className="text-xl font-display font-black">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  </div>
);

const HomeworkCard = ({
  hw, lessonTitle, onSave, t,
}: {
  hw: HomeworkRow;
  lessonTitle: string;
  onSave: (hw: HomeworkRow, feedback: string, grade: number | null) => void;
  t: (uk: string, ru: string) => string;
}) => {
  const [open, setOpen] = useState(hw.status === "submitted");
  const [feedback, setFeedback] = useState(hw.feedback || "");
  const [grade, setGrade] = useState<number | null>(hw.grade);

  const statusBadge =
    hw.status === "graded" ? <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">✓ {t("Перевірено", "Проверено")}</span>
    : hw.status === "submitted" ? <span className="px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400">📥 {t("Здано", "Сдано")}</span>
    : <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">{t("Призначено", "Назначено")}</span>;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition">
        <ClipboardCheck className="w-5 h-5 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold truncate">{lessonTitle || t("Завдання", "Задание")}</p>
          <p className="text-xs text-muted-foreground line-clamp-1">{hw.description}</p>
        </div>
        {statusBadge}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/50 pt-3">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">{t("Завдання", "Задание")}</p>
            <p className="text-sm whitespace-pre-wrap">{hw.description}</p>
          </div>
          {hw.submission && (
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">
                {t("Відповідь учня", "Ответ ученика")}
                {hw.submitted_at && ` · ${new Date(hw.submitted_at).toLocaleString()}`}
              </p>
              <p className="text-sm whitespace-pre-wrap p-3 rounded-xl bg-muted">{hw.submission}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-1 flex items-center gap-1">
              <MessageCircle className="w-3 h-3" />
              {t("Ваш фідбек", "Ваш фидбек")}
            </p>
            <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder={t("Що вийшло добре, над чим працювати…", "Что получилось хорошо, над чем поработать…")} rows={3} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Star className="w-3 h-3" /> {t("Оцінка:", "Оценка:")}
            </span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setGrade(n)}
                className={`w-9 h-9 rounded-xl font-bold text-sm transition ${
                  grade === n ? "bg-primary text-primary-foreground" : "border border-border hover:border-primary/40"
                }`}
              >
                {n}
              </button>
            ))}
            <Button size="sm" onClick={() => onSave(hw, feedback, grade)} className="ml-auto">
              <Save className="w-4 h-4 mr-1" /> {t("Зберегти", "Сохранить")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherStudentDashboard;
