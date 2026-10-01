import { assignPresentationHomework } from "@/lib/presentations";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { toast } from "@/hooks/use-toast";
import {
  LIVE_SECTIONS,
  LiveSection,
  LiveClass,
  LiveView,
  startLiveClass,
  endLiveClass,
  setLiveView,
} from "@/lib/live-class";
import { Play, Square, ChevronLeft, ChevronRight, Loader2, Upload, Crosshair, LogOut, Search } from "lucide-react";
import TextbookPanel from "@/components/textbook/TextbookPanel";
import LiveWriting from "@/components/live/LiveWriting";
import LiveReading from "@/components/live/LiveReading";
import LiveGrammar from "@/components/live/LiveGrammar";
import LiveNotes from "@/components/live/LiveNotes";
import LiveVideo from "@/components/live/LiveVideo";
import LiveSlidesPanel from "@/components/live/LiveSlidesPanel";
import BoardEditor, { type BoardApi } from "@/components/live/BoardEditor";
import LiveBookPagePicker from "@/components/books/LiveBookPagePicker";
import { PandaLookupDialog } from "@/components/dictionary/PandaLookup";
import { listPresentations, uploadPresentation, type Presentation } from "@/lib/presentations";
import PresentationView from "@/components/tutoring/PresentationView";
import { normalizeKit, kitSections, type LessonKit } from "@/lib/lesson-kits";
import LessonReader from "@/components/blocks/LessonReader";
import { LaserSurface, useLaserSender, type LaserPoint } from "@/components/live/LaserPointer";
import { Button } from "@/components/ui/button";

interface StudentRow { user_id: string; display_name: string | null; email: string | null }

