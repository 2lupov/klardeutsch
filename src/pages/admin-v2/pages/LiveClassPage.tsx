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
import { Play, Square, ChevronLeft, ChevronRight, Loader2, Upload } from "lucide-react";
import BoardEditor, { type BoardApi } from "@/components/live/BoardEditor";
import LiveBookPagePicker from "@/components/books/LiveBookPagePicker";
import { PandaLookupDialog } from "@/components/dictionary/PandaLookup";
import { listPresentations, uploadPresentation, type Presentation } from "@/lib/presentations";
import PresentationView from "@/components/tutoring/PresentationView";
import { normalizeKit, kitBlocksToLessonBlocks, type LessonKit } from "@/lib/lesson-kits";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import { LaserSurface, useLaserSender, type LaserPoint } from "@/components/live/LaserPointer";

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
    <div className="space-y-6">
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

      <Card className="p-5">
        <SectionHeader title="Уроки" subtitle="Активні та завершені" />
        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse">Завантаження…</p>
        ) : classes.length === 0 ? (
          <EmptyState title="Ще немає уроків" description="Запустіть перший живий урок вище." />
        ) : (
          <div className="divide-y divide-slate-100">
            {classes.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {students.find((s) => s.user_id === c.student_id)?.display_name || "Учень"} ·{" "}
                    {new Date(c.started_at).toLocaleString("uk-UA")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[11px] px-2 py-1 rounded-full font-medium"
                    style={c.status === "active" ? { background: "#DCFCE7", color: "#166534" } : { background: "#F1F5F9", color: "#475569" }}
                  >
                    {c.status === "active" ? "Активний" : "Завершено"}
                  </span>
                  <button
                    onClick={() => setActiveClass(c)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Відкрити
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
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
      toast({ title: "Учня перенесено", description: LIVE_SECTIONS.find((x) => x.key === s)?.label });
    } catch (e: any) {
      toast({ title: "Не вдалося перенести", description: e.message, variant: "destructive" });
    }
  };

  const whereIsStudent = () => {
    const label = LIVE_SECTIONS.find((s) => s.key === studentView.section)?.label || "Дошка";
    if (studentView.view?.type === "slide") return `${label} · слайд ${studentView.view.page + 1}`;
    if (studentView.view?.type === "blocks") return `${label} · ${studentView.view.title || "урок"}`;
    return label;
  };

  return (
    <div className="space-y-5">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Живий урок · {studentName}</p>
          <h2 className="text-base font-semibold text-slate-900">{cls.title}</h2>
          <p className="text-[11px] text-indigo-600 mt-0.5">Учень зараз бачить: {whereIsStudent()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { const next = !laser; setLaser(next); if (!next) sendLaser(null); }}
            className={`px-3 py-2 rounded-xl text-sm font-medium border ${
              laser ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            title="Червона цяточка на екрані учня"
          >
            🔴 Вказівка
          </button>
          <button onClick={() => setDictOpen(true)} className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
            🐼 Словник
          </button>
          <button onClick={onExit} className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
            ← До списку
          </button>
          {!ended && (
            <button
              onClick={finish}
              className="px-3 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2"
              style={{ background: "#DC2626" }}
            >
              <Square className="w-4 h-4" /> Завершити урок
            </button>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {LIVE_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSection(s.key)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${
              s.key === section ? "text-white border-transparent" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            style={s.key === section ? { background: "#4F46E5" } : undefined}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Дошка завжди змонтована — перехід між розділами нічого не стирає */}
      <div className={section === "board" ? "space-y-5" : "hidden"}>
        <LaserSurface active={laser} onMove={onLaserMove}>
          <BoardEditor classId={cls.id} initial={cls.board || []} apiRef={boardApi} />
        </LaserSurface>
        <button
          onClick={() => transfer("board", null)}
          className="px-4 py-2 rounded-xl text-white text-sm font-medium"
          style={{ background: "#0F172A" }}
        >
          Перенести учня сюди
        </button>
        <LiveBookPagePicker classId={cls.id} onToBoard={(url) => boardApi.current?.insertImage(url)} />
      </div>

      {section === "slides" && (
        <LaserSurface active={laser} onMove={onLaserMove}>
        <SlidesPanel
          teacherId={cls.teacher_id}
          current={studentView.view?.type === "slide" ? studentView.view : null}
          onTransfer={(presentationId, page) => transfer("slides", { type: "slide", presentation_id: presentationId, page })}
        />
        </LaserSurface>
      )}

      {section === "blocks" && (
        <LaserSurface active={laser} onMove={onLaserMove}>
        <BlocksPanel
          onTransfer={(kit) =>
            transfer("blocks", { type: "blocks", kit_id: kit.id, title: kit.title, blocks: kit.blocks })
          }
        />
        </LaserSurface>
      )}

      <PandaLookupDialog open={dictOpen} onOpenChange={setDictOpen} />
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
        <EmptyState title="Бібліотека уроків порожня" description="Створіть урок у розділі «Генератор уроку»." />
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
              {k.level ? ` · ${k.level}` : ""} · {k.blocks.length} завдань
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
            <StudentBlocks
              blocks={kitBlocksToLessonBlocks(selected.blocks, `live-${selected.id}`)}
              showActions={false}
              persist={false}
              readOnly
            />
          </div>
        </div>
      )}
    </Card>
  );
}
