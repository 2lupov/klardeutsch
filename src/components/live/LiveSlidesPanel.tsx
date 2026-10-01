import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Upload, Crosshair, Link2, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { listPresentations, uploadPresentation, slideUrls, createHtmlPresentation, isHtmlFile, assignPresentationHomework, type Presentation } from "@/lib/presentations";
import HtmlSlides from "./HtmlSlides";
import { Code2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
}: {
  studentId?: string;
  classId?: string;
  teacherId: string;
  current: { presentation_id: string; page: number } | null;
  onTransfer: (presentationId: string, page: number) => void;
}) {
  const [list, setList] = useState<Presentation[]>([]);
  const [selected, setSelected] = useState<Presentation | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [page, setPage] = useState(Math.max(1, current?.page ?? 1));
  const [busy, setBusy] = useState<string | null>(null);
  const [sync, setSync] = useState(true);
  const stripRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listPresentations()
      .then((rows) => {
        setList(rows);
        const cur = current ? rows.find((p) => p.id === current.presentation_id) : null;
        setSelected(cur ?? rows[0] ?? null);
      })
      .catch((e) => toast({ title: "Не вдалося завантажити презентації", description: e.message, variant: "destructive" }));
  }, []);

  useEffect(() => {
    setUrls([]);
    if (selected) slideUrls(selected.slide_paths).then(setUrls).catch(() => setUrls([]));
  }, [selected?.id]);

  const total = selected?.page_count || urls.length || 1;
  const live = !!selected && current?.presentation_id === selected.id;

  const goto = (n: number) => {
    if (!selected) return;
    const next = Math.min(Math.max(n, 1), total);
    setPage(next);
    if (live && sync) onTransfer(selected.id, next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t?.closest("input,textarea,[contenteditable=true]")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); goto(page + 1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); goto(page - 1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    stripRef.current?.querySelector(`[data-slide="${page}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [page, urls.length]);

  const addHtml = (p: Presentation) => {
    setList((prev) => [p, ...prev]);
    setSelected(p);
    setPage(1);
    toast({ title: "Інтерактивну презентацію додано" });
  };
  const pasteCode = async () => {
    const code = window.prompt("Вставте HTML або SVG код презентації");
    if (!code?.trim()) return;
    const title = window.prompt("Назва", "Інтерактивна презентація") || "Інтерактивна презентація";
    try { addHtml(await createHtmlPresentation(teacherId, title, code)); }
    catch (e: any) { toast({ title: "Помилка", description: e.message, variant: "destructive" }); }
  };

  const upload = async (file: File) => {
    if (isHtmlFile(file)) {
      try { addHtml(await createHtmlPresentation(teacherId, file.name.replace(/\.(html?|svg)$/i, ""), await file.text())); }
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
        {list.map((p) => (
          <button key={p.id} onClick={() => { setSelected(p); setPage(1); }}
            className={cn("shrink-0 h-8 rounded-md border px-3 text-xs font-medium transition-colors",
              selected?.id === p.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted")}>
            {p.title} <span className="opacity-60">· {p.page_count}</span>
          </button>
        ))}
      </div>

      {!selected ? (
        <div className="flex-1 grid place-items-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
          Додайте PDF — і він стане презентацією.
        </div>
      ) : selected.html ? (
        <div className="flex-1 min-h-0 flex flex-col rounded-xl bg-secondary/60 overflow-hidden">
          <div className="flex-1 min-h-0 p-2">
            <HtmlSlides html={selected.html} syncKey={live && sync && classId ? `${classId}:${selected.id}` : undefined} />
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
