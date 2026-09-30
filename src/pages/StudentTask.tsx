import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, CheckCircle2, Award, Mic, Square, Play, Trash2,
  Paperclip, Send, AlertCircle, ListChecks, PenLine, FileText, Layers, Headphones, BookOpen,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import KlarAudioPlayer from "@/components/audio/KlarAudioPlayer";

type TaskType = "test" | "homework" | "writing" | "audio" | "modular";

type ModuleKind = "reading" | "writing" | "speaking" | "grammar" | "listening";

interface TaskModule {
  kind: ModuleKind;
  title?: string;
  text?: string;
  script?: string;
  audio_path?: string;
  questions?: Array<{ format?: "choice" | "gap"; question: string; options?: string[]; answer?: string }>;
  topic?: string;
  criteria?: string[];
  min_words?: number;
}

interface Question {
  question: string;
  options: string[];
  explanation?: string;
}

interface Task {
  id: string;
  type: TaskType;
  title: string;
  instructions: string | null;
  payload: any;
  level: string | null;
  due_at: string | null;
  status: "assigned" | "in_progress" | "submitted" | "graded";
}

interface Submission {
  id: string;
  auto_score: number | null;
  ai_feedback: string | null;
  grade: number | null;
  teacher_feedback: string | null;
  text: string | null;
  status: string;
}

const MAX_SIZE = 20 * 1024 * 1024;

const MODULE_ORDER: Record<ModuleKind, number> = {
  reading: 0, // Lesen
  listening: 1, // Hören
  writing: 2, // Schreiben
  speaking: 3, // Sprechen
  grammar: 4, // Grammatik
};

/* --- shared visual language --- */
const CARD =
  "rounded-[28px] border border-border/60 bg-card/80 backdrop-blur-xl shadow-[0_24px_60px_-34px_hsl(var(--primary)/0.55)]";
const BTN_PRIMARY =
  "flex-1 px-5 py-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-sm font-bold shadow-lg shadow-primary/25 inline-flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none";
const BTN_GHOST =
  "flex-1 px-5 py-3 rounded-2xl border border-border/70 bg-background/60 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-40";
const LETTERS = ["A", "B", "C", "D", "E", "F"];


const StudentTask = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isPreviewRequest = searchParams.get("preview") === "1";
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const [task, setTask] = useState<Task | null>(null);
  const [preview, setPreview] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // test state
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [result, setResult] = useState<{ correct: number; total: number; score: number } | null>(null);

  // text state
  const [text, setText] = useState("");

