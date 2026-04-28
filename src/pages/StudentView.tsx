import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles } from "lucide-react";

/**
 * Полноэкранная "чистая" страница для ученика во время демонстрации.
 * Не содержит навигации, AI-чатов, заметок учителя.
 * Подписана на live session через Supabase Realtime.
 */
const StudentView = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState<any>(null);
  const [lessonData, setLessonData] = useState<{ words: any[]; exercises: any[]; theory: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    let mounted = true;

    const load = async () => {
      const { data: s } = await supabase
        .from("tutoring_live_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (!mounted || !s) { setLoading(false); return; }
      setSession(s);

      const [{ data: l }, { data: w }, { data: e }] = await Promise.all([
        supabase.from("tutoring_lessons").select("theory").eq("id", s.lesson_id).maybeSingle(),
        supabase.from("tutoring_lesson_words").select("*").eq("lesson_id", s.lesson_id).order("sort_order"),
        supabase.from("tutoring_lesson_exercises").select("*").eq("lesson_id", s.lesson_id).order("sort_order"),
      ]);
      if (!mounted) return;
      setLessonData({ theory: l?.theory || "", words: w || [], exercises: e || [] });
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel(`student-view-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tutoring_live_sessions", filter: `id=eq.${sessionId}` },
        (payload) => setSession(payload.new),
      )
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground p-6 text-center">
        Сессия не найдена или завершена
      </div>
    );
  }
  if (session.status === "ended") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <Sparkles className="w-12 h-12 text-primary" />
        <h1 className="text-2xl font-display font-black">Урок завершён</h1>
        <p className="text-muted-foreground">Спасибо за работу!</p>
      </div>
    );
  }

  const v = session.current_view || { type: "welcome" };
  const highlight = session.highlight;

  return (
    <div ref={containerRef} className="min-h-screen bg-background relative overflow-hidden">
      {/* Top bar — minimal, only "LIVE" indicator */}
      <div className="fixed top-0 left-0 right-0 z-20 px-6 py-3 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-bold text-foreground">LIVE • Урок</span>
        </div>
      </div>

      <div className="pt-20 pb-12 px-6 lg:px-16 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={JSON.stringify(v)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            {v.type === "welcome" && (
              <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-6">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
                <h1 className="text-4xl lg:text-6xl font-display font-black">Готовы начать?</h1>
                <p className="text-lg text-muted-foreground">Учитель сейчас покажет первое задание</p>
              </div>
            )}

            {v.type === "text" && (
              <div className="prose prose-lg max-w-none">
                {v.title && <h1 className="text-3xl lg:text-5xl font-display font-black mb-6">{v.title}</h1>}
                <div className="text-xl lg:text-2xl leading-relaxed whitespace-pre-wrap">{v.body}</div>
              </div>
            )}

            {v.type === "theory" && (
              <div className="prose prose-lg max-w-none">
                <h2 className="text-2xl font-display font-bold mb-4">Теория</h2>
                <div className="text-xl leading-relaxed whitespace-pre-wrap">{lessonData?.theory}</div>
              </div>
            )}

            {v.type === "word" && (() => {
              const w = lessonData?.words.find((x) => x.id === (v as any).wordId);
              if (!w) return null;
              const articleColor = w.article === "der" ? "text-blue-500" : w.article === "die" ? "text-pink-500" : "text-green-500";
              return (
                <div className="min-h-[60vh] flex flex-col items-center justify-center text-center gap-8">
                  <div>
                    {w.article && <div className={`text-3xl lg:text-5xl font-display font-bold mb-3 ${articleColor}`}>{w.article}</div>}
                    <div className="text-6xl lg:text-8xl font-display font-black">{w.german}</div>
                  </div>
                  {(v as any).revealTranslation && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-3xl lg:text-4xl text-muted-foreground">
                      {w.russian}
                    </motion.div>
                  )}
                  {w.example && (v as any).revealTranslation && (
                    <p className="text-xl italic text-muted-foreground max-w-2xl">{w.example}</p>
                  )}
                </div>
              );
            })()}

            {v.type === "exercise" && (() => {
              const ex = lessonData?.exercises.find((x) => x.id === (v as any).exerciseId);
              if (!ex) return null;
              return (
                <div className="space-y-6">
                  <div className="text-sm font-bold text-primary uppercase tracking-wider">Упражнение</div>
                  <h2 className="text-2xl lg:text-4xl font-display font-black">{ex.question || ex.prompt}</h2>
                  {Array.isArray(ex.options) && (
                    <div className="grid gap-3">
                      {ex.options.map((opt: string, i: number) => (
                        <div key={i} className="px-6 py-4 rounded-2xl border-2 border-border text-xl bg-card">
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  )}
                  {(v as any).revealAnswer && ex.correct_answer && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-4 rounded-2xl bg-green-500/10 border-2 border-green-500/30 text-green-700 dark:text-green-400">
                      <strong>Правильный ответ:</strong> {ex.correct_answer}
                      {ex.explanation && <div className="text-sm mt-2 opacity-80">{ex.explanation}</div>}
                    </motion.div>
                  )}
                </div>
              );
            })()}

            {v.type === "whiteboard" && (
              <WhiteboardView strokes={session.whiteboard || []} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Highlight cursor / pointer from teacher */}
      {highlight?.visible && (
        <motion.div
          className="fixed pointer-events-none z-50"
          animate={{ left: `${highlight.x}%`, top: `${highlight.y}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-primary/30 animate-ping absolute" />
            <div className="w-12 h-12 rounded-full bg-primary border-4 border-background relative" />
            {highlight.label && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-bold whitespace-nowrap">
                {highlight.label}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const WhiteboardView = ({ strokes }: { strokes: any[] }) => (
  <div className="w-full aspect-[16/10] rounded-3xl bg-card border-2 border-border relative overflow-hidden">
    <svg viewBox="0 0 1600 1000" className="w-full h-full">
      {strokes.map((s, i) => {
        if (s.type === "path" && s.d) {
          return <path key={i} d={s.d} stroke={s.color || "currentColor"} strokeWidth={s.width || 4} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
        }
        if (s.type === "text") {
          return <text key={i} x={s.x} y={s.y} fontSize={s.size || 32} fill={s.color || "currentColor"} fontFamily="sans-serif">{s.text}</text>;
        }
        return null;
      })}
    </svg>
  </div>
);

export default StudentView;
