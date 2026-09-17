import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Monitor, X, Copy, Crosshair, Pencil, ChevronLeft, ChevronRight, Sparkles, Clock,
  ListChecks, MessageCircle, ExternalLink, StickyNote, Trash2, Send,
  Presentation as PresIcon, Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startOrResumeSession, updateSession, endSession, type LiveSession, type ViewType } from "@/lib/presenter-session";
import TeacherAIAssistant from "./TeacherAIAssistant";
import SessionChat from "./SessionChat";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import { blockLabel } from "@/components/blocks/BlockRenderer";
import type { LessonBlock } from "@/components/blocks/types";
import PresentationView from "./PresentationView";
import { listPresentations, uploadPresentation, type Presentation as Pres } from "@/lib/presentations";
import { PandaLookupDialog } from "@/components/dictionary/PandaLookup";

interface Props {
  lesson: any;
  words?: any[];
  exercises?: any[];
  readingTasks?: any[];
  studentName: string;
  studentProfile: any;
  onClose: () => void;
}

type Tab = "board" | "slides" | "blocks";

const PresenterMode = ({ lesson, exercises = [], studentName, studentProfile, onClose }: Props) => {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [view, setView] = useState<ViewType>({ type: "whiteboard" });
  const [tab, setTab] = useState<Tab>("board");
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
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [presentations, setPresentations] = useState<Pres[]>([]);
  const [presBusy, setPresBusy] = useState<string | null>(null);
  const presFileRef = useRef<HTMLInputElement>(null);
  const [dictOpen, setDictOpen] = useState(false);

  // Локальний вибір викладача (учень бачить лише після «Перенести учня сюди»)
  const [presId, setPresId] = useState<string | null>(null);
  const [presPage, setPresPage] = useState(1);
  const [blockId, setBlockId] = useState<string | null>(null);

  useEffect(() => {
    listPresentations().then(setPresentations).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("tutoring_lesson_blocks")
        .select("*")
        .eq("lesson_id", lesson.id)
        .eq("visible_to_student", true)
        .order("sort_order");
      if (alive) setBlocks(((data ?? []) as any[]).map((b) => ({ ...b, payload: b.payload ?? {} })) as LessonBlock[]);
    })();
    return () => { alive = false; };
  }, [lesson.id]);

  // Init session
  useEffect(() => {
    (async () => {
      try {
        const s = await startOrResumeSession({
          id: lesson.id, teacher_id: lesson.teacher_id, student_id: lesson.student_id,
        });
        setSession(s);
        const cv = (s.current_view as any) || { type: "whiteboard" };
        setView(cv);
        setStrokes(s.whiteboard || []);
        if (cv.type === "slide") { setTab("slides"); setPresId(cv.presentationId); setPresPage(cv.page || 1); }
        else if (cv.type === "block") { setTab("blocks"); setBlockId(cv.blockId); }
      } catch (e: any) {
        toast.error("Не вдалося відкрити сесію: " + e.message);
      }
    })();
    const saved = localStorage.getItem(`presenter-notes-${lesson.id}`);
    if (saved) setNotes(saved);
  }, [lesson.id]);

  useEffect(() => {
    if (!session?.id) return;
    const ch = supabase
      .channel(`presenter-${session.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tutoring_live_sessions", filter: `id=eq.${session.id}` },
        (payload) => setSession((prev) => ({ ...(prev as any), ...(payload.new as any) })),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.id]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (notes) localStorage.setItem(`presenter-notes-${lesson.id}`, notes);
  }, [notes, lesson.id]);

  const pushView = async (v: ViewType) => {
    setView(v);
    if (session) await updateSession(session.id, { current_view: v });
  };

  const pushHighlight = async (x: number, y: number, visible: boolean, label?: string) => {
    if (session) await updateSession(session.id, { highlight: { x, y, visible, label } as any });
  };

  const activePres = presentations.find((p) => p.id === presId) || null;
  const activeBlock = blocks.find((b) => b.id === blockId) || null;

  // Чи учень уже дивиться те саме
  const studentHere =
    (tab === "board" && view.type === "whiteboard") ||
    (tab === "slides" && view.type === "slide" && (view as any).presentationId === presId) ||
    (tab === "blocks" && view.type === "block" && (view as any).blockId === blockId);

  const moveStudentHere = async () => {
    if (tab === "board") { await pushView({ type: "whiteboard" }); toast.success("Учень на дошці"); return; }
    if (tab === "slides") {
      if (!activePres) { toast.error("Виберіть презентацію"); return; }
      await pushView({ type: "slide", presentationId: activePres.id, page: presPage });
      toast.success("Учень бачить презентацію 📊");
      return;
    }
    if (!activeBlock) { toast.error("Виберіть блок-завдання"); return; }
    await pushView({ type: "block", blockId: activeBlock.id });
    toast.success("Учень бачить блок-завдання ✍️");
  };

  const stepSlide = (delta: number) => {
    if (!activePres) return;
    const next = Math.min(Math.max(1, presPage + delta), activePres.page_count || 1);
    if (next === presPage) return;
    setPresPage(next);
    // якщо учень уже на цій презентації — гортаємо і в нього
    if (view.type === "slide" && (view as any).presentationId === activePres.id) {
      pushView({ type: "slide", presentationId: activePres.id, page: next });
    }
  };

  const uploadPres = async (files: FileList | null) => {
    if (!files?.length) return;
    const file = files[0];
    if (!/\.pdf$/i.test(file.name)) {
      toast.error("Підтримуємо PDF — збережіть презентацію як PDF");
      return;
    }
    try {
      setPresBusy("Готуємо слайди…");
      const p = await uploadPresentation({ ownerId: lesson.teacher_id, file, onProgress: (t) => setPresBusy(t) });
      setPresentations((prev) => [p, ...prev]);
      setPresId(p.id);
      setPresPage(1);
      setTab("slides");
      toast.success("Презентацію додано 🐼 Тепер «Перенести учня сюди»");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setPresBusy(null);
    }
  };

  const openStudentWindow = () => {
    if (!session) return;
    const url = `${window.location.origin}/student-view/${session.id}`;
    setStudentWindow(window.open(url, `student-view-${session.id}`, "width=1280,height=800"));
  };

  const copyStudentLink = () => {
    if (!session) return;
    navigator.clipboard.writeText(`${window.location.origin}/student-view/${session.id}`);
    toast.success("Посилання скопійовано — надішліть учню");
  };

  const closePresenter = async () => {
    if (session) await endSession(session.id);
    if (studentWindow && !studentWindow.closed) studentWindow.close();
    onClose();
  };

  const handlePreviewMove = (e: React.MouseEvent) => {
    if (!highlightOn || !previewRef.current) return;
    const r = previewRef.current.getBoundingClientRect();
    pushHighlight(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100, true);
  };
  const handlePreviewLeave = () => { if (highlightOn) pushHighlight(0, 0, false); };

  // Дошка
  const svgPoint = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 1600, y: ((e.clientY - r.top) / r.height) * 1000 };
  };
  const wbStart = (e: React.PointerEvent<SVGSVGElement>) => {
    setDrawing(true);
    const { x, y } = svgPoint(e);
    currentPath.current = `M ${x} ${y}`;
  };
  const wbMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing) return;
    const { x, y } = svgPoint(e);
    currentPath.current += ` L ${x} ${y}`;
    setStrokes((prev) => {
      const last = prev[prev.length - 1];
      if (last?.tmp) return [...prev.slice(0, -1), { ...last, d: currentPath.current }];
      return [...prev, { type: "path", d: currentPath.current, color: "hsl(var(--primary))", width: 4, tmp: true }];
    });
  };
  const wbEnd = async () => {
    if (!drawing) return;
    setDrawing(false);
    const newStrokes = strokes.map((s) => (s.tmp ? { ...s, tmp: false } : s));
    setStrokes(newStrokes);
    if (session) await updateSession(session.id, { whiteboard: newStrokes as any });
  };
  const clearWB = async () => {
    setStrokes([]);
    if (session) await updateSession(session.id, { whiteboard: [] as any });
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const TABS: { key: Tab; label: string; icon: any }[] = [
    { key: "board", label: "Дошка", icon: Pencil },
    { key: "slides", label: "Презентація", icon: PresIcon },
    { key: "blocks", label: "Блок-завдання", icon: ListChecks },
  ];

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
            <div className="font-display font-black text-base leading-none">Живий урок</div>
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
          <Button size="sm" variant="outline" onClick={() => setDictOpen(true)} className="gap-1.5">🐼 Словник</Button>
          <Button size="sm" variant="outline" onClick={copyStudentLink} className="gap-1.5">
            <Copy className="w-3.5 h-3.5" /> Посилання
          </Button>
          <Button size="sm" variant="outline" onClick={openStudentWindow} className="gap-1.5">
            <ExternalLink className="w-3.5 h-3.5" /> Вікно учня
          </Button>
          <Button size="sm" variant="ghost" onClick={closePresenter} className="gap-1.5 text-destructive">
            <X className="w-4 h-4" /> Завершити
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card/60">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 transition ${
              tab === key ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Учень зараз: <strong>{view.type === "whiteboard" ? "Дошка" : view.type === "slide" ? "Презентація" : view.type === "block" ? "Блок-завдання" : "Очікує"}</strong>
          </span>
          <Button size="sm" onClick={moveStudentHere} disabled={studentHere} className="gap-1.5">
            <Send className="w-3.5 h-3.5" /> {studentHere ? "Учень уже тут" : "Перенести учня сюди"}
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden">
        {/* LEFT: content of active tab */}
        <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
          {tab === "board" && (
            <PanelCard title="Дошка" icon={<Pencil className="w-4 h-4" />}>
              <p className="text-xs text-muted-foreground p-1">
                Малюйте прямо у вікні праворуч — учень бачить те саме одразу.
              </p>
              <Button size="sm" variant="outline" className="w-full mt-2 gap-1.5" onClick={clearWB}>
                <Trash2 className="w-3.5 h-3.5" /> Очистити дошку
              </Button>
            </PanelCard>
          )}

          {tab === "slides" && (
            <PanelCard
              title={`Презентації (${presentations.length})`}
              icon={<PresIcon className="w-4 h-4" />}
              actions={
                <>
                  <input ref={presFileRef} type="file" accept="application/pdf" className="hidden"
                    onChange={(e) => uploadPres(e.target.files)} />
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" disabled={!!presBusy}
                    onClick={() => presFileRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5" /> PDF
                  </Button>
                </>
              }
              grow scroll
            >
              {presBusy && <div className="text-xs text-primary font-bold px-2 pb-1">{presBusy}</div>}
              <div className="space-y-1">
                {presentations.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setPresId(p.id); setPresPage(1); }}
                    className={`w-full text-left rounded-lg border px-2.5 py-2 text-sm ${
                      presId === p.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    📊 {p.title}
                    <span className="text-xs text-muted-foreground ml-1.5">{p.page_count} сл.</span>
                  </button>
                ))}
                {presentations.length === 0 && (
                  <div className="text-xs text-muted-foreground p-2">
                    Немає презентацій. Додайте PDF кнопкою вище або в розділі «Презентації».
                  </div>
                )}
              </div>
            </PanelCard>
          )}

          {tab === "blocks" && (
            <PanelCard title={`Блок-завдання (${blocks.length})`} icon={<ListChecks className="w-4 h-4" />} grow scroll>
              <div className="space-y-1">
                {blocks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setBlockId(b.id)}
                    className={`w-full text-left rounded-lg border px-2.5 py-2 text-sm ${
                      blockId === b.id ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    {blockLabel(b)}
                  </button>
                ))}
                {blocks.length === 0 && (
                  <div className="text-xs text-muted-foreground p-2">
                    Немає блоків. Додайте їх у вкладці «Блоки» уроку або з бібліотеки уроків.
                  </div>
                )}
              </div>
            </PanelCard>
          )}
        </div>

        {/* CENTER */}
        <div className="col-span-6 flex flex-col gap-3 overflow-hidden">
          <PanelCard
            title={tab === "board" ? "Дошка" : tab === "slides" ? "Презентація" : "Блок-завдання"}
            icon={<Monitor className="w-4 h-4" />}
            actions={
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant={highlightOn ? "default" : "outline"} className="h-7 gap-1.5"
                  onClick={() => { setHighlightOn((v) => !v); if (highlightOn) pushHighlight(0, 0, false); }}>
                  <Crosshair className="w-3.5 h-3.5" /> Указка
                </Button>
                {tab === "slides" && activePres && (
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => stepSlide(-1)}>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs font-bold text-muted-foreground">{presPage} / {activePres.page_count}</span>
                    <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => stepSlide(1)}>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
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
              {tab === "board" && (
                <svg viewBox="0 0 1600 1000" className="w-full h-full bg-background touch-none"
                  onPointerDown={wbStart} onPointerMove={wbMove} onPointerUp={wbEnd} onPointerLeave={wbEnd}>
                  {strokes.map((s: any, i: number) => s.type === "path" && (
                    <path key={i} d={s.d} stroke={s.color || "hsl(var(--primary))"} strokeWidth={s.width || 4}
                      fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  ))}
                </svg>
              )}
              {tab === "slides" && (activePres
                ? <PresentationView presentationId={activePres.id} page={presPage} compact />
                : <EmptyHint text="Виберіть презентацію або додайте PDF" />)}
              {tab === "blocks" && (activeBlock
                ? <div className="p-4"><StudentBlocks blocks={[activeBlock]} persist={false} showActions /></div>
                : <EmptyHint text="Виберіть блок-завдання" />)}
            </div>
          </PanelCard>
        </div>

        {/* RIGHT */}
        <div className="col-span-3 flex flex-col gap-3 overflow-hidden">
          <PanelCard title="Профіль учня" icon={<Sparkles className="w-4 h-4" />}>
            <div className="text-xs space-y-1">
              <div><strong>{studentProfile?.display_name || studentName}</strong></div>
              <div className="text-muted-foreground">Рівень: <strong>{studentProfile?.recommended_level || "A1"}</strong></div>
            </div>
          </PanelCard>

          <LiveFeedbackPanel session={session} exercises={exercises} />

          <PanelCard title="Чат з учнем" icon={<MessageCircle className="w-4 h-4" />}>
            <SessionChat sessionId={session?.id} role="teacher" compact />
          </PanelCard>

          <PanelCard title="Замітки (приватно)" icon={<StickyNote className="w-4 h-4" />} grow>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="План уроку, що спитати, домашка…"
              className="resize-none h-full min-h-[100px] text-sm bg-background" />
          </PanelCard>

          <Button onClick={() => setAiOpen(true)} className="gap-2 w-full">
            <Sparkles className="w-4 h-4" /> AI-асистент
          </Button>
        </div>
      </div>

      {aiOpen && (
        <TeacherAIAssistant open={aiOpen} onOpenChange={setAiOpen} studentId={lesson.student_id} studentName={studentName} />
      )}
      <PandaLookupDialog open={dictOpen} onOpenChange={setDictOpen} />
    </motion.div>
  );
};

const EmptyHint = ({ text }: { text: string }) => (
  <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-6 text-center">{text}</div>
);

const PanelCard = ({ title, icon, children, actions, scroll, grow }: any) => (
  <div className={`rounded-2xl bg-card border border-border flex flex-col overflow-hidden ${grow ? "flex-1" : ""}`}>
    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {icon} {title}
      </div>
      {actions}
    </div>
    <div className={`p-2 ${scroll || grow ? "overflow-auto" : ""} ${grow ? "flex-1" : ""}`}>{children}</div>
  </div>
);

const LiveFeedbackPanel = ({ session, exercises }: { session: any; exercises: any[] }) => {
  const response = session?.student_response as { view?: any; answer?: string; at?: string } | null;
  const exId = response?.view?.exerciseId;
  const ex = exId ? exercises.find((e) => e.id === exId) : null;

  return (
    <PanelCard title="Live учня" icon={<MessageCircle className="w-4 h-4" />}>
      <div className="space-y-2 text-xs">
        {response?.answer ? (
          <div className="rounded-lg border border-border bg-background p-2.5 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Відповідь учня</div>
            <div className="text-sm font-medium break-words">{response.answer}</div>
            {ex?.correct_answer && (
              <div className="text-[10px] text-muted-foreground">Правильно: {ex.correct_answer}</div>
            )}
          </div>
        ) : (
          <div className="text-muted-foreground italic">Учень ще не відповідав</div>
        )}
      </div>
    </PanelCard>
  );
};

export default PresenterMode;