// modular state
  const [moduleAnswers, setModuleAnswers] = useState<any[]>([]);
  const [listenUrls, setListenUrls] = useState<Record<number, string>>({});
  const [moduleStep, setModuleStep] = useState(0);

  // files
  const [files, setFiles] = useState<Array<{ path: string; name: string; size: number; type: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // audio
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // ── autosave (draft progress in localStorage) ──
  const draftKey = user && id ? `klar:task-draft:${user.id}:${id}` : null;
  const restoredRef = useRef(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const clearDraft = () => {
    if (draftKey) try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
    setSavedAt(null);
  };


  useEffect(() => {
    if (!id || !user) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("student_assignments")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (!active) return;
      if (error || !data) {
        toast.error(t("Не вдалося завантажити завдання", "Не удалось загрузить задание"));
        navigate("/academy");
        return;
      }
      if ((data as any).type === "blocks") {
        navigate(`/blocks-task/${id}`, { replace: true });
        return;
      }
      if ((data as any).type === "minicourse") {
        navigate(`/minicourse/${id}`, { replace: true });
        return;
      }

      if ((data as any).type === "book" || (data as any).type === "book_plan") {
        navigate(`/book-task/${id}`, { replace: true });
        return;
      }
      let previewMode = false;

      if ((data as any).student_id !== user.id) {
        const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" as any });
        const { data: isTeacher } = await supabase.rpc("has_role", { _user_id: user.id, _role: "teacher" as any });
        if (!isAdmin && !isTeacher) {
          toast.error(t("Немає доступу", "Нет доступа"));
          navigate("/academy");
          return;
        }
        previewMode = true;
      } else if (isPreviewRequest) {
        previewMode = true;
      }
if (!active) return;
      setPreview(previewMode);
      setTask(data as any);
      setModuleStep(0);
      const qs = ((data as any).payload?.questions ?? []) as Question[];
      setAnswers(new Array(qs.length).fill(null));

      const mods = ((data as any).payload?.modules ?? []) as TaskModule[];
      if (mods.length) {
        setModuleAnswers(
          mods.map((m) =>
            m.kind === "reading" || m.kind === "listening" || m.kind === "grammar"
              ? new Array((m.questions ?? []).length).fill(null)
              : null,
          ),
        );
        const urls: Record<number, string> = {};
        await Promise.all(
          mods.map(async (m, mi) => {
            if (!m.audio_path) return;
            const { data: signed } = await supabase.storage
              .from("assignment-audio")
              .createSignedUrl(m.audio_path, 3600);
            if (signed?.signedUrl) urls[mi] = signed.signedUrl;
          }),
        );
        if (active) setListenUrls(urls);
      }

      if (!previewMode) {
        const { data: sub } = await supabase
          .from("student_submissions")
          .select("id, auto_score, ai_feedback, grade, teacher_feedback, text, status")
          .eq("assignment_id", id)
          .order("submitted_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (active && sub) setSubmission(sub as any);

        // restore saved draft (only for the student, and only if not submitted yet)
        if (active && !sub && draftKey) {
          try {
            const raw = localStorage.getItem(draftKey);
            if (raw) {
              const d = JSON.parse(raw);
              if (Array.isArray(d.answers) && d.answers.length === qs.length) setAnswers(d.answers);
              if (Array.isArray(d.moduleAnswers) && mods.length) setModuleAnswers(d.moduleAnswers);
              if (typeof d.text === "string") setText(d.text);
              if (Array.isArray(d.files)) setFiles(d.files);
              if (typeof d.moduleStep === "number") setModuleStep(d.moduleStep);
              if (typeof d.step === "number") setStep(d.step);
              if (d.savedAt) setSavedAt(d.savedAt);
              if (d.text || (d.files ?? []).length || d.moduleStep > 0 || d.step > 0) {
                toast.info(t("Прогрес відновлено", "Прогресс восстановлен"));
              }
            }
          } catch { /* ignore corrupt draft */ }
        }
      }
      restoredRef.current = true;
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id, user]);

  // autosave draft on every change
  useEffect(() => {
    if (!draftKey || preview || loading || !restoredRef.current) return;
    if (submission || result) return;
    const timer = setTimeout(() => {
      try {
        const ts = Date.now();
        localStorage.setItem(
          draftKey,
          JSON.stringify({ answers, moduleAnswers, text, files, moduleStep, step, savedAt: ts }),
        );
        setSavedAt(ts);
      } catch { /* storage full / unavailable */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [draftKey, preview, loading, submission, result, answers, moduleAnswers, text, files, moduleStep, step]);


  useEffect(() => {
    return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
  }, [audioUrl]);

const questions: Question[] = (task?.payload?.questions ?? []) as Question[];
  const modules: TaskModule[] = (task?.payload?.modules ?? []) as TaskModule[];
  // Stable display order: Lesen → Hören → Schreiben → Sprechen → Grammatik
  const orderedModuleIndices = modules
    .map((_, i) => i)
    .sort((a, b) => (MODULE_ORDER[modules[a].kind] ?? 99) - (MODULE_ORDER[modules[b].kind] ?? 99));
  const hasSpeaking = modules.some((m) => m.kind === "speaking");
  const hasWriting = modules.some((m) => m.kind === "writing");

const setModuleAnswer = (mi: number, qi: number, value: number | string) =>
    setModuleAnswers((prev) =>
      prev.map((entry, i) => {
        if (i !== mi) return entry;
        const arr = Array.isArray(entry) ? [...entry] : [];
        arr[qi] = value;
        return arr;
      }),
    );

  const moduleDone = (mi: number) => {
    const m = modules[mi];
    if (!m) return false;
    if (m.kind === "reading" || m.kind === "listening" || m.kind === "grammar") {
      const arr = moduleAnswers[mi];
      return (m.questions ?? []).every((_, qi) => arr?.[qi] != null && arr?.[qi] !== "");
    }
    if (m.kind === "writing") return text.trim().length > 0;
    if (m.kind === "speaking") return !!audioBlob;
    return true;
  };

  const goNextModule = () => {
    const mi = orderedModuleIndices[moduleStep];
    if (!preview && mi != null && !moduleDone(mi)) {
      toast.error(t("Спочатку виконай цей модуль", "Сначала выполни этот модуль"));
      return;
    }
    setModuleStep((s) => Math.min(orderedModuleIndices.length - 1, s + 1));
  };

const uploadFiles = async (list: FileList | null) => {
    if (!list || !user) return;
    if (preview) {
      toast.info(t("Режим перегляду — файли не завантажуються", "Режим просмотра — файлы не загружаются"));
      return;
    }
    setUploading(true);
    const added: typeof files = [];
    for (const f of Array.from(list)) {
      if (f.size > MAX_SIZE) {
        toast.error(t("Файл завеликий (макс 20 МБ)", "Файл слишком большой (макс 20 МБ)"));
        continue;
      }
      const path = `${user.id}/${id}/${Date.now()}-${f.name.replace(/[^\w.\-]/g, "_")}`;
      const { error } = await supabase.storage.from("student-submissions").upload(path, f);
      if (error) {
        toast.error(error.message);
        continue;
      }
      added.push({ path, name: f.name, size: f.size, type: f.type });
    }
    setFiles((prev) => [...prev, ...added]);
    setUploading(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((tr) => tr.stop());
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      toast.error(t("Немає доступу до мікрофона", "Нет доступа к микрофону"));
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const submit = async () => {
    if (preview) {
      toast.info(t("Режим перегляду — відповіді не зберігаються", "Режим просмотра — ответы не сохраняются"));
      return;
    }
    if (!task || !user) return;

    if (task.type === "test" && answers.some((a) => a == null)) {
      toast.error(t("Відповідай на всі питання", "Ответь на все вопросы"));
      return;
    }
    if ((task.type === "writing" || task.type === "homework") && !text.trim() && files.length === 0) {
      toast.error(t("Додай відповідь або файл", "Добавь ответ или файл"));
      return;
    }
    if (task.type === "modular") {
      const missing = modules.some((m, mi) => {
        if (m.kind === "reading" || m.kind === "listening" || m.kind === "grammar") {
          const arr = moduleAnswers[mi];
          return (m.questions ?? []).some((_, qi) => arr?.[qi] == null || arr?.[qi] === "");
        }
        return false;
      });
      if (missing) {
        toast.error(t("Виконай усі тестові завдання", "Выполни все тестовые задания"));
        return;
      }
      if (hasWriting && !text.trim()) {
        toast.error(t("Напиши письмову відповідь", "Напиши письменный ответ"));
        return;
      }
      if (hasSpeaking && !audioBlob) {
        toast.error(t("Запиши аудіо для говоріння", "Запиши аудио для говорения"));
        return;
      }
    }
    if (task.type === "audio" && !audioBlob) {
      toast.error(t("Спочатку запиши аудіо", "Сначала запиши аудио"));
      return;
    }

    setSending(true);

    let audioPath: string | null = null;
    if ((task.type === "audio" || task.type === "modular") && audioBlob) {
      audioPath = `${user.id}/${task.id}/${Date.now()}-recording.webm`;
      const { error } = await supabase.storage
        .from("student-submissions")
        .upload(audioPath, audioBlob, { contentType: "audio/webm" });
      if (error) {
        setSending(false);
        toast.error(error.message);
        return;
      }
    }

    const { data, error } = await supabase.functions.invoke("submit-student-assignment", {
      body: {
        assignment_id: task.id,
        answers: task.type === "test" ? answers : undefined,
        module_answers: task.type === "modular" ? moduleAnswers : undefined,
        text: text.trim() || undefined,
        files,
        audio_path: audioPath,
      },
    });
    setSending(false);

    if (error || (data as any)?.error) {
      toast.error(String((data as any)?.error || error?.message || t("Помилка відправки", "Ошибка отправки")));
      return;
    }

    const res = data as any;
    if (task.type === "test" || task.type === "modular") {
      setResult({ correct: res.correct, total: res.total, score: res.auto_score ?? 0 });
    }
    setSubmission({
      id: res.submission_id,
      auto_score: res.auto_score,
      ai_feedback: res.ai_feedback,
      grade: null,
      teacher_feedback: null,
      text: text.trim() || null,
      status: "submitted",
    });
    setTask({ ...task, status: "submitted" });
    clearDraft();
    toast.success(t("Відправлено вчителю!", "Отправлено учителю!"));
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!task) return null;

  const alreadyDone = !preview && task.status !== "assigned" && !result;
  const TypeIcon =
    task.type === "test" ? ListChecks : task.type === "writing" ? PenLine : task.type === "audio" ? Mic : task.type === "modular" ? Layers : FileText;

  return (
    <div className="relative min-h-[100dvh] bg-background pb-28 lg:pb-12 overflow-hidden">
      {/* ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-primary/20 blur-[130px]" />
        <div className="absolute top-1/3 -right-32 w-[380px] h-[380px] rounded-full bg-accent/20 blur-[140px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
      </div>

      <div className="max-w-4xl mx-auto px-4 lg:px-8 pt-6 space-y-5">
        <button
          onClick={() => { if (preview) { window.close(); navigate(-1); } else navigate("/academy"); }}
          className="group inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="w-8 h-8 rounded-xl border border-border/70 bg-card/60 backdrop-blur flex items-center justify-center transition-transform group-hover:-translate-x-0.5">
            <ArrowLeft className="w-4 h-4" />
          </span>
          {preview ? t("Закрити перегляд", "Закрыть просмотр") : t("До завдань", "К заданиям")}
        </button>

        {!preview && !submission && !result && savedAt && (
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {t("Прогрес збережено автоматично", "Прогресс сохранён автоматически")} ·{" "}
            {new Date(savedAt).toLocaleTimeString(lang === "uk" ? "uk-UA" : "ru-RU", { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}

        {preview && (
          <div className="rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <span className="text-base">👀</span>
            {t("Режим перегляду очима учня — відповіді не зберігаються", "Режим просмотра глазами ученика — ответы не сохраняются")}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className={`relative overflow-hidden p-6 ${CARD}`}
        >
          <div className="absolute -top-16 -right-10 w-40 h-40 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
              <TypeIcon className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl lg:text-2xl font-display font-black leading-tight tracking-tight">{task.title}</h1>
              {task.instructions && (
                <p className="text-sm text-muted-foreground mt-1.5 whitespace-pre-wrap leading-relaxed">{task.instructions}</p>
              )}
              <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-bold uppercase tracking-wider">
                {task.level && (
                  <span className="px-2.5 py-1 rounded-full bg-primary/12 text-primary border border-primary/20">{task.level}</span>
                )}
                {task.due_at && (
                  <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground border border-border/60">
                    {t("до", "до")} {new Date(task.due_at).toLocaleDateString(lang === "uk" ? "uk-UA" : "ru-RU")}
                  </span>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Result / already submitted */}
        {(result || alreadyDone) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-6 space-y-3 ${CARD}`}
          >
            <div className="flex items-center gap-2.5 font-display font-black text-lg">
              <span className="w-9 h-9 rounded-2xl bg-green-500/15 text-green-500 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              {task.status === "graded" ? t("Перевірено вчителем", "Проверено учителем") : t("Відправлено", "Отправлено")}
            </div>
            {result && (
              <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold">{t("Результат", "Результат")}</p>
                <p className="text-3xl font-display font-black text-primary mt-1">{result.score}%</p>
                <p className="text-xs text-muted-foreground mt-0.5">{result.correct} / {result.total}</p>
              </div>
            )}
            {!result && submission?.auto_score != null && (
              <p className="text-sm">{t("Авто-результат", "Авто-результат")}: <b>{submission.auto_score}%</b></p>
            )}
            {submission?.grade != null && (
              <p className="text-sm inline-flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" /> {t("Оцінка", "Оценка")}: <b>{submission.grade}</b>
              </p>
            )}
            {submission?.teacher_feedback && (
              <div className="rounded-2xl bg-muted/70 border border-border/60 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {submission.teacher_feedback}
              </div>
            )}
            {submission?.ai_feedback && (
              <div className="rounded-2xl bg-primary/8 border border-primary/20 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                {submission.ai_feedback.replace(/SCORE:\s*\d+/i, "").trim()}
              </div>
            )}
          </motion.div>
        )}

        {/* Interactive part */}
        {!alreadyDone && !result && (
          <>
            {task.type === "test" && questions.length > 0 && (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-6 space-y-5 ${CARD}`}
              >
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <span>{t("Питання", "Вопрос")} {step + 1} / {questions.length}</span>
                  <span>{answers.filter((a) => a != null).length} / {questions.length}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    initial={false}
                    animate={{ width: `${((step + 1) / questions.length) * 100}%` }}
                    transition={{ type: "spring", stiffness: 160, damping: 24 }}
                  />
                </div>

                <p className="font-display font-bold text-lg leading-snug">{questions[step].question}</p>
                <div className="space-y-2.5">
                  {questions[step].options.map((opt, oi) => {
                    const on = answers[step] === oi;
                    return (
                      <button
                        key={oi}
                        onClick={() => setAnswers((a) => a.map((v, i) => (i === step ? oi : v)))}
                        className={`w-full text-left px-4 py-3.5 rounded-2xl border text-sm flex items-center gap-3 transition-all active:scale-[0.99] ${
                          on
                            ? "border-primary bg-primary/10 font-semibold shadow-md shadow-primary/15"
                            : "border-border/70 bg-background/50 hover:bg-muted hover:border-border"
                        }`}
                      >
                        <span
                          className={`w-7 h-7 shrink-0 rounded-xl text-xs font-black flex items-center justify-center ${
                            on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {LETTERS[oi] ?? oi + 1}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2.5 pt-1">
                  <button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} className={BTN_GHOST}>
                    {t("Назад", "Назад")}
                  </button>
                  {step < questions.length - 1 ? (
                    <button onClick={() => setStep((s) => s + 1)} className={BTN_PRIMARY}>
                      {t("Далі", "Далее")}
                    </button>
                  ) : (
                    <button disabled={sending} onClick={submit} className={BTN_PRIMARY}>
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      {t("Завершити", "Завершить")}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {task.type === "modular" && (
              <div className="space-y-4">
                {orderedModuleIndices.length > 0 ? (
                  <>
                    {/* Module stepper */}
                    <div className={`p-4 ${CARD}`}>
                      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                        <span>{t("Модуль", "Модуль")} {moduleStep + 1} / {orderedModuleIndices.length}</span>
                        <span>{Math.round(((moduleStep + 1) / orderedModuleIndices.length) * 100)}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                          initial={false}
                          animate={{ width: `${((moduleStep + 1) / orderedModuleIndices.length) * 100}%` }}
                          transition={{ type: "spring", stiffness: 160, damping: 24 }}
                        />
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {orderedModuleIndices.map((mi, si) => {
                          const m = modules[mi];
                          const done = moduleDone(mi);
                          const isCurrent = si === moduleStep;
                          const Icon = m.kind === "listening" ? Headphones
                            : m.kind === "reading" ? BookOpen
                            : m.kind === "writing" ? PenLine
                            : m.kind === "speaking" ? Mic
                            : ListChecks;
                          return (
                            <button
                              key={mi}
                              onClick={() => { if (preview || si < moduleStep) setModuleStep(si); }}
                              disabled={!preview && si > moduleStep}
                              title={m.title || m.kind}
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-all shrink-0 ${
                                isCurrent
                                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary shadow-md shadow-primary/25 scale-[1.03]"
                                  : done
                                    ? "border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400"
                                    : "border-border/70 bg-background/50 text-muted-foreground"
                              } ${!preview && si > moduleStep ? "opacity-40" : ""}`}
                            >
                              {done && !isCurrent ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                              {m.title || m.kind}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Current module */}
                    {(() => {
                      const mi = orderedModuleIndices[moduleStep];
                      const m = modules[mi];
                      const isLast = moduleStep === orderedModuleIndices.length - 1;
                      const Icon = m.kind === "listening" ? Headphones
                        : m.kind === "reading" ? BookOpen
                        : m.kind === "writing" ? PenLine
                        : m.kind === "speaking" ? Mic
                        : ListChecks;
                      return (
                        <motion.div
                          key={mi}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 24 }}
                          className={`p-5 lg:p-6 space-y-4 ${CARD}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-10 h-10 rounded-2xl bg-primary/12 text-primary flex items-center justify-center shrink-0">
                              <Icon className="w-5 h-5" />
                            </span>
                            <div className="min-w-0">
                              <p className="font-display font-black leading-tight">{m.title || m.kind}</p>
                              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                                {m.kind === "reading" ? "Lesen" : m.kind === "listening" ? "Hören" : m.kind === "writing" ? "Schreiben" : m.kind === "speaking" ? "Sprechen" : "Grammatik"}
                              </p>
                            </div>
                          </div>

                          {m.kind === "reading" && m.text && (
                            <div className="relative rounded-2xl border border-border/60 bg-muted/50 p-5">
                              <span className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-primary/50" />
                              <p className="text-[15px] leading-[1.8] whitespace-pre-wrap pl-3">{m.text}</p>
                            </div>
                          )}

                          {m.kind === "listening" && (
                            listenUrls[mi] ? (
                              <KlarAudioPlayer src={listenUrls[mi]} label={t("Аудіо завдання", "Аудио задание")} />
                            ) : (
                              <p className="text-xs text-muted-foreground">{t("Аудіо недоступне", "Аудио недоступно")}</p>
                            )
                          )}

                          {(m.kind === "writing" || m.kind === "speaking") && m.topic && (
                            <p className="text-sm font-semibold rounded-2xl bg-primary/8 border border-primary/20 px-4 py-3">{m.topic}</p>
                          )}

                          {m.kind === "writing" && (
                            <>
                              {(m.criteria ?? []).filter(Boolean).length > 0 && (
                                <ul className="text-xs text-muted-foreground space-y-1.5">
                                  {(m.criteria ?? []).filter(Boolean).map((c, ci) => (
                                    <li key={ci} className="flex gap-2">
                                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={8}
                                readOnly={preview}
                                placeholder={preview
                                  ? t("Режим перегляду — введення заблоковано", "Режим просмотра — ввод заблокирован")
                                  : t("Твій текст…", "Твой текст…")}
                                className={`w-full px-4 py-3.5 rounded-2xl border border-border/70 text-[15px] leading-relaxed resize-y outline-none transition-shadow focus:ring-2 focus:ring-primary/30 focus:border-primary/50 ${
                                  preview ? "bg-muted/40 opacity-80 cursor-not-allowed" : "bg-background/60"
                                }`}
                              />
                              <p className="text-xs text-muted-foreground">
                                {t("Слів", "Слов")}: <b className="text-foreground">{text.trim() ? text.trim().split(/\s+/).length : 0}</b>
                                {m.min_words ? ` / ${m.min_words}` : ""}
                              </p>
                            </>
                          )}

                          {m.kind === "speaking" && (
                            <div className="space-y-3">
                              {(m.questions ?? []).map((q, qi) => (
                                <p key={qi} className="text-sm flex gap-2">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                                  {q.question}
                                </p>
                              ))}
                              {!recording ? (
                                <button onClick={startRecording} className={`w-full ${BTN_PRIMARY}`}>
                                  <Mic className="w-4 h-4" /> {t("Записати відповідь", "Записать ответ")}
                                </button>
                              ) : (
                                <button
                                  onClick={stopRecording}
                                  className="w-full px-5 py-3 rounded-2xl bg-destructive text-destructive-foreground text-sm font-bold inline-flex items-center justify-center gap-2 shadow-lg shadow-destructive/25 animate-pulse"
                                >
                                  <Square className="w-4 h-4" /> {t("Зупинити", "Остановить")}
                                </button>
                              )}
                              {audioUrl && <KlarAudioPlayer src={audioUrl} label={t("Твій запис", "Твоя запись")} compact />}
                            </div>
                          )}

                          {(m.kind === "reading" || m.kind === "listening" || m.kind === "grammar") && (
                            <div className="space-y-4">
                              {(m.questions ?? []).map((q, qi) => (
                                <div key={qi} className="rounded-2xl border border-border/50 bg-background/40 p-4 space-y-2.5">
                                  <p className="text-sm font-semibold flex gap-2">
                                    <span className="w-5 h-5 shrink-0 rounded-lg bg-primary/12 text-primary text-[11px] font-black flex items-center justify-center">
                                      {qi + 1}
                                    </span>
                                    {q.question}
                                  </p>
                                  {q.format === "gap" ? (
                                    <input
                                      value={(moduleAnswers[mi]?.[qi] as string) ?? ""}
                                      onChange={(e) => setModuleAnswer(mi, qi, e.target.value)}
                                      placeholder={t("Відповідь", "Ответ")}
                                      className="w-full px-4 py-2.5 rounded-2xl border border-border/70 bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-shadow"
                                    />
                                  ) : (
                                    <div className="space-y-2">
                                      {(q.options ?? []).map((opt, oi) => {
                                        const on = moduleAnswers[mi]?.[qi] === oi;
                                        return (
                                          <button
                                            key={oi}
                                            onClick={() => setModuleAnswer(mi, qi, oi)}
                                            className={`w-full text-left px-3.5 py-2.5 rounded-2xl border text-sm flex items-center gap-3 transition-all active:scale-[0.99] ${
                                              on
                                                ? "border-primary bg-primary/10 font-semibold shadow-sm shadow-primary/15"
                                                : "border-border/60 bg-card/50 hover:bg-muted"
                                            }`}
                                          >
                                            <span
                                              className={`w-6 h-6 shrink-0 rounded-lg text-[11px] font-black flex items-center justify-center ${
                                                on ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                                              }`}
                                            >
                                              {LETTERS[oi] ?? oi + 1}
                                            </span>
                                            {opt}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Nav */}
                          <div className="flex gap-2.5 pt-1">
                            <button
                              disabled={moduleStep === 0}
                              onClick={() => setModuleStep((s) => Math.max(0, s - 1))}
                              className={BTN_GHOST}
                            >
                              {t("Назад", "Назад")}
                            </button>
                            {!isLast ? (
                              <button onClick={goNextModule} className={BTN_PRIMARY}>
                                {t("Далі", "Далее")}
                              </button>
                            ) : (
                              <button
                                disabled={sending || preview}
                                onClick={submit}
                                title={preview ? t("Відправку заблоковано в режимі перегляду", "Отправка заблокирована в режиме просмотра") : undefined}
                                className={BTN_PRIMARY}
                              >
                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {preview ? t("Відправку заблоковано", "Отправка заблокирована") : t("Відправити вчителю", "Отправить учителю")}
                              </button>
                            )}
                          </div>
                        </motion.div>
                      );
                    })()}
                  </>
                ) : (
                  <button
                    disabled={sending || preview}
                    onClick={submit}
                    title={preview ? t("Відправку заблоковано в режимі перегляду", "Отправка заблокирована в режиме просмотра") : undefined}
                    className={`w-full ${BTN_PRIMARY}`}
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {preview ? t("Відправку заблоковано", "Отправка заблокирована") : t("Відправити вчителю", "Отправить учителю")}
                  </button>
                )}
              </div>
            )}

            {(task.type === "writing" || task.type === "homework") && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 space-y-3.5 ${CARD}`}
              >
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={10}
                  readOnly={preview}
                  placeholder={preview
                    ? t("Режим перегляду — введення заблоковано", "Режим просмотра — ввод заблокирован")
                    : t("Твоя відповідь…", "Твой ответ…")}
                  className={`w-full px-4 py-3.5 rounded-2xl border border-border/70 text-[15px] leading-relaxed resize-y outline-none transition-shadow focus:ring-2 focus:ring-primary/30 focus:border-primary/50 ${
                    preview ? "bg-muted/40 opacity-80 cursor-not-allowed" : "bg-background/60"
                  }`}
                />
                <p className="text-xs text-muted-foreground">
                  {t("Слів", "Слов")}: <b className="text-foreground">{text.trim() ? text.trim().split(/\s+/).length : 0}</b>
                </p>

                {task.type === "homework" && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => uploadFiles(e.target.files)}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || preview}
                      title={preview ? t("Завантаження файлів заблоковано в режимі перегляду", "Загрузка файлов заблокирована в режиме просмотра") : undefined}
                      className="w-full px-4 py-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 text-sm font-semibold text-primary inline-flex items-center justify-center gap-2 transition-colors hover:bg-primary/10 disabled:opacity-60"
                    >
                      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                      {t("Додати фото / файл", "Добавить фото / файл")}
                    </button>
                    {files.map((f) => (
                      <div key={f.path} className="flex items-center justify-between text-xs bg-muted/70 border border-border/60 rounded-2xl px-3.5 py-2.5">
                        <span className="truncate">📎 {f.name}</span>
                        <button onClick={() => setFiles((prev) => prev.filter((x) => x.path !== f.path))}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </>
                )}

                <button
                  disabled={sending || preview}
                  onClick={submit}
                  title={preview ? t("Відправку заблоковано в режимі перегляду", "Отправка заблокирована в режиме просмотра") : undefined}
                  className={`w-full ${BTN_PRIMARY}`}
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {preview ? t("Відправку заблоковано", "Отправка заблокирована") : t("Відправити вчителю", "Отправить учителю")}
                </button>
              </motion.div>
            )}

            {task.type === "audio" && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 space-y-5 text-center ${CARD}`}
              >
                <p className="text-sm text-muted-foreground">
                  {t("Натисни та прочитай завдання вголос", "Нажми и прочитай задание вслух")}
                </p>
                <div className="relative w-28 h-28 mx-auto">
                  {recording && (
                    <>
                      <span className="absolute inset-0 rounded-full bg-destructive/30 animate-ping" />
                      <span className="absolute -inset-3 rounded-full border border-destructive/30 animate-pulse" />
                    </>
                  )}
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`relative w-28 h-28 rounded-full flex items-center justify-center text-primary-foreground transition-transform active:scale-95 shadow-2xl ${
                      recording
                        ? "bg-gradient-to-br from-destructive to-destructive/70 shadow-destructive/30"
                        : "bg-gradient-to-br from-primary to-primary/70 shadow-primary/30"
                    }`}
                  >
                    {recording ? <Square className="w-9 h-9" /> : <Mic className="w-10 h-10" />}
                  </button>
                </div>
                {audioUrl && (
                  <div className="space-y-2">
                    <KlarAudioPlayer src={audioUrl} label={t("Твій запис", "Твоя запись")} />
                    <button
                      onClick={() => { setAudioBlob(null); if (audioUrl) URL.revokeObjectURL(audioUrl); setAudioUrl(null); }}
                      className="text-xs font-semibold text-destructive inline-flex items-center gap-1 hover:underline"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {t("Перезаписати", "Перезаписать")}
                    </button>
                  </div>
                )}
                <button disabled={sending || !audioBlob} onClick={submit} className={`w-full ${BTN_PRIMARY}`}>
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {t("Відправити вчителю", "Отправить учителю")}
                </button>
              </motion.div>
            )}

            {task.type === "test" && questions.length === 0 && (
              <div className={`p-6 text-sm text-muted-foreground flex items-center gap-2 ${CARD}`}>
                <AlertCircle className="w-4 h-4" /> {t("Питання ще не додані", "Вопросы ещё не добавлены")}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StudentTask;
