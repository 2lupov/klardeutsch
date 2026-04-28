import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, Paperclip, X, Send, Loader2, CheckCircle2,
  Award, FileText, Image as ImageIcon, Clock, Sparkles, AlertCircle, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type FileMeta = { path: string; name: string; size: number; type: string };

type Homework = {
  id: string;
  lesson_id: string;
  description: string;
  due_at: string | null;
  submission: string | null;
  submission_files: FileMeta[];
  submitted_at: string | null;
  feedback: string | null;
  grade: number | null;
  status: "assigned" | "submitted" | "graded";
  updated_at: string;
};

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

const StudentHomework = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const [hw, setHw] = useState<Homework | null>(null);
  const [lessonTitle, setLessonTitle] = useState<string>("");
  const [text, setText] = useState("");
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<number | null>(null);

  // Load homework + lesson title
  useEffect(() => {
    if (!id || !user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("tutoring_homework")
        .select("*, tutoring_lessons!inner(id, title, student_id)")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        toast.error(t("Не вдалося завантажити завдання", "Не удалось загрузить задание"));
        navigate("/assignments");
        return;
      }
      const lesson = (data as any).tutoring_lessons;
      if (lesson?.student_id !== user.id) {
        toast.error(t("Немає доступу", "Нет доступа"));
        navigate("/assignments");
        return;
      }
      const row: Homework = {
        id: data.id,
        lesson_id: data.lesson_id,
        description: data.description,
        due_at: data.due_at,
        submission: data.submission,
        submission_files: (data.submission_files as any) ?? [],
        submitted_at: data.submitted_at,
        feedback: data.feedback,
        grade: data.grade,
        status: data.status as any,
        updated_at: data.updated_at,
      };
      setHw(row);
      setText(row.submission ?? "");
      setFiles(row.submission_files ?? []);
      setLessonTitle(lesson?.title ?? "");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [id, user]);

  // Realtime: reflect teacher's grade/feedback updates instantly
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`hw-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tutoring_homework", filter: `id=eq.${id}` },
        (payload) => {
          const n = payload.new as any;
          setHw((prev) => (prev ? { ...prev, ...n } : prev));
          if (n.status === "graded" && hw?.status !== "graded") {
            toast.success(t("Викладач оцінив роботу!", "Преподаватель оценил работу!"));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [id, hw?.status]);

  // Auto-save draft text (debounced) — pushes to DB so teacher sees it live
  const queueAutosave = (nextText: string, nextFiles: FileMeta[]) => {
    if (!hw) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      const { error } = await supabase
        .from("tutoring_homework")
        .update({
          submission: nextText,
          submission_files: nextFiles as any,
          // keep status "assigned" while drafting; only "Submit" sets "submitted"
          status: hw.status === "graded" ? "graded" : hw.status === "submitted" ? "submitted" : "assigned",
        })
        .eq("id", hw.id);
      setSaving(false);
      if (error) toast.error(t("Помилка автозбереження", "Ошибка автосохранения"));
    }, 700);
  };

  const handleTextChange = (v: string) => {
    setText(v);
    queueAutosave(v, files);
  };

  const handlePickFiles = () => fileInputRef.current?.click();

  const handleFiles = async (list: FileList | null) => {
    if (!list || !user || !hw) return;
    setUploading(true);
    const added: FileMeta[] = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_SIZE) {
        toast.error(t(`Файл "${f.name}" більше 20 МБ`, `Файл "${f.name}" больше 20 МБ`));
        continue;
      }
      const safe = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `homework/${hw.lesson_id}/${user.id}/${Date.now()}_${safe}`;
      const { error } = await supabase.storage
        .from("tutoring-materials")
        .upload(path, f, { upsert: false, contentType: f.type || undefined });
      if (error) {
        toast.error(t(`Не вдалося завантажити "${f.name}"`, `Не удалось загрузить "${f.name}"`));
        continue;
      }
      added.push({ path, name: f.name, size: f.size, type: f.type });
    }
    const next = [...files, ...added];
    setFiles(next);
    queueAutosave(text, next);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeFile = async (meta: FileMeta) => {
    await supabase.storage.from("tutoring-materials").remove([meta.path]);
    const next = files.filter((f) => f.path !== meta.path);
    setFiles(next);
    queueAutosave(text, next);
  };

  const submit = async () => {
    if (!hw) return;
    if (!text.trim() && files.length === 0) {
      toast.error(t("Додайте текст або файл", "Добавьте текст или файл"));
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("tutoring_homework")
      .update({
        submission: text,
        submission_files: files as any,
        submitted_at: new Date().toISOString(),
        status: "submitted",
      })
      .eq("id", hw.id);
    setSaving(false);
    if (error) {
      toast.error(t("Не вдалося відправити", "Не удалось отправить"));
      return;
    }
    setHw({ ...hw, status: "submitted", submitted_at: new Date().toISOString() });
    toast.success(t("Відправлено викладачу!", "Отправлено преподавателю!"));
  };

  const fileUrl = (path: string) =>
    supabase.storage.from("tutoring-materials").getPublicUrl(path).data.publicUrl;

  const isImage = (type: string) => type.startsWith("image/");
  const fmtSize = (b: number) => (b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

  const dueInfo = useMemo(() => {
    if (!hw?.due_at) return null;
    const due = new Date(hw.due_at);
    const now = new Date();
    const overdue = due < now && hw.status !== "graded";
    return { due, overdue };
  }, [hw]);

  const readonly = hw?.status === "graded";

  if (loading || !hw) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-background via-background to-primary/5 pb-32 lg:pb-12">
      <div className="max-w-3xl mx-auto px-4 lg:px-8 pt-5 lg:pt-10">
        {/* Top bar */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {t("Назад", "Назад")}
        </button>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-6 lg:p-7 bg-gradient-to-br from-pink-500/10 via-card to-card border border-border shadow-sm mb-5"
        >
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-pink-500/15 text-pink-600 dark:text-pink-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/15 text-pink-700 dark:text-pink-300">
                  {t("Домашнє завдання", "Домашнее задание")}
                </span>
                {hw.status === "submitted" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-700 dark:text-blue-300 inline-flex items-center gap-1">
                    <Loader2 className="w-3 h-3" /> {t("На перевірці", "На проверке")}
                  </span>
                )}
                {hw.status === "graded" && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-300 inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {t("Оцінено", "Оценено")}
                  </span>
                )}
                {dueInfo && (
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      dueInfo.overdue
                        ? "bg-red-500/15 text-red-700 dark:text-red-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {dueInfo.overdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {t("До", "До")}: {dueInfo.due.toLocaleDateString(lang === "uk" ? "uk-UA" : "ru-RU")}
                  </span>
                )}
              </div>
              {lessonTitle && (
                <p className="text-xs text-muted-foreground mb-2">{lessonTitle}</p>
              )}
              <p className="text-foreground whitespace-pre-wrap leading-relaxed">{hw.description}</p>
            </div>
          </div>
        </motion.div>

        {/* Grade & feedback (after grading) */}
        <AnimatePresence>
          {hw.status === "graded" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 mb-5 bg-gradient-to-br from-green-500/10 via-card to-card border border-green-500/30"
            >
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-display font-black text-2xl">
                    {hw.grade ?? "—"}
                    <span className="text-sm font-normal text-muted-foreground">/100</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{t("Оцінка викладача", "Оценка преподавателя")}</p>
                </div>
              </div>
              {hw.feedback && (
                <div className="mt-3 p-3 rounded-xl bg-background/60 border border-border">
                  <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wide">
                    {t("Коментар", "Комментарий")}
                  </p>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{hw.feedback}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submission area */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border flex items-center justify-between">
            <p className="text-sm font-bold">
              {readonly ? t("Ваша відповідь", "Ваш ответ") : t("Ваша відповідь", "Ваш ответ")}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {t("Збереження…", "Сохранение…")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                  {t("Чернетка збережена", "Черновик сохранён")}
                </>
              )}
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            disabled={readonly}
            placeholder={t(
              "Напишіть свою відповідь тут… Викладач бачить ваш чернетку в реальному часі.",
              "Напишите свой ответ здесь… Преподаватель видит ваш черновик в реальном времени."
            )}
            className="w-full min-h-[180px] px-5 py-4 bg-transparent outline-none resize-y text-sm leading-relaxed disabled:opacity-70"
          />

          {/* Files */}
          <div className="px-5 pt-2 pb-3">
            {files.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {files.map((f) => (
                  <motion.div
                    key={f.path}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative rounded-xl border border-border bg-muted/30 p-2 group"
                  >
                    {isImage(f.type) ? (
                      <a href={fileUrl(f.path)} target="_blank" rel="noreferrer" className="block">
                        <img src={fileUrl(f.path)} alt={f.name} className="w-full h-24 object-cover rounded-lg" />
                      </a>
                    ) : (
                      <a
                        href={fileUrl(f.path)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 h-24 px-2 rounded-lg bg-background"
                      >
                        <FileText className="w-8 h-8 text-primary shrink-0" />
                        <span className="text-xs line-clamp-3 break-all">{f.name}</span>
                      </a>
                    )}
                    <div className="flex items-center justify-between mt-1.5 text-[10px] text-muted-foreground">
                      <span className="truncate">{fmtSize(f.size)}</span>
                      {!readonly && (
                        <button
                          onClick={() => removeFile(f)}
                          className="p-1 rounded hover:bg-destructive/15 hover:text-destructive transition"
                          title={t("Видалити", "Удалить")}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {!readonly && (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  accept="image/*,application/pdf,.doc,.docx,.txt,.odt,audio/*"
                />
                <button
                  onClick={handlePickFiles}
                  disabled={uploading}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-muted hover:bg-muted/70 text-sm font-bold transition disabled:opacity-60"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Paperclip className="w-4 h-4" />
                  )}
                  {t("Прикріпити файл", "Прикрепить файл")}
                </button>
                <span className="text-[10px] text-muted-foreground">
                  {t("До 20 МБ. Фото, PDF, документи, аудіо.", "До 20 МБ. Фото, PDF, документы, аудио.")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Sticky submit bar */}
        {!readonly && (
          <div className="fixed bottom-0 left-0 right-0 lg:static lg:mt-5 z-30">
            <div className="lg:max-w-3xl lg:mx-auto px-4 lg:px-0 py-3 lg:py-0 bg-background/90 lg:bg-transparent backdrop-blur lg:backdrop-blur-0 border-t border-border lg:border-0">
              <button
                onClick={submit}
                disabled={saving || (!text.trim() && files.length === 0)}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold shadow-md hover:shadow-lg transition disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                {hw.status === "submitted"
                  ? t("Оновити відправку", "Обновить отправку")
                  : t("Відправити викладачу", "Отправить преподавателю")}
              </button>
              {hw.submitted_at && (
                <p className="text-center text-[11px] text-muted-foreground mt-2">
                  {t("Відправлено", "Отправлено")}:{" "}
                  {new Date(hw.submitted_at).toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU")}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentHomework;
