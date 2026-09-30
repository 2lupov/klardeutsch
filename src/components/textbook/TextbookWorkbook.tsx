import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Hand, Pen, Eraser, Type, Undo2, Loader2, MousePointer2, Plus, Minus, Highlighter, AArrowDown, AArrowUp, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Stroke =
  | { id: string; type: "path"; pts: [number, number][]; color: string; w: number; op?: number }
  | { id: string; type: "text"; x: number; y: number; text: string; color: string; size: number };

type Tool = "hand" | "move" | "pen" | "marker" | "erase" | "text";
const COLORS = ["#2563EB", "#DC2626", "#059669", "#0F172A", "#F59E0B"];
const W = 1000;
const uid = () => Math.random().toString(36).slice(2, 10);

export interface StudentBookInfo {
  id: string;
  student_id: string;
  teacher_id: string;
  current_page: number;
  book: { id: string; title: string; file_path: string; total_pages: number } | null;
}

export async function loadStudentBook(id: string): Promise<StudentBookInfo | null> {
  const { data } = await (supabase as any)
    .from("student_books")
    .select("id, student_id, teacher_id, current_page, book:book_files(id,title,file_path,total_pages)")
    .eq("id", id)
    .maybeSingle();
  return (data as StudentBookInfo) ?? null;
}

const pdfCache = new Map<string, Promise<any>>();
async function getPdf(path: string) {
  if (!pdfCache.has(path)) {
    pdfCache.set(
      path,
      (async () => {
        const { data, error } = await supabase.storage.from("book-library").download(path);
        if (error) throw error;
        return (pdfjsLib as any).getDocument({ data: await data.arrayBuffer() }).promise;
      })(),
    );
  }
  return pdfCache.get(path)!;
}

function PageThumbnail({ filePath, pageNumber, active, onSelect }: {
  filePath: string;
  pageNumber: number;
  active: boolean;
  onSelect: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLButtonElement | null>(null);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || inView) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setInView(true); observer.disconnect(); } },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    let alive = true;
    (async () => {
      try {
        const pdf = await getPdf(filePath);
        const pdfPage = await pdf.getPage(pageNumber);
        const base = pdfPage.getViewport({ scale: 1 });
        const viewport = pdfPage.getViewport({ scale: 180 / base.width });
        const canvas = canvasRef.current;
        if (!alive || !canvas) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const context = canvas.getContext("2d");
        if (!context) return;
        await pdfPage.render({ canvasContext: context, viewport }).promise;
        if (alive) setReady(true);
      } catch {
        if (alive) setReady(false);
      }
    })();
    return () => { alive = false; };
  }, [filePath, pageNumber]);

  return (
    <button
      ref={wrapRef}
      type="button"
      data-page={pageNumber}
      onClick={onSelect}
      aria-label={`Відкрити сторінку ${pageNumber}`}
      className={`group relative flex min-w-0 flex-col gap-1.5 overflow-hidden rounded-xl border p-1.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${
        active
          ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-[0_0_18px_-4px_hsl(var(--primary)/0.5)]"
          : "border-white/10 bg-white/5 hover:border-primary/50 hover:bg-white/10"
      }`}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-white/95">
        {!ready && <Loader2 className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-spin text-slate-400" />}
        <canvas ref={canvasRef} className={`h-full w-full object-contain transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`} />
        {active && (
          <span className="absolute right-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground shadow">
            зараз
          </span>
        )}
      </div>
      <span className={`text-center text-xs font-semibold ${active ? "text-primary" : "text-slate-300 group-hover:text-white"}`}>
        {pageNumber}
      </span>
    </button>
  );
}

/**
 * Живий робочий зошит на сторінці PDF: олівець, гумка, текст.
 * Нотатки зберігаються для кожного учня й сторінки і синхронізуються наживо.
 */