export default function LiveClassPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("Живий урок");
  const [activeClass, setActiveClass] = useState<LiveClass | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: users } = await supabase.rpc("get_admin_users");
    setStudents(((users as any) || []).map((u: any) => ({ user_id: u.user_id, display_name: u.display_name, email: u.email })));
    if (user) {
      const { data } = await supabase
        .from("live_classes")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      setClasses(((data as any) || []) as LiveClass[]);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  // Відкриття уроку з картки учня
  useEffect(() => {
    const raw = sessionStorage.getItem("klar-open-live");
    if (!raw) return;
    sessionStorage.removeItem("klar-open-live");
    try {
      const o = JSON.parse(raw);
      if (o.classId) supabase.from("live_classes").select("*").eq("id", o.classId).maybeSingle().then(({ data }) => data && setActiveClass(data as any));
      else if (o.studentId) setStudentId(o.studentId);
    } catch { /* ignore */ }
  }, []);

  const start = async () => {
    if (!user || !studentId) { toast({ title: "Виберіть учня" }); return; }
    try {
      const c = await startLiveClass(user.id, studentId, title.trim() || "Живий урок");
      setActiveClass(c);
      load();
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    }
  };

  if (activeClass) {
    return (
      <TeacherConsole
        cls={activeClass}
        studentName={students.find((s) => s.user_id === activeClass.student_id)?.display_name || "Учень"}
        onExit={() => { setActiveClass(null); load(); }}
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6">
      <Card className="p-5">
        <SectionHeader title="Запустити живий урок" subtitle="Учень одразу потрапляє в клас — без демонстрації екрана" />
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          >
            <option value="">— Виберіть учня —</option>
            {students.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.display_name || s.email || s.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Назва уроку"
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <button
            onClick={start}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2"
            style={{ background: "#4F46E5" }}
          >
            <Play className="w-4 h-4" /> Запустити
          </button>
        </div>
      </Card>

      {classes.filter((c) => c.status === "active").length > 0 && (
        <Card className="p-5">
          <SectionHeader title="Активні зараз" subtitle="Історія уроків — у картці учня (розділ «Учні»)" />
          <div className="divide-y divide-slate-100">
            {classes.filter((c) => c.status === "active").map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                  <p className="text-xs text-slate-500">{students.find((s) => s.user_id === c.student_id)?.display_name || "Учень"}</p>
                </div>
                <button onClick={() => setActiveClass(c)} className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50">Продовжити</button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

async function ensurePresentationHomework(teacherId: string, studentId: string, presentationId: string) {
  try { await assignPresentationHomework(teacherId, studentId, presentationId); } catch { /* не інтерактивна */ }
}

function TeacherConsole({ cls, studentName, onExit }: { cls: LiveClass; studentName: string; onExit: () => void }) {
  const [section, setSection] = useState<LiveSection>(
    LIVE_SECTIONS.some((s) => s.key === cls.current_section) ? cls.current_section : "board",
  );
  const [dictOpen, setDictOpen] = useState(false);
  const [ended, setEnded] = useState(cls.status === "ended");
  const [studentView, setStudentView] = useState<{ section: LiveSection; view: LiveView | null }>({
    section: cls.current_section,
    view: (cls as any).live_view ?? null,
  });
  const boardApi = useRef<BoardApi | null>(null);
  const [laser, setLaser] = useState(false);
  const sendLaser = useLaserSender(cls.id);
  const onLaserMove = (p: LaserPoint) => sendLaser(p);

  const finish = async () => {
    await endLiveClass(cls.id);
    setEnded(true);
    toast({ title: "Урок завершено" });
    onExit();
  };

  const transfer = async (s: LiveSection, view: LiveView | null) => {
    try {
      await setLiveView(cls.id, s, view);
      setStudentView({ section: s, view });
      if (view?.type === "slide") void ensurePresentationHomework(cls.teacher_id, cls.student_id, view.presentation_id);
      toast({ title: "Учня перенесено", description: LIVE_SECTIONS.find((x) => x.key === s)?.label });
    } catch (e: any) {
      toast({ title: "Не вдалося перенести", description: e.message, variant: "destructive" });
    }
  };

  const whereIsStudent = () => {
    const label = LIVE_SECTIONS.find((s) => s.key === studentView.section)?.label || "Дошка";
    if (studentView.view?.type === "slide") return `${label} · слайд ${studentView.view.page + 1}`;
    if (studentView.view?.type === "textbook") return `${label} · стор. ${studentView.view.page}`;
    if (studentView.view?.type === "blocks") return `${label} · ${studentView.view.title || "урок"}`;
    return label;
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-admin-bg overflow-hidden pb-14 md:pb-0">
      <header className="h-12 md:h-14 shrink-0 border-b border-admin-border bg-admin-surface px-2 md:px-3 flex items-center gap-3">
        <div className="min-w-0 mr-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
            <h2 className="text-sm font-semibold text-admin-fg truncate">{cls.title}</h2>
            <span className="text-xs text-admin-muted truncate hidden sm:inline">· {studentName}</span>
          </div>
          <p className="text-[11px] text-admin-muted truncate">Учень бачить: {whereIsStudent()}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            animated={false}
            size="sm"
            variant={laser ? "destructive" : "outline"}
            onClick={() => { const next = !laser; setLaser(next); if (!next) sendLaser(null); }}
            title="Червона цяточка на екрані учня"
          >
            <Crosshair /> <span className="hidden lg:inline">Вказівка</span>
          </Button>
          <Button animated={false} size="sm" variant="outline" onClick={() => setDictOpen(true)} title="Словник">
            <Search /> <span className="hidden lg:inline">Словник</span>
          </Button>
          <Button animated={false} size="sm" variant="outline" onClick={onExit} title="До списку уроків">
            <LogOut /> <span className="hidden xl:inline">До списку</span>
          </Button>
          {!ended && (
            <Button
              animated={false}
              size="sm"
              variant="destructive"
              onClick={finish}
            >
              <Square /> <span className="hidden md:inline">Завершити</span>
            </Button>
          )}
        </div>
      </header>

      <div className="hidden md:flex h-11 shrink-0 items-center gap-1 px-3 border-b border-admin-border bg-admin-surface overflow-x-auto">
        {LIVE_SECTIONS.map((s) => (
          <Button
            animated={false}
            size="sm"
            variant={s.key === section ? "default" : "ghost"}
            key={s.key}
            onClick={() => setSection(s.key)}
            className="h-8"
          >
            {s.icon} {s.label}
          </Button>
        ))}
      </div>

      {/* Дошка завжди змонтована — перехід між розділами нічого не стирає */}
      <div className={section === "board" ? "relative flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_240px] gap-2 p-2" : "hidden"}>
        <LaserSurface active={laser} onMove={onLaserMove} className="min-h-0 h-full">
          <BoardEditor compact className="h-full" classId={cls.id} initial={cls.board || []} apiRef={boardApi} studentId={cls.student_id} />
        </LaserSurface>
        <aside className="hidden xl:flex min-h-0 flex-col gap-2 overflow-y-auto">
          <Button animated={false} size="sm" onClick={() => transfer("board", null)} className="w-full shrink-0">
            <Crosshair /> Показати дошку учню
          </Button>
          <div className="min-h-0 [&>div]:rounded-md [&>div]:p-3">
            <LiveBookPagePicker classId={cls.id} onToBoard={(url) => boardApi.current?.insertImage(url)} />
          </div>
        </aside>
        <div className="xl:hidden absolute bottom-3 right-3 z-20 flex max-w-[calc(100%-1.5rem)] items-end gap-2">
          <div className="w-52 max-w-[55vw] [&>div]:p-1">
            <LiveBookPagePicker classId={cls.id} onToBoard={(url) => boardApi.current?.insertImage(url)} />
          </div>
          <Button animated={false} size="sm" onClick={() => transfer("board", null)}>
            <Crosshair /> Учню
          </Button>
        </div>
      </div>

      {(
        <LaserSurface active={laser} onMove={onLaserMove} className={section === "slides" ? "flex-1 min-h-0 overflow-hidden p-2" : "hidden"}>
        <LiveSlidesPanel
          classId={cls.id}
          teacherId={cls.teacher_id}
          studentId={cls.student_id}
          current={studentView.view?.type === "slide" ? studentView.view : null}
          onTransfer={(presentationId, page) => transfer("slides", { type: "slide", presentation_id: presentationId, page })}
        />
        </LaserSurface>
      )}

      {section === "writing" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 p-2">
          <div className="flex justify-end shrink-0">
            <Button animated={false} size="sm" onClick={() => transfer("writing", null)}>
              <Crosshair /> Показати письмо учню
            </Button>
          </div>
          <LiveWriting classId={cls.id} role="teacher" className="flex-1" />
        </div>
      )}

      {section === "reading" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 p-2">
          <div className="flex justify-end shrink-0">
            <Button animated={false} size="sm" onClick={() => transfer("reading", null)}>
              <Crosshair /> Показати читання учню
            </Button>
          </div>
          <LiveReading classId={cls.id} role="teacher" studentId={cls.student_id} teacherId={cls.teacher_id} className="flex-1" />
        </div>
      )}

      {section === "grammar" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 p-2">
          <div className="flex justify-end shrink-0">
            <Button animated={false} size="sm" onClick={() => transfer("grammar", null)}>
              <Crosshair /> Показати граматику учню
            </Button>
          </div>
          <LiveGrammar classId={cls.id} role="teacher" studentId={cls.student_id} teacherId={cls.teacher_id} className="flex-1" />
        </div>
      )}


      {section === "notes" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 p-2">
          <div className="flex justify-end shrink-0">
            <Button animated={false} size="sm" onClick={() => transfer("notes", null)}>
              <Crosshair /> Показати нотатки учню
            </Button>
          </div>
          <LiveNotes classId={cls.id} role="teacher" studentId={cls.student_id} teacherId={cls.teacher_id} className="flex-1" />
        </div>
      )}

      {section === "video" && (
        <div className="flex-1 min-h-0 flex flex-col gap-2 p-2 overflow-y-auto">
          <div className="flex justify-end shrink-0">
            <Button animated={false} size="sm" onClick={() => transfer("video", null)}>
              <Crosshair /> Показати відео учню
            </Button>
          </div>
          <LiveVideo classId={cls.id} role="teacher" className="flex-1" />
        </div>
      )}

      {section === "textbook" && (
        <LaserSurface active={laser} onMove={onLaserMove} className="flex-1 min-h-0 overflow-y-auto p-3">
          <TextbookPanel
            teacherId={cls.teacher_id}
            studentId={cls.student_id}
            current={studentView.view?.type === "textbook" ? studentView.view : null}
            onTransfer={(sbId, page) => transfer("textbook", { type: "textbook", student_book_id: sbId, page })}
          />
        </LaserSurface>
      )}

      {section === "blocks" && (
        <LaserSurface active={laser} onMove={onLaserMove} className="flex-1 min-h-0 overflow-y-auto p-3">
        <BlocksPanel
          onTransfer={(kit) =>
            transfer("blocks", { type: "blocks", kit_id: kit.id, title: kit.title, level: kit.level, blocks: kit.blocks, sections: kitSections(kit), page_paths: kit.page_paths, presentation_id: kit.presentation_id })
          }
        />
        </LaserSurface>
      )}

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 border-t border-admin-border bg-admin-surface flex overflow-x-auto" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {LIVE_SECTIONS.map((s) => (
          <button key={s.key} onClick={() => setSection(s.key)}
            className={`flex-1 min-w-[60px] flex flex-col items-center justify-center text-[10px] font-medium ${s.key === section ? "text-primary" : "text-admin-muted"}`}>
            <span className="text-base leading-none">{s.icon}</span>
            <span className="truncate max-w-full">{s.label}</span>
          </button>
        ))}
      </nav>

      <PandaLookupDialog open={dictOpen} onOpenChange={setDictOpen} targetUserId={cls.student_id} />
    </div>
  );
}

