import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Hand, ThumbsUp, HelpCircle, Flame, Send, Check } from "lucide-react";
import { toast } from "sonner";

/**
 * Полноэкранная "чистая" страница для ученика во время демонстрации.
 * Не содержит навигации, AI-чатов, заметок учителя.
 * Подписана на live session через Supabase Realtime.
 * Ученик может отвечать на упражнения и слать реакции учителю в реальном времени.
 */

type Reaction = { type: "hand" | "thumbs_up" | "confused" | "fire"; at: string };

const REACTIONS: { type: Reaction["type"]; Icon: any; label: string; color: string }[] = [
  { type: "hand", Icon: Hand, label: "Рука", color: "bg-yellow-500" },
  { type: "thumbs_up", Icon: ThumbsUp, label: "Ясно", color: "bg-emerald-500" },
  { type: "confused", Icon: HelpCircle, label: "Не понял", color: "bg-orange-500" },
  { type: "fire", Icon: Flame, label: "Огонь", color: "bg-pink-500" },
];

const StudentView = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState<any>(null);
  const [lessonData, setLessonData] = useState<{ words: any[]; exercises: any[]; theory: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState<string>("");
  const [submitted, setSubmitted] = useState(false);
  const [activeReaction, setActiveReaction] = useState<Reaction["type"] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset answer when teacher switches view
  const viewKey = useMemo(
    () => (session?.current_view ? JSON.stringify(session.current_view) : ""),
    [session?.current_view],
  );
  useEffect(() => {
    setAnswer("");
    setSubmitted(false);
  }, [viewKey]);

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

  const sendReaction = async (type: Reaction["type"]) => {
    if (!sessionId) return;
    setActiveReaction(type);
    setTimeout(() => setActiveReaction(null), 2500);
    await supabase
      .from("tutoring_live_sessions")
      .update({ student_reaction: { type, at: new Date().toISOString() } as any })
      .eq("id", sessionId);
  };

  const submitAnswer = async (value?: string) => {
    if (!sessionId) return;
    const final = (value ?? answer).trim();
    if (!final) return;
    const { error } = await supabase
      .from("tutoring_live_sessions")
      .update({
        student_response: {
          view: session?.current_view,
          answer: final,
          at: new Date().toISOString(),
        } as any,
      })
      .eq("id", sessionId);
    if (error) { toast.error(error.message); return; }
    setSubmitted(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }
  if (!session || session.status === "ended") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <Sparkles className="w-12 h-12 text-primary" />
        <h1 className="text-2xl font-display font-black">Урок завершён</h1>
        <p className="text-muted-foreground">Спасибо за работу!</p>
        <button
          onClick={() => (window.location.href = "/assignments")}
          className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold"
        >
          К моим заданиям
        </button>
      </div>
    );
  }

  const v = session.current_view || { type: "welcome" };
  const highlight = session.highlight;
  const currentExercise =
    v.type === "exercise" ? lessonData?.exercises.find((x) => x.id === (v as any).exerciseId) : null;
  const hasOptions = currentExercise && Array.isArray(currentExercise.options) && currentExercise.options.length > 0;

  return (
    <div ref={containerRef} className="min-h-screen bg-background relative overflow-hidden">
      {/* Top bar — minimal, only "LIVE" indicator */}
      <div className="fixed top-0 left-0 right-0 z-20 px-6 py-3 flex items-center justify-between bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-bold text-foreground">LIVE • Урок</span>
        </div>
      </div>

      <div className="pt-20 pb-40 px-6 lg:px-16 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
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

            {v.type === "exercise" && currentExercise && (
              <div className="space-y-6">
                <div className="text-sm font-bold text-primary uppercase tracking-wider">Упражнение</div>
                <h2 className="text-2xl lg:text-4xl font-display font-black">
                  {currentExercise.question || currentExercise.prompt}
                </h2>

                {hasOptions ? (
                  <div className="grid gap-3">
                    {currentExercise.options.map((opt: string, i: number) => {
                      const selected = answer === opt;
                      return (
                        <button
                          key={i}
                          disabled={submitted}
                          onClick={() => { setAnswer(opt); submitAnswer(opt); }}
                          className={`px-6 py-4 rounded-2xl border-2 text-xl text-left transition flex items-center gap-3 ${
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-border bg-card hover:border-primary/40"
                          } ${submitted && !selected ? "opacity-40" : ""}`}
                        >
                          <span className="font-bold text-muted-foreground">
                            {String.fromCharCode(65 + i)}.
                          </span>
                          <span className="flex-1">{opt}</span>
                          {selected && submitted && <Check className="w-5 h-5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      disabled={submitted}
                      placeholder="Введите ваш ответ…"
                      rows={3}
                      className="w-full px-5 py-4 rounded-2xl border-2 border-border bg-card text-xl resize-none focus:outline-none focus:border-primary transition disabled:opacity-60"
                    />
                    <button
                      onClick={() => submitAnswer()}
                      disabled={submitted || !answer.trim()}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-50 hover:bg-primary/90 transition"
                    >
                      {submitted ? <><Check className="w-5 h-5" /> Отправлено</> : <><Send className="w-5 h-5" /> Отправить</>}
                    </button>
                  </div>
                )}

                {(v as any).revealAnswer && currentExercise.correct_answer && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-6 py-4 rounded-2xl bg-green-500/10 border-2 border-green-500/30 text-green-700 dark:text-green-400">
                    <strong>Правильный ответ:</strong> {currentExercise.correct_answer}
                    {currentExercise.explanation && <div className="text-sm mt-2 opacity-80">{currentExercise.explanation}</div>}
                  </motion.div>
                )}
              </div>
            )}

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

      {/* Floating reaction bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-lg">
          {REACTIONS.map(({ type, Icon, label, color }) => {
            const active = activeReaction === type;
            return (
              <button
                key={type}
                onClick={() => sendReaction(type)}
                aria-label={label}
                title={label}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 ${
                  active ? `${color} text-white shadow-md` : "bg-background hover:bg-muted text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                {active && (
                  <motion.span
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], y: -32, scale: 1 }}
                    transition={{ duration: 1.2 }}
                    className="absolute text-2xl"
                  >
                    {type === "hand" ? "🙋" : type === "thumbs_up" ? "👍" : type === "confused" ? "🤔" : "🔥"}
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>
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
