import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Notebook, Wifi, WifiOff, Edit3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  lessonId: string;
  isTeacher: boolean;
  lang: "uk" | "ru";
}

/**
 * Shared lesson notebook.
 * - Teacher: can write, autosaves with 600ms debounce.
 * - Student: read-only, sees teacher's text update in realtime.
 */
const LessonNotebook = ({ lessonId, isTeacher, lang }: Props) => {
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [live, setLive] = useState(false);
  const [teacherTyping, setTeacherTyping] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastRemoteUpdate = useRef<number>(0);

  // initial load + ensure row exists
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("tutoring_lesson_notes")
        .select("content")
        .eq("lesson_id", lessonId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setContent(data.content || "");
      } else if (isTeacher) {
        await supabase.from("tutoring_lesson_notes").insert({ lesson_id: lessonId, content: "" });
      }
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [lessonId, isTeacher]);

  // realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`lesson-notes-${lessonId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tutoring_lesson_notes", filter: `lesson_id=eq.${lessonId}` },
        (payload) => {
          const next = (payload.new as any)?.content ?? "";
          // For students: always update. For teacher: ignore self echoes within 1s of save.
          if (isTeacher && Date.now() - lastRemoteUpdate.current < 1500) return;
          setContent(next);
          if (!isTeacher) {
            setTeacherTyping(true);
            if (typingTimer.current) clearTimeout(typingTimer.current);
            typingTimer.current = setTimeout(() => setTeacherTyping(false), 1200);
          }
        }
      )
      .subscribe((status) => {
        setLive(status === "SUBSCRIBED");
      });
    return () => { supabase.removeChannel(channel); };
  }, [lessonId, isTeacher]);

  // debounced save (teacher only)
  const handleChange = (val: string) => {
    setContent(val);
    if (!isTeacher) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    saveTimer.current = setTimeout(async () => {
      lastRemoteUpdate.current = Date.now();
      await supabase
        .from("tutoring_lesson_notes")
        .upsert({ lesson_id: lessonId, content: val, updated_at: new Date().toISOString() }, { onConflict: "lesson_id" });
      setSaving(false);
    }, 500);
  };

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 min-h-[300px] flex items-center justify-center text-muted-foreground text-sm">
        {t("Завантаження зошита…", "Загрузка тетради…")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border overflow-hidden bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-zinc-900 dark:to-zinc-950 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/60 bg-background/60 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <Notebook className="w-4 h-4" />
          </div>
          <div className="leading-tight">
            <p className="font-display font-bold text-sm">
              {t("Спільний зошит", "Общая тетрадь")}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {isTeacher
                ? t("Учень бачить ваш текст у реальному часі", "Ученик видит ваш текст в реальном времени")
                : t("Слідкуйте за поясненнями викладача", "Следите за пояснениями преподавателя")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {!isTeacher && teacherTyping && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[10px] font-bold text-primary px-2 py-1 rounded-full bg-primary/10"
              >
                <Edit3 className="w-3 h-3 animate-pulse" />
                {t("Викладач пише…", "Преподаватель пишет…")}
              </motion.span>
            )}
            {isTeacher && saving && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-muted-foreground"
              >
                {t("Збереження…", "Сохранение…")}
              </motion.span>
            )}
          </AnimatePresence>
          <span
            title={live ? "Realtime online" : "Offline"}
            className={`w-2 h-2 rounded-full ${live ? "bg-green-500 animate-pulse" : "bg-muted-foreground/40"}`}
          />
        </div>
      </div>

      {/* Lined paper */}
      <div className="relative">
        <div
          className="absolute inset-0 pointer-events-none opacity-50"
          style={{
            backgroundImage:
              "repeating-linear-gradient(transparent 0, transparent 31px, hsl(var(--border)) 31px, hsl(var(--border)) 32px)",
            backgroundPositionY: "8px",
          }}
        />
        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          readOnly={!isTeacher}
          placeholder={
            isTeacher
              ? t("Почніть писати — учень побачить миттєво…", "Начните писать — ученик увидит мгновенно…")
              : t("Тут з'явиться те, що пише викладач", "Здесь появится то, что пишет преподаватель")
          }
          spellCheck={false}
          className="relative w-full bg-transparent resize-none outline-none px-5 py-2 leading-[32px] text-[15px] font-mono text-foreground placeholder:text-muted-foreground/60 min-h-[320px] max-h-[60vh]"
          style={{ caretColor: "hsl(var(--primary))" }}
        />
      </div>
    </div>
  );
};

export default LessonNotebook;
