import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Upload, Crosshair, Link2, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  listPresentations, uploadPresentation, slideUrls, createHtmlPresentation, isHtmlFile, assignPresentationHomework,
  getPresentationHtml, isInteractive, listPresentationFolders, prettyTitle, LEVELS, KIND_META,
  type Presentation, type PresentationFolder,
} from "@/lib/presentations";
import HtmlSlides from "./HtmlSlides";
import { Code2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

/**
 * Презентація в живому уроці для викладача: одна робоча область на висоту екрана.
 * Ліворуч — мініатюри, по центру — слайд, знизу — керування. Стрілки ←/→ гортають.
 * page — 1-based (як у PresentationView учня).
 */
export default function LiveSlidesPanel({
  classId,
  teacherId,
  studentId,
  current,
  onTransfer,
  active = true,
}: {
  /** false, коли розділ «Презентація» не відкритий — стрілки не повинні гортати слайди учню з інших розділів. */
  active?: boolean;
  studentId?: string;
  classId?: string;
  teacherId: string;
  current: { presentation_id: string; page: number } | null;
  onTransfer: (presentationId: string, page: number) => void;
}) {
  const [list, setList] = useState<Presentation[]>([]);
  const [folders, setFolders] = useState<PresentationFolder[]>([]);
  const [folderId, setFolderId] = useState("");
  const [level, setLevel] = useState("");
  const [q, setQ] = useState("");
  /** HTML інтерактивних презентацій — у списку його немає (важкий), тягнемо при виборі. */
  const [htmlById, setHtmlById] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Presentation | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [page, setPage] = useState(Math.max(1, current?.page ?? 1));
  const [busy, setBusy] = useState<string | null>(null);
  const [sync, setSync] = useState(true);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listPresentationFolders().then(setFolders).catch(() => {});
    (async () => {
      const rows = await listPresentations();
      setList(rows);
      const read = (k: string) => { try { return JSON.parse(localStorage.getItem(k) || "{}"); } catch { return {}; } };
      let saved: { id?: string; page?: number } = read(`klar-live-pres:${classId}`);
      // Новий урок — продовжуємо з того місця, де зупинились з цим учнем
      if (!saved.id && studentId) saved = read(`klar-live-pres:student:${studentId}`);
      if (!saved.id && studentId) {
        const { data } = await supabase.from("live_classes").select("live_view")
          .eq("teacher_id", teacherId).eq("student_id", studentId)
          .order("created_at", { ascending: false }).limit(10);
        const v = (data || []).map((r: any) => r.live_view).find((x: any) => x?.type === "slide");
        if (v) saved = { id: v.presentation_id, page: v.page };
      }
      const cur = current ? rows.find((p) => p.id === current.presentation_id) : null;
      const last = saved.id ? rows.find((p) => p.id === saved.id) : null;
      const pick = cur ?? last ?? rows.find((p) => !p.archived) ?? null;
      setSelected(pick);
      if (!cur && last && saved.page) setPage(saved.page);
    })().catch((e) => toast({ title: "Не вдалося завантажити презентації", description: e.message, variant: "destructive" }));
  }, []);

  // запам'ятовуємо презентацію і слайд — після оновлення сторінки чи на наступному уроці відкриється те саме
  useEffect(() => {
    if (!selected) return;
    const v = JSON.stringify({ id: selected.id, page });
    try {
      if (classId) localStorage.setItem(`klar-live-pres:${classId}`, v);
      if (studentId) localStorage.setItem(`klar-live-pres:student:${studentId}`, v);
    } catch { /* ignore */ }
  }, [classId, studentId, selected?.id, page]);

  useEffect(() => {
    setUrls([]);
    if (!selected) return;
    if (isInteractive(selected)) {
      if (htmlById[selected.id] === undefined) {
        const id = selected.id;
        getPresentationHtml(id)
          .then((h) => setHtmlById((m) => ({ ...m, [id]: h })))
          .catch((e) => toast({ title: "Не вдалося відкрити презентацію", description: e.message, variant: "destructive" }));
      }
      return;
    }
    slideUrls(selected.slide_paths).then(setUrls).catch(() => setUrls([]));
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // запам'ятовуємо презентацію і слайд — після оновлення сторінки відкриється те саме
  useEffect(() => {
    if (!classId || !selected) return;
    try { localStorage.setItem(`klar-live-pres:${classId}`, JSON.stringify({ id: selected.id, page })); } catch { /* ignore */ }
  }, [classId, selected?.id, page]);

  const interactive = !!selected && isInteractive(selected);
  const selectedHtml = selected ? htmlById[selected.id] : undefined;

  const shown = list.filter((p) => {
    if (p.archived && p.id !== selected?.id) return false;
    if (folderId === "__none" ? !!p.folder_id : folderId && p.folder_id !== folderId) return false;
    if (level && p.level !== level) return false;
    if (q.trim() && !p.title.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  }).sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const levelsPresent = LEVELS.filter((l) => list.some((p) => !p.archived && p.level === l));

  const total = selected?.page_count || urls.length || 1;
  const live = !!selected && current?.presentation_id === selected.id;

  const goto = (n: number) => {
    if (!selected) return;
    const next = Math.min(Math.max(n, 1), total);
    setPage(next);
    if (live && sync) onTransfer(selected.id, next);
  };

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof Element && t.closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goto(page + 1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goto(page - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    stripRef.current?.querySelector(`[data-slide="${page}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [page, urls.length]);

  const addHtml = (p: Presentation, code: string) => {
    setHtmlById((m) => ({ ...m, [p.id]: code }));
    setList((prev) => [p, ...prev]);
    setSelected(p);
    setPage(1);
    toast({ title: "Інтерактивну презентацію додано" });
  };
  const pasteCode = async () => {
    const code = window.prompt("Вставте HTML або SVG код презентації");
    if (!code?.trim()) return;
    const title = window.prompt("Назва", "Інтерактивна презентація") || "Інтерактивна презентація";
    try { addHtml(await createHtmlPresentation(teacherId, title, code), code); }
    catch (e: any) { toast({ title: "Помилка", description: e.message, variant: "destructive" }); }
  };

  const upload = async (file: File) => {
    if (isHtmlFile(file)) {
      try { const code = await file.text(); addHtml(await createHtmlPresentation(teacherId, prettyTitle(file.name), code), code); }
      catch (e: any) { toast({ title: "Помилка", description: e.message, variant: "destructive" }); }
      return;
    }
    setBusy("Читаємо PDF…");
    try {
      const p = await uploadPresentation({ ownerId: teacherId, file, onProgress: setBusy });
      setList((prev) => [p, ...prev]);
      setSelected(p);
      setPage(1);
      toast({ title: "Презентацію додано", description: `Слайдів: ${p.page_count}` });
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col gap-2">
      {/* Верхня смуга: вибір презентації */}
      <div className="shrink-0 flex items-center gap-2 overflow-x-auto pb-0.5">
        <label className="shrink-0">
          <input type="file" accept="application/pdf,.html,.htm,.svg" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.currentTarget.value = ""; }} />
          <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-primary/50 px-3 text-xs font-semibold text-primary hover:bg-primary/10">
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {busy || "PDF / HTML / SVG"}
          </span>
        </label>
        <button onClick={pasteCode} className="shrink-0 inline-flex h-8 items-center gap-1.5 rounded-md border border-dashed border-primary/50 px-3 text-xs font-semibold text-primary hover:bg-primary/10">
          <Code2 className="h-3.5 w-3.5" /> Код
        </button>
        {folders.length > 0 && (
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)} aria-label="Папка"
            className="shrink-0 h-8 rounded-md border border-border bg-card px-2 text-xs">
            <option value="">Усі папки</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.emoji} {f.name}</option>)}
            <option value="__none">Без папки</option>
          </select>
        )}
        {levelsPresent.length > 1 && (
          <select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Рівень"
            className="shrink-0 h-8 rounded-md border border-border bg-card px-2 text-xs">
            <option value="">Усі рівні</option>
            {levelsPresent.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        {list.length > 6 && (
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук…"
            className="shrink-0 h-8 w-32 rounded-md border border-border bg-card px-2 text-xs" />
        )}
        {shown.map((p) => (
          <button key={p.id} onClick={() => { setSelected(p); setPage(1); }}
            className={cn("shrink-0 h-8 rounded-md border px-3 text-xs font-medium transition-colors inline-flex items-center gap-1.5",
              selected?.id === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted")}>
            {p.pinned && <span>⭐</span>}
            <span>{KIND_META[p.kind].emoji}</span>
            {p.level && <span className="font-bold opacity-80">{p.level}</span>}
            <span className="max-w-[16rem] truncate">{p.title}</span>
            {!isInteractive(p) && <span className="opacity-60">· {p.page_count}</span>}
          </button>
        ))}
        {shown.length === 0 && list.length > 0 && <span className="text-xs text-muted-foreground">Нічого не знайдено — змініть фільтр.</span>}
      </div>

      {!selected ? (
        <div className="flex-1 grid place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Додайте PDF — і він стане презентацією.
        </div>
      ) : interactive ? (
        <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-secondary/60 overflow-hidden">
          <div className="flex-1 min-h-0 p-2">
            {selectedHtml === undefined
              ? <div className="grid h-full place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              : <HtmlSlides key={selected.id} html={selectedHtml} syncKey={live && sync && classId ? `${classId}:${selected.id}` : undefined} progress={{ studentId: studentId || teacherId, presentationId: selected.id }} />}
          </div>
          <div className="h-12 shrink-0 flex items-center gap-2 border-t border-border bg-card px-3">
            <span className="text-xs font-medium text-muted-foreground">Інтерактивна · кнопки й анімації працюють</span>
            {live ? <span className="text-xs text-emerald-600 font-medium">● учень бачить</span> : <span className="text-xs text-muted-foreground">учень ще не тут</span>}
            <Button animated={false} size="sm" variant={sync ? "default" : "outline"} className="ml-auto" onClick={() => setSync((s) => !s)}
              title="Коли увімкнено — ваші натискання повторюються в учня">
              {sync ? <Link2 /> : <Link2Off />} {sync ? "Разом" : "Окремо"}
            </Button>
            {studentId && (
              <Button animated={false} size="sm" variant="outline" onClick={async () => {
                try {
                  const fresh = await assignPresentationHomework(teacherId, studentId, selected.id);
                  toast({ title: fresh ? "Видано як ДЗ" : "Це ДЗ учень уже має" });
                } catch (e: any) { toast({ title: "Помилка", description: e.message, variant: "destructive" }); }
              }}>
                Дати як ДЗ
              </Button>
            )}
            <Button animated={false} size="sm" onClick={() => onTransfer(selected.id, 1)}>
              <Crosshair /> Показати учню
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[132px_minmax(0,1fr)] gap-2">
          {/* Мініатюри */}
          <div ref={stripRef} className="hidden md:flex min-h-0 flex-col gap-2 overflow-y-auto rounded-xl bg-secondary/60 p-2">
            {Array.from({ length: total }, (_, i) => i + 1).map((n) => (
              <button key={n} data-slide={n} onClick={() => goto(n)}
                className={cn("relative shrink-0 overflow-hidden rounded-md border-2 bg-card transition-all",
                  n === page ? "border-primary ring-2 ring-primary/30" : "border-transparent opacity-70 hover:opacity-100")}>
                {urls[n - 1] ? <img src={urls[n - 1]} alt="" loading="lazy" className="aspect-video w-full object-contain bg-white" />
                  : <div className="aspect-video w-full bg-muted" />}
                <span className="absolute bottom-1 left-1 rounded bg-foreground/80 px-1.5 text-[10px] font-bold text-background">{n}</span>
                {live && current?.page === n && <span className="absolute top-1 right-1 size-2 rounded-full bg-emerald-500" />}
              </button>
            ))}
          </div>

          {/* Слайд + керування */}
          <div className="min-h-0 flex flex-col rounded-xl bg-secondary/60 overflow-hidden">
            <div className="relative flex-1 min-h-0 flex items-center justify-center p-3">
              {urls[page - 1] ? (
                <img src={urls[page - 1]} alt={`Слайд ${page}`} className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-xl" />
              ) : <Loader2 className="h-6 w-6 animate-spin text-primary" />}
              <button onClick={() => goto(page - 1)} aria-label="Попередній"
                className="absolute left-2 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-card/90 text-foreground shadow hover:bg-card disabled:opacity-30" disabled={page <= 1}>
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button onClick={() => goto(page + 1)} aria-label="Наступний"
                className="absolute right-2 top-1/2 -translate-y-1/2 grid size-10 place-items-center rounded-full bg-card/90 text-foreground shadow hover:bg-card disabled:opacity-30" disabled={page >= total}>
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <div className="h-12 shrink-0 flex items-center gap-2 border-t border-border bg-card px-3">
              <span className="text-sm font-bold tabular-nums text-foreground">{page} <span className="text-muted-foreground font-medium">/ {total}</span></span>
              {live ? (
                <span className="text-xs text-emerald-600 font-medium">● учень на слайді {current?.page}</span>
              ) : (
                <span className="text-xs text-muted-foreground">учень ще не тут</span>
              )}
              <span className="ml-auto hidden sm:inline text-[11px] text-muted-foreground">← → гортати</span>
              <Button animated={false} size="sm" variant={sync ? "default" : "outline"} onClick={() => setSync((s) => !s)}
                title="Коли увімкнено — учень гортає разом з вами">
                {sync ? <Link2 /> : <Link2Off />} {sync ? "Разом" : "Окремо"}
              </Button>
              <Button animated={false} size="sm" onClick={() => onTransfer(selected.id, page)}>
                <Crosshair /> Показати учню
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
