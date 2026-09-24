import { useCallback, useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Hand, Pen, Eraser, Type, Undo2, Loader2, MousePointer2 } from "lucide-react";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Stroke =
  | { id: string; type: "path"; pts: [number, number][]; color: string; w: number }
  | { id: string; type: "text"; x: number; y: number; text: string; color: string; size: number };

type Tool = "hand" | "move" | "pen" | "erase" | "text";
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
}: {
  studentBookId: string;
  page?: number;
  onPageChange?: (p: number) => void;
  /** Записувати номер сторінки в спільний стан (учитель на живому уроці). */
  syncPage?: boolean;
  allowNavigate?: boolean;
}) {
  const [info, setInfo] = useState<StudentBookInfo | null>(null);
  const [page, setPageState] = useState(controlledPage ?? 1);
  const [total, setTotal] = useState(0);
  const [rendering, setRendering] = useState(false);
  const [aspect, setAspect] = useState(1.414);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [tool, setTool] = useState<Tool>("hand");
  const [color, setColor] = useState(COLORS[0]);
  const [draftText, setDraftText] = useState<{ x: number; y: number; text: string } | null>(null);
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
    onPageChange?.(n);
    if (syncPage) (supabase as any).from("student_books").update({ current_page: n }).eq("id", studentBookId).then(() => {});
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

  const onDown = (e: React.PointerEvent) => {
    if (tool === "hand") return;
    e.preventDefault();
    const [x, y] = pt(e);
    if (tool === "text") {
      if (draftText?.text.trim()) finishText();
      setDraftText({ x, y, text: "" });
      window.setTimeout(() => textRef.current?.focus(), 30);
      return;
    }
    (e.target as Element).setPointerCapture?.(e.pointerId);
    if (tool === "pen") {
      drawing.current = { id: uid(), type: "path", pts: [[x, y]], color, w: 3 };
      setStrokes((s) => [...s, drawing.current!]);
    } else if (tool === "erase") {
      history.current.push(strokes);
      drawing.current = { id: "erase", type: "path", pts: [], color: "", w: 0 };
      setStrokes((s) => eraseAt(x, y, s));
    }
  };

  const onMove = (e: React.PointerEvent) => {
    const d = drawing.current;
    if (!d) return;
    const [x, y] = pt(e);
    if (tool === "pen" && d.type === "path") {
      d.pts.push([Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
      setStrokes((s) => s.map((st) => (st.id === d.id ? { ...d, pts: [...d.pts] } : st)));
    } else if (tool === "erase") {
      setStrokes((s) => eraseAt(x, y, s));
    }
  };

  const onUp = () => {
    if (!drawing.current) return;
    const wasPen = tool === "pen";
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
    if (!d || !d.text.trim()) return;
    commit([...strokes, { id: uid(), type: "text", x: d.x, y: d.y, text: d.text, color, size: 22 }]);
  };

  const undo = () => {
    const prev = history.current.pop();
    if (!prev) return;
    setStrokes(prev);
    persist(prev);
  };

  if (!info) return <div className="p-6 text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Відкриваю підручник…</div>;
  if (!info.book) return <p className="p-6 text-sm text-muted-foreground">Підручник недоступний.</p>;

  const cursor = tool === "hand" ? "grab" : tool === "text" ? "text" : "crosshair";
  const ToolBtn = ({ t, icon: I, label }: { t: Tool; icon: any; label: string }) => (
    <button
      type="button"
      onClick={() => setTool(t)}
      title={label}
      className={`h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium border transition ${tool === t ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-foreground hover:bg-muted"}`}
    >
      <I className="w-4 h-4" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-2">
        <span className="font-display font-bold text-sm text-foreground truncate max-w-[220px]">📖 {info.book.title}</span>
        <div className="flex items-center gap-1 ml-auto">
          <ToolBtn t="hand" icon={Hand} label="Рука" />
          <ToolBtn t="pen" icon={Pen} label="Олівець" />
          <ToolBtn t="text" icon={Type} label="Текст" />
          <ToolBtn t="erase" icon={Eraser} label="Гумка" />
          <button type="button" onClick={undo} title="Назад" className="h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted"><Undo2 className="w-4 h-4" /></button>
        </div>
        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-primary scale-110" : "border-border"}`} style={{ background: c }} />
          ))}
        </div>
        {allowNavigate && (
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => goto(page - 1)} disabled={page <= 1} className="h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center disabled:opacity-40"><ChevronLeft className="w-4 h-4" /></button>
            <input
              type="number"
              value={page}
              min={1}
              onChange={(e) => goto(Number(e.target.value) || 1)}
              className="w-16 h-9 rounded-lg border border-border bg-background text-center text-sm text-foreground"
            />
            <span className="text-xs text-muted-foreground">/ {total || "…"}</span>
            <button type="button" onClick={() => goto(page + 1)} disabled={!!total && page >= total} className="h-9 w-9 rounded-lg border border-border bg-card flex items-center justify-center disabled:opacity-40"><ChevronRight className="w-4 h-4" /></button>
          </div>
        )}
        {!allowNavigate && <span className="text-xs text-muted-foreground">Сторінка {page}</span>}
      </div>

      <div className={`overflow-auto rounded-xl border border-border bg-muted/30 max-h-[78vh] ${tool === "hand" ? "" : "touch-none"}`}>
        <div className="relative mx-auto w-full max-w-[900px]">
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
                <polyline key={s.id} points={s.pts.map((p) => p.join(",")).join(" ")} fill="none" stroke={s.color} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" />
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
              className="absolute z-10 min-w-[40%] resize-none overflow-hidden border-0 border-l-2 border-dashed bg-transparent p-0 outline-none placeholder:opacity-50"
              style={(() => {
                const scale = (svgRef.current?.getBoundingClientRect().width || W) / W;
                const fs = 22 * scale;
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
