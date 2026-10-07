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
import { Play, Square, Crosshair, LogOut, Search, Eye, Link2, Link2Off, Timer } from "lucide-react";
import { useLivePresence } from "@/hooks/useLivePresence";
import TextbookPanel from "@/components/textbook/TextbookPanel";
import LiveWriting from "@/components/live/LiveWriting";
import LiveReading from "@/components/live/LiveReading";
import LiveGrammar from "@/components/live/LiveGrammar";
import NotesIsland from "@/components/live/NotesIsland";
import LiveVideo from "@/components/live/LiveVideo";
import LiveSlidesPanel from "@/components/live/LiveSlidesPanel";
import BoardEditor, { type BoardApi } from "@/components/live/BoardEditor";
import LiveBookPagePicker from "@/components/books/LiveBookPagePicker";
import { PandaLookupDialog } from "@/components/dictionary/PandaLookup";
import { normalizeKit, kitSections, type LessonKit } from "@/lib/lesson-kits";
import LessonReader from "@/components/blocks/LessonReader";
import { LaserSurface, useLaserSender, type LaserPoint } from "@/components/live/LaserPointer";
import { Button } from "@/components/ui/button";

interface StudentRow { user_id: string; display_name: string | null; email: string | null }

const fieldCls = "px-3 py-2 rounded-xl border border-admin-border bg-admin-surface text-sm text-admin-fg focus:outline-none focus:ring-2 focus:ring-admin-accent/40";

function ago(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? "сьогодні" : d === 1 ? "вчора" : `${d} дн. тому`;
}

