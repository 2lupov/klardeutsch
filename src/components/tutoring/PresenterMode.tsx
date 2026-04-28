import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, X, Copy, Crosshair, Pencil, Eraser, Eye, EyeOff,
  ChevronLeft, ChevronRight, Sparkles, Clock, FileText, BookOpen,
  ListChecks, MessageSquare, ExternalLink, StickyNote, Trash2, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startOrResumeSession, updateSession, endSession, type LiveSession, type ViewType } from "@/lib/presenter-session";
import TeacherAIAssistant from "./TeacherAIAssistant";

interface Props {
  lesson: any;
  words: any[];
  exercises: any[];
  studentName: string;
  studentProfile: any;
  onClose: () => void;
}

const PresenterMode = ({ lesson, words, exercises, studentName, studentProfile, onClose }: Props) => {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [view, setView] = useState<ViewType>({ type: "welcome" });
  const [highlightOn, setHighlightOn] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [strokes, setStrokes] = useState<any[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [studentWindow, setStudentWindow] = useState<Window | null>(null);
  const startedAt = useRef(Date.now());
  const previewRef = useRef<HTMLDivElement>(null);
  const currentPath = useRef<string>("");

  // Init session
  useEffect(() => {
    (async () => {
      try {
        const s = await startOrResumeSession({
          id: lesson.id, teacher_id: lesson.teacher_id, student_id: lesson.student_id,
        });
        setSession(s);
        setView(s.current_view || { type: "welcome" });
        setStrokes(s.whiteboard || []);
      } catch (e: any) {
        toast.error("Не удалось открыть сессию: " + e.message);
      }
    })();
    // Load saved notes from localStorage
    const saved = localStorage.getItem(`presenter-notes-${lesson.id}`);
    if (saved) setNotes(saved);
  }, [lesson.id]);

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  // Save notes locally
  useEffect(() => {
    if (notes) localStorage.setItem(`presenter-notes-${lesson.id}`, notes);
  }, [notes, lesson.id]);

  // Push view changes
  const pushView = async (v: ViewType) => {
    setView(v);
    if (session) await updateSession(session.id, { current_view: v });
  };

  const pushHighlight = async (x: number, y: number, visible: boolean, label?: string) => {
    if (session) await updateSession(session.id, { highlight: { x, y, visible, label } as any });
  };

  // Open student window
  const openStudentWindow = () => {
    if (!session) return;
    const url = `${window.location.origin}/student-view/${session.id}`;
    const w = window.open(url, `student-view-${session.id}`, "width=1280,height=800");
    setStudentWindow(w);
  };

  const copyStudentLink = () => {
    if (!session) return;
    navigator.clipboard.writeText(`${window.location.origin}/student-view/${session.id}`);
    toast.success("Ссылка скопирована — отправьте ученику");
  };

  const closePresenter = async () => {
    if (session) await endSession(session.id);
    if (studentWindow && !studentWindow.closed) studentWindow.close();
    onClose();
  };

  // Highlight handler on preview area
  const handlePreviewMove = (e: React.MouseEvent) => {
    if (!highlightOn || !previewRef.current) return;
    const r = previewRef.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    pushHighlight(x, y, true);
  };
  const handlePreviewLeave = () => { if (highlightOn) pushHighlight(0, 0, false); };

  // Whiteboard drawing (only when view = whiteboard)
  const wbStart = (e: React.PointerEvent<SVGSVGElement>) => {
    if (view.type !== "whiteboard") return;
    setDrawing(true);
    const { x, y } = svgPoint(e);
    currentPath.current = `M ${x} ${y}`;
  };
  const wbMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing || view.type !== "whiteboard") return;
    const { x, y } = svgPoint(e);
    currentPath.current += ` L ${x} ${y}`;
    // local immediate
    setStrokes((prev) => {
      const last = prev[prev.length - 1];
      if (last?.tmp) return [...prev.slice(0, -1), { ...last, d: currentPath.current }];
      return [...prev, { type: "path", d: currentPath.current, color: "hsl(var(--primary))", width: 4, tmp: true }];
    });
  };
  const wbEnd = async () => {
    if (!drawing) return;
    setDrawing(false);
    const newStrokes = strokes.map((s) => s.tmp ? { ...s, tmp: false } : s);
    setStrokes(newStrokes);
    if (session) await updateSession(session.id, { whiteboard: newStrokes as any });
  };
  const clearWB = async () => {
    setStrokes([]);
    if (session) await updateSession(session.id, { whiteboard: [] as any });
  };
  const svgPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const r = svg.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 1600, y: ((e.clientY - r.top) / r.height) * 1000 };
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-display font-black text-base leading-none">Presenter Mode</div>
            <div className="text-xs text-muted-foreground mt-0.5">{lesson.title} • {studentName}</div>
          </div>
          <div className="ml-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> LIVE
          </div>
          <div className="flex items-center gap-1.5 text-sm font-mono text-muted-foreground">
            <Clock className="w-3.5 h-3.5" /> {fmtTime(elapsed)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={copyStudentLink} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" /> Ссылка
          </Button>
          <Button size="sm" variant="outline" onClick={openStudentWindow} className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Окно ученика
          </Button>
          <Button size="sm" variant="ghost" onClick={closePresenter} className="gap-1.5 text-destructive">
            <X className="w-4 h-4" /> Завершить
          </Button>
        </div>
      </div>

      {/* Body: 3 panels */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* LEFT: navigation of content */}
        <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
          <PanelCard title="Что показать" icon={<ListChecks className="w-4 h-4" />}>
            <div className="space-y-1">
              <NavBtn active={view.type === "welcome"} onClick={() => pushView({ type: "welcome" })}>
                👋 Приветствие
              </NavBtn>
              <NavBtn active={view.type === "theory"} onClick={() => pushView({ type: "theory" })}>
                <FileText className="w-3.5 h-3.5" /> Теория
              </NavBtn>
              <NavBtn active={view.type === "whiteboard"} onClick={() => pushView({ type: "whiteboard" })}>
                <Pencil className="w-3.5 h-3.5" /> Доска
              </NavBtn>
            </div>
          </PanelCard>

          <PanelCard title={`Слова (${words.length})`} icon={<BookOpen className="w-4 h-4" />} scroll>
            <div className="space-y-1">
              {words.map((w) => {
                const active = view.type === "word" && view.wordId === w.id;
                return (
                  <div key={w.id} className={`group rounded-lg border ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"} px-2.5 py-2 text-sm`}>
                    <button className="w-full text-left" onClick={() => pushView({ type: "word", wordId: w.id, revealTranslation: false })}>
                      <span className="font-bold">{w.german}</span>
                      <span className="text-muted-foreground text-xs ml-2">{w.russian}</span>
                    </button>
                    {active && (
                      <Button size="sm" variant="ghost" className="h-6 px-2 mt-1 text-xs gap-1"
                        onClick={() => pushView({ type: "word", wordId: w.id, revealTranslation: !(view as any).revealTranslation })}>
                        {(view as any).revealTranslation ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {(view as any).revealTranslation ? "Скрыть перевод" : "Показать перевод"}
                      </Button>
                    )}
                  </div>
                );
              })}
              {words.length === 0 && <div className="text-xs text-muted-foreground p-2">Нет слов</div>}
            </div>
          </PanelCard>

          <PanelCard title={`Упражнения (${exercises.length})`} icon={<ListChecks className="w-4 h-4" />} scroll>
            <div className="space-y-1">
              {exercises.map((ex, i) => {
                const active = view.type === "exercise" && view.exerciseId === ex.id;
                return (
                  <div key={ex.id} className={`rounded-lg border ${active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"} px-2.5 py-2 text-sm`}>
                    <button className="w-full text-left" onClick={() => pushView({ type: "exercise", exerciseId: ex.id, revealAnswer: false })}>
                      <span className="text-xs text-muted-foreground">#{i + 1}</span> {ex.question || ex.prompt}
                    </button>
                    {active && (
                      <Button size="sm" variant="ghost" className="h-6 px-2 mt-1 text-xs gap-1"
                        onClick={() => pushView({ type: "exercise", exerciseId: ex.id, revealAnswer: !(view as any).revealAnswer })}>
                        {(view as any).revealAnswer ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {(view as any).revealAnswer ? "Скрыть ответ" : "Показать ответ"}
                      </Button>
                    )}
                  </div>
                );
              })}
              {exercises.length === 0 && <div className="text-xs text-muted-foreground p-2">Нет упражнений</div>}
            </div>
          </PanelCard>
        </div>

        {/* CENTER: preview = что видит ученик */}
        <div className="col-span-6 flex flex-col gap-3 overflow-hidden">
          <PanelCard
            title="То, что видит ученик"
            icon={<Monitor className="w-4 h-4" />}
            actions={
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant={highlightOn ? "default" : "outline"} className="h-7 gap-1.5" onClick={() => { setHighlightOn((v) => !v); if (highlightOn) pushHighlight(0, 0, false); }}>
                  <Crosshair className="w-3.5 h-3.5" /> Указка
                </Button>
                {view.type === "whiteboard" && (
                  <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={clearWB}>
                    <Trash2 className="w-3.5 h-3.5" /> Очистить
                  </Button>
                )}
              </div>
            }
            grow
          >
            <div
              ref={previewRef}
              onMouseMove={handlePreviewMove}
              onMouseLeave={handlePreviewLeave}
              className={`w-full h-full rounded-xl bg-background border-2 border-dashed border-border relative overflow-auto ${highlightOn ? "cursor-crosshair" : ""}`}
            >
              <PreviewContent view={view} words={words} exercises={exercises} theory={lesson.theory || ""}
                strokes={strokes} drawing={drawing}
                onWBStart={wbStart} onWBMove={wbMove} onWBEnd={wbEnd}
              />
            </div>
          </PanelCard>
        </div>

        {/* RIGHT: AI + notes + student */}
        <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
          <PanelCard title="Профиль ученика" icon={<Sparkles className="w-4 h-4" />}>
            <div className="text-xs space-y-1">
              <div><strong>{studentProfile?.display_name || studentName}</strong></div>
              <div className="text-muted-foreground">Уровень: <strong>{studentProfile?.recommended_level || "A1"}</strong></div>
              {studentProfile?.age && <div className="text-muted-foreground">Возраст: <strong>{studentProfile.age} л.</strong></div>}
              {studentProfile?.is_kid && <div className="px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-700 inline-block text-[10px] font-bold">🧒 Kid Mode</div>}
            </div>
          </PanelCard>

          <PanelCard title="Заметки (приватно)" icon={<StickyNote className="w-4 h-4" />} grow>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="План урока, что спросить, домашка…"
              className="resize-none h-full min-h-[120px] text-sm bg-background" />
          </PanelCard>

          <Button onClick={() => setAiOpen(true)} className="gap-2 w-full">
            <Sparkles className="w-4 h-4" /> AI-ассистент
          </Button>
        </div>
      </div>

      {/* AI dialog */}
      {aiOpen && (
        <TeacherAIAssistant
          open={aiOpen}
          onOpenChange={setAiOpen}
          studentId={lesson.student_id}
          studentName={studentName}
        />
      )}
    </motion.div>
  );
};

const PanelCard = ({ title, icon, children, actions, scroll, grow }: any) => (
  <div className={`rounded-2xl bg-card border border-border flex flex-col overflow-hidden ${grow ? "flex-1" : ""}`}>
    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      {actions}
    </div>
    <div className={`p-2 ${scroll || grow ? "overflow-auto" : ""} ${grow ? "flex-1" : ""}`}>
      {children}
    </div>
  </div>
);

const NavBtn = ({ active, onClick, children }: any) => (
  <button onClick={onClick}
    className={`w-full text-left px-2.5 py-2 rounded-lg text-sm flex items-center gap-1.5 transition ${active ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
    {children}
  </button>
);

const PreviewContent = ({ view, words, exercises, theory, strokes, onWBStart, onWBMove, onWBEnd }: any) => {
  if (view.type === "welcome") {
    return <div className="h-full flex items-center justify-center text-center p-8 text-muted-foreground">
      <div><Sparkles className="w-10 h-10 mx-auto mb-3 text-primary" /><div className="font-display font-bold text-lg">Готовы начать?</div></div>
    </div>;
  }
  if (view.type === "theory") return <div className="p-6 whitespace-pre-wrap text-base">{theory || "Теория не задана"}</div>;
  if (view.type === "word") {
    const w = words.find((x: any) => x.id === view.wordId);
    if (!w) return <div className="p-4 text-muted-foreground">Слово не найдено</div>;
    const ac = w.article === "der" ? "text-blue-500" : w.article === "die" ? "text-pink-500" : "text-green-500";
    return <div className="h-full flex flex-col items-center justify-center text-center p-6 gap-4">
      {w.article && <div className={`text-xl font-bold ${ac}`}>{w.article}</div>}
      <div className="text-4xl font-display font-black">{w.german}</div>
      {view.revealTranslation && <div className="text-2xl text-muted-foreground">{w.russian}</div>}
    </div>;
  }
  if (view.type === "exercise") {
    const ex = exercises.find((x: any) => x.id === view.exerciseId);
    if (!ex) return <div className="p-4 text-muted-foreground">Упражнение не найдено</div>;
    return <div className="p-6 space-y-4">
      <div className="text-xs font-bold text-primary uppercase">Упражнение</div>
      <h3 className="text-xl font-bold">{ex.question || ex.prompt}</h3>
      {Array.isArray(ex.options) && ex.options.map((o: string, i: number) => (
        <div key={i} className="px-4 py-2 rounded-lg border border-border">{String.fromCharCode(65 + i)}. {o}</div>
      ))}
      {view.revealAnswer && ex.correct_answer && (
        <div className="px-4 py-2 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/30">✓ {ex.correct_answer}</div>
      )}
    </div>;
  }
  if (view.type === "whiteboard") {
    return (
      <svg viewBox="0 0 1600 1000" className="w-full h-full bg-background touch-none"
        onPointerDown={onWBStart} onPointerMove={onWBMove} onPointerUp={onWBEnd} onPointerLeave={onWBEnd}>
        {strokes.map((s: any, i: number) => s.type === "path" && (
          <path key={i} d={s.d} stroke={s.color || "hsl(var(--primary))"} strokeWidth={s.width || 4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        ))}
      </svg>
    );
  }
  return null;
};

export default PresenterMode;