export default function TextbookWorkbook({
  studentBookId,
  page: controlledPage,
  onPageChange,
  syncPage = false,
  allowNavigate = true,
  continuous = false,
}: {
  studentBookId: string;
  page?: number;
  onPageChange?: (p: number) => void;
  /** Записувати номер сторінки в спільний стан (учитель на живому уроці). */
  syncPage?: boolean;
  allowNavigate?: boolean;
  /** Let the academy page scroll naturally instead of nesting a short PDF scroll area. */
  continuous?: boolean;
}) {
  const [info, setInfo] = useState<StudentBookInfo | null>(null);
  const [page, setPageState] = useState(controlledPage ?? 1);
  const [total, setTotal] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [aspect, setAspect] = useState(1.414);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>("hand");
  const [zoom, setZoom] = useState(1);
  const [color, setColor] = useState(COLORS[0]);
  const [textSize, setTextSize] = useState(22);
  const [selText, setSelText] = useState<string | null>(null);
  const [draftText, setDraftText] = useState<{ x: number; y: number; text: string } | null>(null);
  const [pagesOpen, setPagesOpen] = useState(false);
  const [pageInput, setPageInput] = useState(String(controlledPage ?? 1));
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const drawing = useRef<Stroke | null>(null);
  const moving = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const saveTimer = useRef<number | null>(null);
  const lastLocal = useRef(0);
  const history = useRef<Stroke[][]>([]);
  const H = W * aspect;

  useEffect(() => { if (controlledPage) setPageState(controlledPage); }, [controlledPage]);

  useEffect(() => {
    loadStudentBook(studentBookId).then((i) => {
      setInfo(i);
      if (i && !controlledPage) setPageState(i.current_page || 1);
    });
  }, [studentBookId]);

  // Render the PDF page
  useEffect(() => {
    if (!info?.book) return;
    let alive = true;
    setRendering(true);
    (async () => {
      try {
        const pdf = await getPdf(info.book!.file_path);
        if (!alive) return;
        setTotal(pdf.numPages);
        const p = await pdf.getPage(Math.min(Math.max(1, page), pdf.numPages));
        const base = p.getViewport({ scale: 1 });
        const vp = p.getViewport({ scale: Math.min(2, 1600 / base.width) });
        const c = canvasRef.current;
        if (!c || !alive) return;
        c.width = Math.floor(vp.width);
        c.height = Math.floor(vp.height);
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, c.width, c.height);
        await p.render({ canvasContext: ctx, viewport: vp }).promise;
        if (alive) setAspect(vp.height / vp.width);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setRendering(false);
      }
    })();
    return () => { alive = false; };
  }, [info?.book?.file_path, page]);

  // Load + subscribe strokes for page
  useEffect(() => {
    let alive = true;
    history.current = [];
    setStrokes([]);
    (supabase as any)
      .from("student_book_pages")
      .select("strokes")
      .eq("student_book_id", studentBookId)
      .eq("page_number", page)
      .maybeSingle()
      .then(({ data }: any) => { if (alive) setStrokes((data?.strokes as Stroke[]) || []); });
    const ch = supabase
      .channel(`sbp-${studentBookId}-${page}-${uid()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "student_book_pages", filter: `student_book_id=eq.${studentBookId}` }, (payload: any) => {
        const row = payload.new;
        if (!row || row.page_number !== page) return;
        if (Date.now() - lastLocal.current < 1200) return;
        setStrokes(row.strokes || []);
      })
      .subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [studentBookId, page]);

  const persist = useCallback((next: Stroke[]) => {
    lastLocal.current = Date.now();
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      lastLocal.current = Date.now();
      (supabase as any)
        .from("student_book_pages")
        .upsert({ student_book_id: studentBookId, page_number: page, strokes: next, updated_at: new Date().toISOString() }, { onConflict: "student_book_id,page_number" })
        .then(({ error }: any) => { if (error) console.error(error); });
    }, 350);
  }, [studentBookId, page]);

  const commit = (next: Stroke[]) => {
    history.current.push(strokes);
    if (history.current.length > 50) history.current.shift();
    setStrokes(next);
    persist(next);
  };

  const goto = (p: number) => {
    const n = Math.min(Math.max(1, p), total || info?.book?.total_pages || p);
    setPageState(n);
    setPageInput(String(n));
    onPageChange?.(n);
    if (syncPage) (supabase as any).from("student_books").update({ current_page: n }).eq("id", studentBookId).then(() => {});
  };

  const pageCount = total || info?.book?.total_pages || 1;
  const allPages = Array.from({ length: pageCount }, (_, index) => index + 1);
  const pagesScrollRef = useRef<HTMLDivElement | null>(null);

  const openPages = () => {
    setPageInput(String(page));
    setPagesOpen(true);
  };

  useEffect(() => {
    if (!pagesOpen) return;
    const timer = window.setTimeout(() => {
      pagesScrollRef.current
        ?.querySelector(`[data-page="${page}"]`)
        ?.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
    }, 60);
    return () => window.clearTimeout(timer);
  }, [pagesOpen, page]);

  const submitPage = (event: React.FormEvent) => {
    event.preventDefault();
    const requested = Number.parseInt(pageInput, 10);
    if (!Number.isFinite(requested)) return;
    goto(requested);
    setPagesOpen(false);
  };

  const pt = (e: React.PointerEvent): [number, number] => {
    const r = svgRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };

  /** Часткова гумка: вирізає лише шматок штриха під курсором. */
  const eraseAt = (x: number, y: number, list: Stroke[]) => {
    const R = 12;
    const out: Stroke[] = [];
    for (const s of list) {
      if (s.type === "text") {
        const lines = s.text.split("\n");
        const wMax = Math.max(...lines.map((l) => l.length)) * s.size * 0.6;
        const hit = x >= s.x - 6 && x <= s.x + wMax && y >= s.y - s.size && y <= s.y + (lines.length - 1) * s.size * 1.2 + 6;
        if (!hit) out.push(s);
        continue;
      }
      // densify so long segments can be cut in the middle
      const dense: [number, number][] = [];
      s.pts.forEach((p, i) => {
        if (i > 0) {
          const q = s.pts[i - 1];
          const n = Math.floor(Math.hypot(p[0] - q[0], p[1] - q[1]) / 4);
          for (let k = 1; k < n; k++) dense.push([q[0] + ((p[0] - q[0]) * k) / n, q[1] + ((p[1] - q[1]) * k) / n]);
        }
        dense.push(p);
      });
      if (!dense.some(([px, py]) => Math.hypot(px - x, py - y) < R)) { out.push(s); continue; }
      let cur: [number, number][] = [];
      let idx = 0;
      const flush = () => {
        if (cur.length > 1) out.push({ ...s, id: idx++ === 0 ? s.id : uid(), pts: cur });
        cur = [];
      };
      for (const p of dense) {
        if (Math.hypot(p[0] - x, p[1] - y) < R) flush();
        else cur.push(p);
      }
      flush();
    }
    return out;
  };

  /** Знайти надпис під курсором (для перетягування). */
  const textAt = (x: number, y: number) => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      const s = strokes[i];
      if (s.type !== "text") continue;
      const lines = s.text.split("\n");
      const wMax = Math.max(...lines.map((l) => l.length)) * s.size * 0.62;
      if (x >= s.x - 10 && x <= s.x + wMax + 10 && y >= s.y - s.size && y <= s.y + (lines.length - 1) * s.size * 1.2 + 8) return s;
    }
    return null;
  };

  const onDown = (e: React.PointerEvent) => {
    if (tool === "hand") return;
    e.preventDefault();
    const [x, y] = pt(e);
    if (tool === "move") {
      const t = textAt(x, y);
      if (!t || t.type !== "text") { setSelText(null); return; }
      setSelText(t.id);
      (e.target as Element).setPointerCapture?.(e.pointerId);
      history.current.push(strokes);
      moving.current = { id: t.id, dx: x - t.x, dy: y - t.y };
      return;
    }
    if (tool === "text") {
      // Якщо вже щось друкували — цей клік лише завершує напис
      // і перемикає на «Стрілку», а не створює новий текст.
      if (draftText) { finishText(); return; }
      setDraftText({ x, y, text: "" });
      window.setTimeout(() => textRef.current?.focus(), 30);
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (tool === "pen" || tool === "marker") {
      drawing.current = tool === "marker"
        ? { id: uid(), type: "path", pts: [[x, y]], color: "#FACC15", w: 16, op: 0.4 }
        : { id: uid(), type: "path", pts: [[x, y]], color, w: 3 };
      setStrokes((s) => [...s, drawing.current!]);
    } else if (tool === "erase") {
      history.current.push(strokes);
      drawing.current = { id: "erase", type: "path", pts: [], color: "", w: 0 };
      setStrokes((s) => eraseAt(x, y, s));
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const m = moving.current;
    if (m) {
      const [mx, my] = pt(e);
      setStrokes((s) => s.map((st) => (st.id === m.id && st.type === "text" ? { ...st, x: mx - m.dx, y: my - m.dy } : st)));
      return;
    }
    const d = drawing.current;
    if (!d) return;
    const [x, y] = pt(e);
    if ((tool === "pen" || tool === "marker") && d.type === "path") {
      d.pts.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
      setStrokes((s) => s.map((st) => (st.id === d.id ? { ...d, pts: [...d.pts] } : st)));
    } else if (tool === "erase") {
      setStrokes((s) => eraseAt(x, y, s));
    }
  };

  const onUp = () => {
    if (moving.current) {
      moving.current = null;
      setStrokes((s) => { persist(s); return s; });
      return;
    }
    if (!drawing.current) return;
    const wasPen = tool === "pen" || tool === "marker";
    drawing.current = null;
    setStrokes((s) => {
      if (wasPen) history.current.push(s.slice(0, -1));
      persist(s);
      return s;
    });
  };

  const finishText = () => {
    const d = draftText;
    setDraftText(null);
    if (!d) return;
    // після введення переходимо на «Стрілку», щоб наступний клік не створював новий напис
    setTool("move");
    if (!d.text.trim()) return;
    commit([...strokes, { id: uid(), type: "text", x: d.x, y: d.y, text: d.text, color, size: textSize }]);
  };

  const selectedStroke = selText ? strokes.find((s) => s.id === selText && s.type === "text") : null;
  const selectedTextSize = selectedStroke && selectedStroke.type === "text" ? selectedStroke.size : textSize;
  const changeTextSize = (delta: number) => {
    const next = Math.max(10, Math.min(96, selectedTextSize + delta));
    if (selectedStroke) {
      commit(strokes.map((s) => (s.id === selectedStroke.id && s.type === "text" ? { ...s, size: next } : s)));
    }
    setTextSize(next);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    setStrokes(prev);
    persist(prev);
  };

  if (!info) return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Відкриваю підручник…</div>;
  if (!info.book) return <p className="p-6 text-sm text-muted-foreground">Підручник недоступний.</p>;

  const cursor = tool === "hand" ? "grab" : tool === "move" ? "move" : tool === "text" ? "text" : "crosshair";
  const ToolBtn = ({ t, icon: I, label }: { t: Tool; icon: any; label: string }) => (
    <Button
      animated={false}
      variant={tool === t ? "default" : "outline"}
      size="icon"
      type="button"
      onClick={() => setTool(t)}
      title={label}
      aria-label={label}
      className={cn(
        "h-9 w-9 rounded-md",
        tool !== t && "bg-white text-slate-900 border-slate-200 hover:bg-slate-50",
      )}
    >
      <I className="w-4 h-4" />
    </Button>
  );

  const Divider = () => <div className="h-px w-6 bg-border" />;

  return (
    <div className="space-y-3 min-w-0">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <span className="font-display font-bold text-sm text-foreground truncate min-w-0" title={info.book.title}>📖 {info.book.title}</span>
        {allowNavigate && <span className="text-xs text-muted-foreground shrink-0">{page} / {total || "…"}</span>}
      </div>

      <div className="flex items-start gap-2 min-w-0">
        {/* Липка бічна рейка інструментів — завжди на екрані, скролити вгору не треба */}
        <div className="sticky top-2 z-20 flex w-11 shrink-0 flex-col items-center gap-1.5 rounded-md border border-border bg-card/95 p-1 shadow-sm backdrop-blur">
          <ToolBtn t="hand" icon={Hand} label="Рука" />
          <ToolBtn t="move" icon={MousePointer2} label="Стрілка" />
          <ToolBtn t="pen" icon={Pen} label="Олівець" />
          <ToolBtn t="marker" icon={Highlighter} label="Маркер" />
          <ToolBtn t="text" icon={Type} label="Текст" />
          <ToolBtn t="erase" icon={Eraser} label="Гумка" />
          <Divider />
          <div className="flex flex-col items-center gap-1" title="Розмір тексту (новий напис або вибраний стрілкою)">
            <Button animated={false} variant="outline" size="icon" type="button" title="Більший текст" onClick={() => changeTextSize(4)} className="h-7 w-9"><AArrowUp /></Button>
            <span className="text-[11px] text-muted-foreground text-center leading-none">{selectedTextSize}</span>
            <Button animated={false} variant="outline" size="icon" type="button" title="Менший текст" onClick={() => changeTextSize(-4)} className="h-7 w-9"><AArrowDown /></Button>
          </div>
          <Button animated={false} variant="outline" size="icon" type="button" onClick={undo} title="Скасувати" className="h-9 w-9"><Undo2 /></Button>
          <Divider />
          <div className="flex flex-col items-center gap-1.5 py-0.5">
            {COLORS.map((c) => (
              <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-primary scale-110" : "border-border"}`} style={{ background: c }} />
            ))}
          </div>
          <Divider />
          {allowNavigate && (
            <Button animated={false} variant="outline" size="icon" type="button" title="Вибрати сторінку" onClick={openPages} className="h-9 w-9">
              <LayoutGrid />
            </Button>
          )}
          <Button animated={false} variant="outline" size="icon" type="button" title="Зменшити" onClick={() => setZoom((z) => Math.max(0.6, Math.round((z - 0.2) * 10) / 10))} className="h-7 w-9"><Minus /></Button>
          <button type="button" title="Звичайний розмір" onClick={() => setZoom(1)} className="text-[10px] text-muted-foreground leading-none hover:text-foreground">{Math.round(zoom * 100)}%</button>
          <Button animated={false} variant="outline" size="icon" type="button" title="Збільшити" onClick={() => setZoom((z) => Math.min(3, Math.round((z + 0.2) * 10) / 10))} className="h-7 w-9"><Plus /></Button>
          {allowNavigate && (
            <>
              <Divider />
              <Button animated={false} variant="outline" size="icon" type="button" onClick={() => goto(page - 1)} disabled={page <= 1} title="Попередня сторінка" className="h-9 w-9"><ChevronLeft /></Button>
              <input
                type="number"
                value={page}
                min={1}
                onChange={(e) => goto(Number(e.target.value) || 1)}
                aria-label="Номер сторінки"
                className="w-9 h-8 rounded-md border border-border bg-background text-center text-xs text-foreground"
              />
              <Button animated={false} variant="outline" size="icon" type="button" onClick={() => goto(page + 1)} disabled={!!total && page >= total} title="Наступна сторінка" className="h-9 w-9"><ChevronRight /></Button>
            </>
          )}
        </div>

      <Dialog open={pagesOpen} onOpenChange={setPagesOpen}>
        <DialogContent className="flex h-[88dvh] max-w-5xl flex-col gap-0 overflow-hidden border-white/10 bg-[#0F172A] p-0 text-slate-100 shadow-2xl">
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 bg-white/5 px-4 py-3 sm:px-5">
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base font-semibold text-white">
                Сторінки · {info.book.title}
              </DialogTitle>
              <p className="text-xs text-slate-400">Усього {pageCount} сторінок · зараз відкрита {page}</p>
            </div>
            <form onSubmit={submitPage} className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={pageCount}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value)}
                aria-label="Номер сторінки"
                className="h-9 w-20 border-white/15 bg-white/10 text-center text-white placeholder:text-slate-500"
              />
              <Button animated={false} type="submit" size="sm" className="h-9">Перейти</Button>
            </form>
          </div>
          <div ref={pagesScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {allPages.map((pageNumber) => (
                <PageThumbnail
                  key={pageNumber}
                  filePath={info.book.file_path}
                  pageNumber={pageNumber}
                  active={pageNumber === page}
                  onSelect={() => { goto(pageNumber); setPagesOpen(false); }}
                />
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>

      <div className={`${continuous ? "overflow-x-auto" : "overflow-auto max-h-[78vh]"} rounded-md border border-border bg-muted/30 ${tool === "hand" ? "" : "touch-none"}`}>
        <div className="relative mx-auto w-full" style={{ maxWidth: `${Math.round(900 * zoom)}px`, minWidth: zoom > 1 ? `${Math.round(900 * zoom)}px` : undefined }}>
          <canvas ref={canvasRef} className="block w-full h-auto bg-white" />
          {rendering && <div className="absolute inset-0 flex items-center justify-center bg-background/40"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className="absolute inset-0 w-full h-full"
            style={{ cursor, pointerEvents: tool === "hand" ? "none" : "auto" }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={onUp}
          >
            {strokes.map((s) =>
              s.type === "path" ? (
                <polyline key={s.id} points={s.pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth={s.w} strokeOpacity={s.op ?? 1} strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <text key={s.id} x={s.x} y={s.y} fontSize={s.size} fill={s.color} fontFamily="Space Grotesk, sans-serif" fontWeight={600}>
                  {s.text.split("\n").map((line, i) => <tspan key={i} x={s.x} dy={i ? s.size * 1.2 : 0}>{line}</tspan>)}
                </text>
              ),
            )}
          </svg>
          {draftText && (
            <textarea
              ref={textRef}
              value={draftText.text}
              onChange={(e) => setDraftText({ ...draftText, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finishText(); }
                if (e.key === "Escape") setDraftText(null);
              }}
              onBlur={finishText}
              placeholder="Пишіть…"
              className="workbook-text-input absolute z-10 min-w-[40%] resize-none overflow-hidden bg-transparent p-0 ring-0 shadow-none focus:ring-0 focus:outline-none focus-visible:ring-0 placeholder:opacity-50"
              style={(() => {
                const scale = (svgRef.current?.getBoundingClientRect().width || W) / W;
                const fs = textSize * scale;
                return {
                  left: `${(draftText.x / W) * 100}%`,
                  top: `calc(${(draftText.y / H) * 100}% - ${fs * 0.95}px)`,
                  color, borderColor: color, caretColor: color,
                  fontSize: fs, lineHeight: 1.2, fontWeight: 600,
                  fontFamily: "Space Grotesk, sans-serif",
                };
              })()}
              rows={Math.max(1, draftText.text.split("\n").length)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