export default function LiveClassPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
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

  const nameOf = (id: string) => {
    const s = students.find((x) => x.user_id === id);
    return s?.display_name || s?.email || id.slice(0, 8);
  };
  const dateLabel = new Date().toLocaleDateString("uk-UA", { day: "numeric", month: "short" });

  const begin = async (sid: string, t?: string) => {
    if (!user || !sid) { toast({ title: "Виберіть учня" }); return; }
    try {
      const c = await startLiveClass(user.id, sid, (t ?? title).trim() || `${nameOf(sid)} · ${dateLabel}`);
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

  const active = classes.filter((c) => c.status === "active");
  // останні учні (унікальні) — швидкий старт одним натисканням
  const recent: string[] = [];
  classes.forEach((c) => { if (!recent.includes(c.student_id)) recent.push(c.student_id); });
  const lastFor = (sid: string) => classes.find((c) => c.student_id === sid);

  return (
    <div className="h-full overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 max-w-5xl">
      {active.length > 0 && (
        <Card className="p-5 border-emerald-500/40">
          <SectionHeader title="Урок іде зараз" subtitle="Продовжіть там, де зупинились" />
          <div className="divide-y divide-admin-border">
            {active.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-admin-fg truncate">{c.title}</p>
                  <p className="text-xs text-admin-muted">{nameOf(c.student_id)} · розпочато {new Date(c.started_at).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
                <Button animated={false} size="sm" onClick={() => setActiveClass(c)}>Продовжити</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {recent.length > 0 && (
        <Card className="p-5">
          <SectionHeader title="Почати урок" subtitle="Один клік — учень одразу потрапляє в клас, без демонстрації екрана" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {recent.slice(0, 6).map((sid) => {
              const last = lastFor(sid);
              return (
                <button key={sid} onClick={() => begin(sid, "")}
                  className="group flex items-center gap-3 rounded-2xl border border-admin-border bg-admin-surface px-4 py-3 text-left hover:border-admin-primary transition-colors">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-admin-accent/20 font-semibold text-admin-fg">{nameOf(sid).slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-admin-fg">{nameOf(sid)}</span>
                    <span className="block text-xs text-admin-muted">{last ? `останній урок: ${ago(last.started_at)}` : "ще не було уроків"}</span>
                  </span>
                  <Play className="size-4 shrink-0 text-admin-muted group-hover:text-admin-primary" />
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <SectionHeader title={recent.length ? "Інший учень або своя назва" : "Запустити живий урок"} subtitle="Назва за замовчуванням — «Ім’я · дата»" />
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className={fieldCls}>
            <option value="">— Виберіть учня —</option>
            {[...students].sort((a, b) => nameOf(a.user_id).localeCompare(nameOf(b.user_id), "uk")).map((s) => (
              <option key={s.user_id} value={s.user_id}>{nameOf(s.user_id)}</option>
            ))}
          </select>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={studentId ? `${nameOf(studentId)} · ${dateLabel}` : "Назва уроку (необов’язково)"} className={fieldCls} />
          <Button animated={false} onClick={() => begin(studentId)} disabled={!studentId}><Play /> Запустити</Button>
        </div>
      </Card>
    </div>
  );
}


/** Розділи, де «Показати учню» — одна дія. Для решти матеріал обирається всередині панелі. */
const SIMPLE_SECTIONS: LiveSection[] = ["board", "writing", "reading", "grammar", "notes", "video"];
const LESSON_MINUTES = 60;

function TeacherConsole({ cls, studentName, onExit }: { cls: LiveClass; studentName: string; onExit: () => void }) {
  const [section, setSection] = useState<LiveSection>(
    LIVE_SECTIONS.some((s) => s.key === cls.current_section) ? cls.current_section : "board",
  );
  const [dictOpen, setDictOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [ended, setEnded] = useState(cls.status === "ended");
  const [studentView, setStudentView] = useState<{ section: LiveSection; view: LiveView | null }>({
    section: cls.current_section,
    view: (cls as any).live_view ?? null,
  });
  const boardApi = useRef<BoardApi | null>(null);
  const [laser, setLaser] = useState(false);
  const sendLaser = useLaserSender(cls.id);
  const onLaserMove = (p: LaserPoint) => sendLaser(p);
  const presence = useLivePresence(cls.id, { id: cls.teacher_id, role: "teacher" }, section);

  // «Слідувати»: переходи викладача між розділами одразу переносять учня
  const [follow, setFollow] = useState(() => localStorage.getItem("klar-live-follow") !== "0");
  useEffect(() => { localStorage.setItem("klar-live-follow", follow ? "1" : "0"); }, [follow]);

  // таймер уроку
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(t); }, []);
  const mins = Math.max(0, Math.floor((now - new Date(cls.started_at).getTime()) / 60000));
  const clock = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, "0")}`;
  const overtime = mins >= LESSON_MINUTES;

  const finish = async () => {
    try {
      await endLiveClass(cls.id);
      setEnded(true);
      toast({ title: "Урок завершено", description: `Тривалість ${clock}` });
      onExit();
    } catch (e: any) {
      toast({ title: "Не вдалося завершити", description: e.message, variant: "destructive" });
    }
  };

  const transfer = async (s: LiveSection, view: LiveView | null, silent = false) => {
    try {
      await setLiveView(cls.id, s, view);
      setStudentView({ section: s, view });
      if (!silent) toast({ title: "Учня перенесено", description: LIVE_SECTIONS.find((x) => x.key === s)?.label });
    } catch (e: any) {
      toast({ title: "Не вдалося перенести", description: e.message, variant: "destructive" });
    }
  };

  const goSection = (key: LiveSection) => {
    setSection(key);
    if (follow && SIMPLE_SECTIONS.includes(key) && studentView.section !== key) void transfer(key, null, true);
  };

  // слайд — 1-based (так само, як у LiveSlidesPanel і PresentationView)
  const whereIsStudent = () => {
    const label = LIVE_SECTIONS.find((s) => s.key === studentView.section)?.label || "Дошка";
    if (studentView.view?.type === "slide") return `${label} · слайд ${studentView.view.page}`;
    if (studentView.view?.type === "textbook") return `${label} · стор. ${studentView.view.page}`;
    if (studentView.view?.type === "blocks") return `${label} · ${studentView.view.title || "урок"}`;
    return label;
  };

  const simple = SIMPLE_SECTIONS.includes(section);
  const studentHere = studentView.section === section;

  return (
    <div className="h-full min-h-0 flex flex-col bg-admin-bg overflow-hidden pb-14 md:pb-0">
      <header className="h-14 shrink-0 border-b border-admin-border bg-admin-surface px-2 md:px-3 flex items-center gap-2 md:gap-3">
        <div className="min-w-0 mr-auto">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`size-2.5 rounded-full shrink-0 ${presence.online ? "bg-emerald-500" : "bg-admin-muted/50"}`}
              title={presence.online ? "Учень в уроці" : "Учня немає в уроці"}
            />
            <h2 className="text-sm font-semibold text-admin-fg truncate">{studentName}</h2>
            <span className="text-xs text-admin-muted truncate hidden sm:inline">· {cls.title}</span>
          </div>
          <p className="text-[11px] text-admin-muted truncate">
            {presence.online ? "онлайн" : "не в уроці"} · бачить: <span className="text-admin-fg">{whereIsStudent()}</span>
          </p>
        </div>

        <span
          className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tabular-nums ${overtime ? "border-amber-500/60 text-amber-600 dark:text-amber-300" : "border-admin-border text-admin-muted"}`}
          title={`Урок триває · план ${LESSON_MINUTES} хв`}
        >
          <Timer className="size-3.5" /> {clock}
        </span>

        {simple && (
          studentHere ? (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              ● учень тут
            </span>
          ) : (
            <Button animated={false} size="sm" onClick={() => transfer(section, null)}>
              <Eye /> <span>Показати учню</span>
            </Button>
          )
        )}

        <div className="flex items-center gap-1.5 shrink-0">
          <Button animated={false} size="sm" variant={follow ? "default" : "outline"} onClick={() => setFollow((f) => !f)}
            title={follow ? "Учень іде за вами між розділами. Натисніть, щоб готуватися непомітно." : "Ви переходите між розділами непомітно для учня."}>
            {follow ? <Link2 /> : <Link2Off />} <span className="hidden lg:inline">{follow ? "Слідувати" : "Окремо"}</span>
          </Button>
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
          <Button animated={false} size="sm" variant="outline" onClick={onExit} title="Вийти зі сторінки уроку (урок триває)">
            <LogOut /> <span className="hidden xl:inline">Вийти</span>
          </Button>
          {!ended && (
            <Button animated={false} size="sm" variant="destructive" onClick={() => setEndOpen(true)}>
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
            onClick={() => goSection(s.key)}
            className="h-8 relative"
          >
            {s.icon} {s.label}
            {studentView.section === s.key && (
              <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-admin-surface" title="Учень зараз тут" />
            )}
          </Button>
        ))}
      </div>

      {/* Дошка завжди змонтована — перехід між розділами нічого не стирає */}
      <div className={section === "board" ? "relative flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_240px] gap-2 p-2" : "hidden"}>
        <LaserSurface active={laser} onMove={onLaserMove} className="min-h-0 h-full">
          <BoardEditor compact className="h-full" classId={cls.id} initial={cls.board || []} apiRef={boardApi} studentId={cls.student_id} />
        </LaserSurface>
        <aside className="hidden xl:flex min-h-0 flex-col gap-2 overflow-y-auto">
          <div className="min-h-0 [&>div]:rounded-md [&>div]:p-3">
            <LiveBookPagePicker classId={cls.id} onToBoard={(url) => boardApi.current?.insertImage(url)} />
          </div>
        </aside>
        <div className="xl:hidden absolute bottom-3 right-3 z-20 flex max-w-[calc(100%-1.5rem)] items-end gap-2">
          <div className="w-52 max-w-[55vw] [&>div]:p-1">
            <LiveBookPagePicker classId={cls.id} onToBoard={(url) => boardApi.current?.insertImage(url)} />
          </div>
        </div>
      </div>

      <LaserSurface active={laser} onMove={onLaserMove} className={section === "slides" ? "flex-1 min-h-0 overflow-hidden p-2" : "hidden"}>
        <LiveSlidesPanel
          active={section === "slides"}
          classId={cls.id}
          teacherId={cls.teacher_id}
          studentId={cls.student_id}
          current={studentView.view?.type === "slide" ? studentView.view : null}
          onTransfer={(presentationId, page) => transfer("slides", { type: "slide", presentation_id: presentationId, page })}
        />
      </LaserSurface>

      {section === "writing" && (
        <div className="flex-1 min-h-0 flex flex-col p-2">
          <LiveWriting classId={cls.id} role="teacher" className="flex-1" />
        </div>
      )}

      {section === "reading" && (
        <div className="flex-1 min-h-0 flex flex-col p-2">
          <LiveReading classId={cls.id} role="teacher" studentId={cls.student_id} teacherId={cls.teacher_id} className="flex-1" />
        </div>
      )}

      {section === "grammar" && (
        <div className="flex-1 min-h-0 flex flex-col p-2">
          <LiveGrammar classId={cls.id} role="teacher" studentId={cls.student_id} teacherId={cls.teacher_id} className="flex-1" />
        </div>
      )}


      {section === "video" && (
        <div className="flex-1 min-h-0 flex flex-col p-2 overflow-hidden">
          <LiveVideo
            classId={cls.id}
            role="teacher"
            className="flex-1 min-h-0"
            onUseLesson={(kit) => transfer("blocks", { type: "blocks", kit_id: kit.id, title: kit.title, level: kit.level, blocks: kit.blocks, sections: kitSections(kit), page_paths: kit.page_paths, presentation_id: kit.presentation_id })}
          />
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
          <button key={s.key} onClick={() => goSection(s.key)}
            className={`relative flex-1 min-w-[60px] flex flex-col items-center justify-center text-[10px] font-medium ${s.key === section ? "text-primary" : "text-admin-muted"}`}>
            <span className="text-base leading-none">{s.icon}</span>
            <span className="truncate max-w-full">{s.label}</span>
            {studentView.section === s.key && <span className="absolute top-1 right-3 size-2 rounded-full bg-emerald-500" />}
          </button>
        ))}
      </nav>

      <NotesIsland classId={cls.id} role="teacher" studentId={cls.student_id} teacherId={cls.teacher_id} bottomClass="bottom-20 md:bottom-4" />

      {endOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={() => setEndOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-admin-border bg-admin-card p-5 text-admin-fg shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Завершити урок?</h3>
            <p className="mt-2 text-sm text-admin-muted">
              {studentName} {presence.online ? "зараз в уроці й" : ""} буде повернуто до кабінету. Тривалість уроку: {clock}.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button animated={false} size="sm" variant="outline" onClick={() => setEndOpen(false)}>Ще ні</Button>
              <Button animated={false} size="sm" variant="destructive" onClick={finish}>Завершити</Button>
            </div>
          </div>
        </div>
      )}

      <PandaLookupDialog open={dictOpen} onOpenChange={setDictOpen} targetUserId={cls.student_id} />
    </div>
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
        <p className="text-sm text-admin-muted animate-pulse">Завантаження…</p>
      ) : kits.length === 0 ? (
        <EmptyState title="Бібліотека уроків порожня" description="Створіть урок у розділі «Майстерня уроків»." />
      ) : (
        <div className="flex flex-wrap gap-2">
          {kits.map((k) => (
            <button
              key={k.id}
              onClick={() => setSelected(k)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border text-left ${
                selected?.id === k.id ? "border-admin-primary bg-admin-primary/10 text-admin-fg" : "border-admin-border text-admin-muted hover:bg-admin-fg/5"
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
            className="px-4 py-2 rounded-xl bg-admin-primary text-admin-primary-fg text-sm font-medium"
          >
            Перенести учня сюди
          </button>
          <div className="rounded-2xl border border-admin-border p-3">
            <p className="text-xs text-admin-muted mb-2">Так це бачить учень</p>
             <LessonReader title={selected.title} level={selected.level} sections={kitSections(selected)} pagePaths={selected.page_paths} imageBucket={selected.presentation_id ? "presentation-slides" : "tutoring-materials"} showActions={false} />
          </div>
        </div>
      )}
    </Card>
  );
}