/* ───────── Презентація ───────── */

function SlidesPanel({
  teacherId,
  current,
  onTransfer,
}: {
  teacherId: string;
  current: { presentation_id: string; page: number } | null;
  onTransfer: (presentationId: string, page: number) => void;
}) {
  const [list, setList] = useState<Presentation[]>([]);
  const [selected, setSelected] = useState<Presentation | null>(null);
  const [page, setPage] = useState(current?.page ?? 0);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    try {
      const rows = await listPresentations();
      setList(rows);
      if (current) setSelected(rows.find((p) => p.id === current.presentation_id) ?? null);
    } catch (e: any) {
      toast({ title: "Не вдалося завантажити презентації", description: e.message, variant: "destructive" });
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async (file: File) => {
    setBusy("Читаємо PDF…");
    try {
      const p = await uploadPresentation({ ownerId: teacherId, file, onProgress: setBusy });
      setList((prev) => [p, ...prev]);
      setSelected(p);
      setPage(0);
      toast({ title: "Презентацію додано", description: `Слайдів: ${p.page_count}` });
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const step = (d: number) => {
    if (!selected) return;
    const next = Math.min(Math.max(page + d, 0), Math.max(selected.page_count - 1, 0));
    setPage(next);
    if (current?.presentation_id === selected.id) onTransfer(selected.id, next);
  };

  return (
    <Card className="p-5 space-y-4">
      <SectionHeader title="Презентація" subtitle="Виберіть, перегляньте — і перенесіть учня" />

      <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-medium cursor-pointer">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        {busy || "Додати PDF"}
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }}
        />
      </label>

      {list.length === 0 ? (
        <p className="text-sm text-slate-500">Ще немає презентацій — додайте PDF.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {list.map((p) => (
            <button
              key={p.id}
              onClick={() => { setSelected(p); setPage(0); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
                selected?.id === p.id ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {p.title} · {p.page_count}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-3">
          <PresentationView presentationId={selected.id} page={page} />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => step(-1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500">
              {page + 1} / {selected.page_count}
            </span>
            <button onClick={() => step(1)} className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onTransfer(selected.id, page)}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium"
              style={{ background: "#0F172A" }}
            >
              Перенести учня сюди
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ───────── Блок-завдання ───────── */

function BlocksPanel({ onTransfer }: { onTransfer: (kit: LessonKit) => void }) {
  const [kits, setKits] = useState<LessonKit[]>([]);
  const [selected, setSelected] = useState<LessonKit | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("lesson_kits")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setKits(((data ?? []) as any[]).map(normalizeKit));
      setLoading(false);
    })();
  }, []);

  return (
    <Card className="p-5 space-y-4">
      <SectionHeader title="Блок-завдання" subtitle="Готові уроки з бібліотеки уроків" />
      {loading ? (
        <p className="text-sm text-slate-500 animate-pulse">Завантаження…</p>
      ) : kits.length === 0 ? (
        <EmptyState title="Бібліотека уроків порожня" description="Створіть урок у розділі «Майстерня уроків»." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {kits.map((k) => (
            <button
              key={k.id}
              onClick={() => setSelected(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border text-left ${
                selected?.id === k.id ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {k.title}
               {k.level ? ` · ${k.level}` : ""} · {kitSections(k).length} тем · {kitSections(k).reduce((n, s) => n + s.blocks.length, 0)} блоків
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-3">
          <button
            onClick={() => onTransfer(selected)}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: "#0F172A" }}
          >
            Перенести учня сюди
          </button>
          <div className="rounded-2xl border border-slate-200 p-3">
            <p className="text-xs text-slate-500 mb-2">Так це бачить учень</p>
             <LessonReader title={selected.title} level={selected.level} sections={kitSections(selected)} pagePaths={selected.page_paths} imageBucket={selected.presentation_id ? "presentation-slides" : "tutoring-materials"} showActions={false} />
          </div>
        </div>
      )}
    </Card>
  );
}
