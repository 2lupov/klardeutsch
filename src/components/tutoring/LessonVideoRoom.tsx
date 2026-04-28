import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video, VideoOff, Circle, Square, Loader2, Sparkles,
  Eye, EyeOff, Users, Trash2, Play, Brain, X
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

declare global { interface Window { JitsiMeetExternalAPI: any; } }

interface Props {
  lessonId: string;
  teacherId: string;
  studentId: string;
  isTeacher: boolean;
  userName: string;
  lang: "uk" | "ru";
}

const SCRIPT_SRC = "https://meet.jit.si/external_api.js";

const loadJitsi = () => new Promise<void>((resolve, reject) => {
  if (window.JitsiMeetExternalAPI) return resolve();
  const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`) as HTMLScriptElement | null;
  if (existing) { existing.addEventListener("load", () => resolve()); return; }
  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  s.onload = () => resolve();
  s.onerror = () => reject(new Error("Jitsi script failed"));
  document.head.appendChild(s);
});

const LessonVideoRoom = ({ lessonId, teacherId, studentId, isTeacher, userName, lang }: Props) => {
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<any>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);

  const [inCall, setInCall] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recordings, setRecordings] = useState<any[]>([]);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [openRecording, setOpenRecording] = useState<any>(null);

  const roomName = `klardeutsch-lesson-${lessonId}`;

  const loadRecordings = async () => {
    const { data } = await supabase
      .from("tutoring_lesson_recordings")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("created_at", { ascending: false });
    setRecordings(data || []);
  };

  useEffect(() => { loadRecordings(); }, [lessonId]);

  // Realtime updates while analyzing
  useEffect(() => {
    const ch = supabase
      .channel(`rec-${lessonId}`)
      .on("postgres_changes", {
        event: "*", schema: "public",
        table: "tutoring_lesson_recordings",
        filter: `lesson_id=eq.${lessonId}`,
      }, () => loadRecordings())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [lessonId]);

  const startCall = async () => {
    try {
      await loadJitsi();
      if (!containerRef.current) return;
      const api = new window.JitsiMeetExternalAPI("meet.jit.si", {
        roomName,
        parentNode: containerRef.current,
        width: "100%",
        height: 480,
        userInfo: { displayName: userName },
        configOverwrite: {
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
          TOOLBAR_BUTTONS: [
            "microphone", "camera", "desktop", "fullscreen", "fodeviceselection",
            "hangup", "chat", "settings", "raisehand", "videoquality", "filmstrip", "tileview",
          ],
        },
      });
      apiRef.current = api;
      api.addListener("readyToClose", () => endCall());
      setInCall(true);
    } catch (e) {
      toast.error(t("Не вдалося відкрити відео", "Не удалось открыть видео"));
    }
  };

  const endCall = () => {
    if (isRecording) stopRecording();
    apiRef.current?.dispose?.();
    apiRef.current = null;
    setInCall(false);
  };

  const startRecording = async () => {
    if (!isTeacher) return;
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 24 } as any,
        audio: true,
      });
      let combinedStream: MediaStream = displayStream;
      try {
        const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
        const ctx = new AudioContext();
        const dest = ctx.createMediaStreamDestination();
        const sources: AudioNode[] = [];
        if (displayStream.getAudioTracks().length) sources.push(ctx.createMediaStreamSource(displayStream));
        sources.push(ctx.createMediaStreamSource(mic));
        sources.forEach((s) => s.connect(dest));
        combinedStream = new MediaStream([
          ...displayStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ]);
      } catch { /* mic optional */ }

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus" : "video/webm";
      const rec = new MediaRecorder(combinedStream, { mimeType: mime, videoBitsPerSecond: 1_500_000 });
      chunksRef.current = [];
      rec.ondataavailable = (ev) => { if (ev.data.size > 0) chunksRef.current.push(ev.data); };
      rec.onstop = async () => {
        displayStream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const duration = Math.round((Date.now() - startTsRef.current) / 1000);
        await uploadRecording(blob, duration);
      };

      // Stop if user cancels screen share
      displayStream.getVideoTracks()[0].onended = () => {
        if (recorderRef.current?.state === "recording") stopRecording();
      };

      startTsRef.current = Date.now();
      rec.start(2000);
      recorderRef.current = rec;
      setIsRecording(true);
      toast.success(t("Запис почався", "Запись началась"));
    } catch (e) {
      toast.error(t("Доступ до екрану відхилено", "Доступ к экрану отклонён"));
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const uploadRecording = async (blob: Blob, duration: number) => {
    setUploading(true);
    try {
      const fileName = `${teacherId}/${lessonId}/${Date.now()}.webm`;
      const { error: upErr } = await supabase.storage
        .from("tutoring-recordings")
        .upload(fileName, blob, { contentType: "video/webm" });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from("tutoring-recordings").getPublicUrl(fileName);

      const { data: rec, error: recErr } = await supabase
        .from("tutoring_lesson_recordings")
        .insert({
          lesson_id: lessonId,
          teacher_id: teacherId,
          student_id: studentId,
          video_url: pub.publicUrl,
          audio_url: pub.publicUrl,
          duration_seconds: duration,
          file_size_bytes: blob.size,
          status: "ready",
          visibility: "private",
        })
        .select()
        .single();
      if (recErr) throw recErr;

      toast.success(t("Запис збережено", "Запись сохранена"));
      await loadRecordings();
      // Auto-trigger AI analysis
      analyzeRecording(rec.id);
    } catch (e: any) {
      toast.error(e.message || t("Помилка завантаження", "Ошибка загрузки"));
    } finally {
      setUploading(false);
    }
  };

  const analyzeRecording = async (recId: string) => {
    setAnalyzing(recId);
    try {
      const { error } = await supabase.functions.invoke("analyze-tutoring-recording", {
        body: { recording_id: recId },
      });
      if (error) throw error;
      toast.success(t("AI-аналіз готовий", "AI-анализ готов"));
      loadRecordings();
    } catch (e: any) {
      toast.error(e.message || t("Помилка аналізу", "Ошибка анализа"));
    } finally {
      setAnalyzing(null);
    }
  };

  const setVisibility = async (recId: string, visibility: string) => {
    await supabase.from("tutoring_lesson_recordings")
      .update({ visibility }).eq("id", recId);
    loadRecordings();
    toast.success(t("Доступ оновлено", "Доступ обновлён"));
  };

  const deleteRecording = async (rec: any) => {
    if (!confirm(t("Видалити запис?", "Удалить запись?"))) return;
    const m = rec.video_url?.match(/tutoring-recordings\/(.+)$/);
    if (m) await supabase.storage.from("tutoring-recordings").remove([m[1].split("?")[0]]);
    await supabase.from("tutoring_lesson_recordings").delete().eq("id", rec.id);
    loadRecordings();
  };

  const addWordsToStudent = async (rec: any) => {
    const wordsArr = rec.ai_new_words || [];
    if (!wordsArr.length) return;
    let added = 0;
    for (const w of wordsArr) {
      const { error } = await supabase.from("custom_words").insert({
        user_id: studentId,
        german: w.german,
        article: w.article || null,
        russian: w.russian,
        example: w.example || null,
      });
      if (!error) added++;
    }
    toast.success(t(`Додано ${added} слів учневі`, `Добавлено ${added} слов ученику`));
  };

  const fmtDuration = (s: number) => {
    const m = Math.floor(s / 60), ss = s % 60;
    return `${m}:${ss.toString().padStart(2, "0")}`;
  };

  const visibleRecordings = isTeacher
    ? recordings
    : recordings.filter((r) => r.visibility === "student" || r.visibility === "shared");

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Video panel */}
      <div className="p-4 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold flex items-center gap-2">
            <Users className="w-4 h-4" /> {t("Відеоурок", "Видеоурок")}
          </h3>
          <div className="flex gap-2">
            {!inCall ? (
              <Button size="sm" onClick={startCall} className="gap-2">
                <Video className="w-4 h-4" /> {t("Почати дзвінок", "Начать звонок")}
              </Button>
            ) : (
              <>
                {isTeacher && !isRecording && (
                  <Button size="sm" variant="destructive" onClick={startRecording} className="gap-2">
                    <Circle className="w-4 h-4 fill-current" /> {t("Запис", "Запись")}
                  </Button>
                )}
                {isTeacher && isRecording && (
                  <Button size="sm" variant="outline" onClick={stopRecording} className="gap-2 border-destructive text-destructive">
                    <Square className="w-4 h-4 fill-current" /> {t("Зупинити", "Остановить")}
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={endCall} className="gap-2">
                  <VideoOff className="w-4 h-4" /> {t("Вийти", "Выйти")}
                </Button>
              </>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isRecording && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="mb-3 px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs font-medium flex items-center gap-2">
              <Circle className="w-3 h-3 fill-current animate-pulse" />
              {t("Йде запис уроку (екран + мікрофон)", "Идёт запись урока (экран + микрофон)")}
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={containerRef} className={`rounded-xl overflow-hidden bg-black ${inCall ? "block" : "hidden"}`} />

        {!inCall && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {t("Натисніть «Почати дзвінок», щоб провести урок просто на сайті.",
               "Нажмите «Начать звонок», чтобы провести урок прямо на сайте.")}
            {isTeacher && <div className="mt-1 text-xs opacity-75">
              {t("Викладач може записати екран — AI зробить транскрипт і виділить помилки.",
                 "Преподаватель может записать экран — AI сделает транскрипт и выделит ошибки.")}
            </div>}
          </div>
        )}

        {uploading && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> {t("Завантажуємо запис…", "Загружаем запись…")}
          </div>
        )}
      </div>

      {/* Recordings list */}
      {visibleRecordings.length > 0 && (
        <div className="p-4 space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            {t("Записи уроку", "Записи урока")} ({visibleRecordings.length})
          </div>
          {visibleRecordings.map((rec) => (
            <div key={rec.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 transition-colors">
              <button
                onClick={() => setOpenRecording(rec)}
                className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"
              >
                <Play className="w-4 h-4 ml-0.5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {new Date(rec.created_at).toLocaleString(lang === "uk" ? "uk-UA" : "ru-RU")}
                  {rec.duration_seconds > 0 && (
                    <span className="text-xs text-muted-foreground">· {fmtDuration(rec.duration_seconds)}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {rec.status === "processing" && (
                    <span className="text-xs flex items-center gap-1 text-amber-600">
                      <Loader2 className="w-3 h-3 animate-spin" /> {t("Обробка AI…", "Обработка AI…")}
                    </span>
                  )}
                  {rec.status === "analyzed" && (
                    <span className="text-xs flex items-center gap-1 text-green-600">
                      <Sparkles className="w-3 h-3" /> {t("Аналіз готовий", "Анализ готов")}
                    </span>
                  )}
                  {rec.status === "failed" && (
                    <span className="text-xs text-destructive">{t("Помилка", "Ошибка")}</span>
                  )}
                  {isTeacher && (
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      rec.visibility === "private" ? "bg-muted text-muted-foreground" :
                      rec.visibility === "student" ? "bg-blue-500/10 text-blue-600" :
                      "bg-green-500/10 text-green-600"
                    }`}>
                      {rec.visibility === "private" ? t("Приватно", "Приватно") :
                       rec.visibility === "student" ? t("Учневі", "Ученику") : t("Загальний", "Общий")}
                    </span>
                  )}
                </div>
              </div>
              {isTeacher && (
                <div className="flex items-center gap-1 shrink-0">
                  {rec.status === "ready" && (
                    <Button size="sm" variant="ghost" onClick={() => analyzeRecording(rec.id)} disabled={analyzing === rec.id}>
                      {analyzing === rec.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() =>
                    setVisibility(rec.id, rec.visibility === "private" ? "student" : "private")
                  } title={t("Перемкнути доступ", "Переключить доступ")}>
                    {rec.visibility === "private" ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteRecording(rec)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Recording detail modal */}
      <AnimatePresence>
        {openRecording && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpenRecording(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-card border-b border-border px-5 py-3 flex items-center justify-between">
                <h3 className="font-display font-bold">{t("Запис уроку", "Запись урока")}</h3>
                <button onClick={() => setOpenRecording(null)}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <video src={openRecording.video_url} controls className="w-full rounded-xl bg-black" />

                {openRecording.ai_summary && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                    <div className="text-xs font-bold uppercase text-primary mb-2 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> {t("Конспект AI", "Конспект AI")}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{openRecording.ai_summary}</p>
                  </div>
                )}

                {Array.isArray(openRecording.ai_new_words) && openRecording.ai_new_words.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-bold">{t("Нові слова", "Новые слова")} ({openRecording.ai_new_words.length})</div>
                      {isTeacher && (
                        <Button size="sm" variant="outline" onClick={() => addWordsToStudent(openRecording)}>
                          {t("Додати учневі в словник", "Добавить ученику в словарь")}
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {openRecording.ai_new_words.map((w: any, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-muted/30">
                          {w.article && <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            w.article === "der" ? "bg-blue-500/10 text-blue-600" :
                            w.article === "die" ? "bg-pink-500/10 text-pink-600" :
                            w.article === "das" ? "bg-green-500/10 text-green-600" :
                            "bg-muted text-muted-foreground"
                          }`}>{w.article}</span>}
                          <div className="flex-1">
                            <span className="font-medium">{w.german}</span>
                            <span className="text-muted-foreground"> — {w.russian}</span>
                            {w.example && <div className="text-xs text-muted-foreground italic mt-0.5">«{w.example}»</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(openRecording.ai_errors) && openRecording.ai_errors.length > 0 && (
                  <div>
                    <div className="text-sm font-bold mb-2">{t("Помилки учня", "Ошибки ученика")} ({openRecording.ai_errors.length})</div>
                    <div className="space-y-2">
                      {openRecording.ai_errors.map((er: any, i: number) => (
                        <div key={i} className="text-sm p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                          <div className="text-destructive line-through">{er.said}</div>
                          <div className="text-green-600 font-medium">→ {er.correct}</div>
                          <div className="text-xs text-muted-foreground mt-1">{er.explanation}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {openRecording.transcript && (
                  <details className="rounded-xl border border-border p-3">
                    <summary className="cursor-pointer text-sm font-bold">{t("Повний транскрипт", "Полный транскрипт")}</summary>
                    <div className="mt-3 text-sm whitespace-pre-wrap text-muted-foreground max-h-64 overflow-y-auto">
                      {openRecording.transcript}
                    </div>
                  </details>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LessonVideoRoom;
