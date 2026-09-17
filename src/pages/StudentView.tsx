import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, Hand, ThumbsUp, HelpCircle, Flame, Pencil, ListChecks, Presentation as PresIcon } from "lucide-react";
import SessionChat from "@/components/tutoring/SessionChat";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import PandaLookupFab from "@/components/dictionary/PandaLookup";
import PresentationView from "@/components/tutoring/PresentationView";
import { toast } from "sonner";

/**
 * Чиста сторінка учня під час живого уроку.
 * Три види: дошка, презентація, блок-завдання — перемикає викладач.
 */

type Reaction = { type: "hand" | "thumbs_up" | "confused" | "fire"; at: string };

const REACTIONS: { type: Reaction["type"]; Icon: any; label: string; color: string }[] = [
  { type: "hand", Icon: Hand, label: "Рука", color: "bg-yellow-500" },
  { type: "thumbs_up", Icon: ThumbsUp, label: "Ясно", color: "bg-emerald-500" },
  { type: "confused", Icon: HelpCircle, label: "Не зрозумів", color: "bg-orange-500" },
  { type: "fire", Icon: Flame, label: "Вогонь", color: "bg-pink-500" },
];

const StudentView = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState<any>(null);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReaction, setActiveReaction] = useState<Reaction["type"] | null>(null);

  const viewKey = useMemo(
    () => (session?.current_view ? JSON.stringify(session.current_view) : ""),
    [session?.current_view],
  );

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

      const { data: bl } = await supabase
        .from("tutoring_lesson_blocks")
        .select("*")
        .eq("lesson_id", s.lesson_id)
        .eq("visible_to_student", true)
        .order("sort_order");
      if (!mounted) return;
      setBlocks(bl || []);
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

  const report = async (text: string) => {
    if (!sessionId) return;
    const { error } = await supabase
      .from("tutoring_live_sessions")
      .update({ student_response: { view: session?.current_view, answer: text, at: new Date().toISOString() } as any })
      .eq("id", sessionId);
    if (error) toast.error(error.message);
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
        <h1 className="text-2xl font-display font-black">Урок завершено</h1>
        <p className="text-muted-foreground">Дякуємо за роботу!</p>
        <button
          onClick={() => (window.location.href = "/assignments")}
          className="mt-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold"
        >
          До моїх завдань
        </button>
      </div>
    );
  }

  const raw = session.current_view || { type: "whiteboard" };
  const v = raw.type === "slide" || raw.type === "block" ? raw : { type: "whiteboard" as const };
  const highlight = session.highlight;

  const label = v.type === "slide" ? "Презентація" : v.type === "block" ? "Завдання" : "Дошка";
  const LabelIcon = v.type === "slide" ? PresIcon : v.type === "block" ? ListChecks : Pencil;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 z-20 px-6 py-3 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-bold text-foreground">LIVE • Урок</span>
          <span className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold">
            <LabelIcon className="w-3.5 h-3.5" /> {label}
          </span>
        </div>
      </div>

      <div className="pt-20 pb-40 px-4 lg:px-12 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewKey}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {v.type === "whiteboard" && <WhiteboardView strokes={session.whiteboard || []} />}

            {v.type === "slide" && (
              <div className="h-[75vh]">
                <PresentationView presentationId={(v as any).presentationId} page={(v as any).page} />
              </div>
            )}

            {v.type === "block" && (() => {
              const bl = blocks.find((x: any) => x.id === (v as any).blockId);
              if (!bl) return <div className="text-muted-foreground">Завдання ще готується…</div>;
              return (
                <StudentBlocks
                  blocks={[bl]}
                  studentId={session?.student_id || null}
                  showActions
                  onSubmitted={(score, max) => report(`Блок готовий: ${score}/${max}`)}
                />
              );
            })()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Лазерна указка вчителя */}
      {highlight?.visible && (
        <motion.div
          className="fixed pointer-events-none z-50"
          animate={{ left: `${highlight.x}%`, top: `${highlight.y}%` }}
          transition={{ type: "spring", stiffness: 400, damping: 30, mass: 0.3 }}
          style={{ transform: "translate(-50%, -50%)" }}
        >
          <div className="relative w-6 h-6 flex items-center justify-center">
            <div className="absolute w-10 h-10 rounded-full bg-red-500/25 blur-md animate-pulse" />
            <div
              className="relative w-3.5 h-3.5 rounded-full bg-red-600"
              style={{ boxShadow: "0 0 10px 4px rgba(239,68,68,0.75), 0 0 24px 10px rgba(239,68,68,0.35)" }}
            />
          </div>
        </motion.div>
      )}

      {/* Реакції */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
        <div className="flex items-center gap-2 px-3 py-2 rounded-full bg-card/95 backdrop-blur-md border border-border shadow-lg">
          {REACTIONS.map(({ type, Icon, label: rl, color }) => {
            const active = activeReaction === type;
            return (
              <button
                key={type}
                onClick={() => sendReaction(type)}
                aria-label={rl}
                title={rl}
                className={`relative w-12 h-12 rounded-full flex items-center justify-center transition active:scale-90 ${
                  active ? `${color} text-white shadow-md` : "bg-background hover:bg-muted text-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </div>

      <PandaLookupFab label="Словник" />
      <SessionChat sessionId={sessionId} role="student" />
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
