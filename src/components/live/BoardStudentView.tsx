import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BoardEl,
  BoardElement,
  BOARD_W,
  BOARD_H,
  BoardCam,
  camFromBoard,
  contentOfBoard,
  camTransform,
} from "./BoardRender";
import { eraseAt } from "./board-erase";
import { ZoomIn, ZoomOut, Crosshair, Eye, Pencil, Hand, Type, Eraser, MousePointer2, Highlighter } from "lucide-react";
import { Button } from "@/components/ui/button";

const MIN_W = 0.05;
const MAX_W = 8;
const COLORS = ["#4F46E5", "#DC2626", "#059669", "#F59E0B", "#0F172A"];
const MARKER_COLOR = "#FACC15";
const uid = () => "s" + Math.random().toString(36).slice(2, 10);

type Tool = "select" | "pan" | "pen" | "marker" | "text" | "erase";

/** Стікер-курсори: олівець і гумка їдуть точно за мишкою (кінчик = гаряча точка). */
const PEN_CURSOR =
  "url(\"data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><g transform="translate(2,2)"><path d="M2 30l1.6-6.2L21.4 6l4.6 4.6L8.2 28.4z" fill="%23FACC15" stroke="%230F172A" stroke-width="1.6" stroke-linejoin="round"/><path d="M21.4 6l3-3a2.2 2.2 0 013.2 0l1.4 1.4a2.2 2.2 0 010 3.2l-3 3z" fill="%230F172A"/><path d="M2 30l5.2-1.4L3.6 25z" fill="%230F172A"/></g></svg>`,
  ) +
  "\") 2 34, crosshair";
const ERASER_CURSOR =
  "url(\"data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><g transform="translate(3,3)"><rect x="4" y="14" width="20" height="12" rx="3" transform="rotate(-35 14 20)" fill="%23F9A8D4" stroke="%230F172A" stroke-width="1.6"/><rect x="14" y="6" width="12" height="12" rx="2.5" transform="rotate(-35 20 12)" fill="%23E5E7EB" stroke="%230F172A" stroke-width="1.6"/></g></svg>`,
  ) +
  "\") 6 30, cell";


/**
 * Нескінченна дошка для учня: він може сам рухати полотно, зумити,
 * а також писати й малювати — все летить вчителю в реальному часі.
 */
export default function BoardStudentView({
  elements,
  className,
  onCamChange,
  onDraw,
  onErase,
}: {
  elements: BoardEl[];
  className?: string;
  onCamChange?: (cam: BoardCam) => void;
  /** Надсилає елемент учня вчителю (live = проміжний стан під час малювання). */
  onDraw?: (el: BoardEl, live?: boolean) => void;
  onErase?: (id: string) => void;
}) {
  const teacherCam = camFromBoard(elements);
  const content = contentOfBoard(elements);

  const [follow, setFollow] = useState(true);
  const [ownCam, setOwnCam] = useState<BoardCam>(teacherCam);
  const cam = follow ? teacherCam : ownCam;

  const [tool, setTool] = useState<Tool>("pan");
  const [color, setColor] = useState(COLORS[0]);
  /** Локальні елементи учня — доки вчитель не поверне їх у спільній дошці. */
  const [mine, setMine] = useState<BoardEl[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  /** Стерті учнем елементи — ховаємо одразу, не чекаючи вчителя. */
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  /** Геометрія SVG: масштаб і зсуви через preserveAspectRatio="slice". */
  const [view, setView] = useState({ s: 1, dx: 0, dy: 0 });


  const svgRef = useRef<SVGSVGElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const editStartRef = useRef(0);
  const camRef = useRef(cam);
  const panning = useRef<{ fx: number; fy: number; cam: BoardCam } | null>(null);
  const drafting = useRef<BoardEl | null>(null);
  const erasing = useRef(false);
  const allRef = useRef<BoardEl[]>([]);
  const lastCast = useRef(0);
  useEffect(() => { camRef.current = cam; }, [cam]);

  useLayoutEffect(() => {
    if (!editing) return;
    editStartRef.current = Date.now();
    const input = textInputRef.current;
    if (!input) return;
    const focus = () => {
      input.focus({ preventScroll: true });
      input.setSelectionRange(input.value.length, input.value.length);
    };
    focus();
    const t = window.setTimeout(focus, 30);
    return () => window.clearTimeout(t);
  }, [editing]);

  /** Обчислює масштаб/зсув: viewBox масштабується "cover", тому центрується й обрізається. */
  const measure = () => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const s = Math.max(r.width / BOARD_W, r.height / BOARD_H);
    setView({ s, dx: (r.width - BOARD_W * s) / 2, dy: (r.height - BOARD_H * s) / 2 });
  };

  useLayoutEffect(() => { measure(); }, []);


  const serverIds = useMemo(() => new Set(content.map((e) => e.id)), [content]);
  const mineById = new Map(mine.map((e) => [e.id, e]));
  const pending = mine.filter((e) => !serverIds.has(e.id) && !hidden.has(e.id!));
  const all = [
    ...content.filter((e) => !hidden.has(e.id!)).map((e) => mineById.get(e.id) || e),
    ...pending,
  ];
  allRef.current = all;
  const editingEl = all.find((e) => e.id === editing && e.type === "text");

  const report = (c: BoardCam, throttle = true) => {
    const now = Date.now();
    if (throttle && now - lastCast.current < 120) return;
    lastCast.current = now;
    onCamChange?.(c);
  };

  useEffect(() => { report(cam, false); }, [follow]);

  const setCam = (c: BoardCam) => {
    setFollow(false);
    setOwnCam(c);
    camRef.current = c;
    report(c);
  };

  /**
   * Частки всередині viewBox (0..1 по 1000x750). Враховує "cover"-обрізання,
   * інакше малюнок зʼїжджав вище/нижче за мишку.
   */
  const frac = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    const s = Math.max(r.width / BOARD_W, r.height / BOARD_H) || 1;
    const dx = (r.width - BOARD_W * s) / 2;
    const dy = (r.height - BOARD_H * s) / 2;
    return {
      fx: (clientX - r.left - dx) / (BOARD_W * s),
      fy: (clientY - r.top - dy) / (BOARD_H * s),
    };
  };


  const world = (clientX: number, clientY: number) => {
    const { fx, fy } = frac(clientX, clientY);
    const c = camRef.current;
    return { x: c.x + fx * c.w, y: c.y + fy * c.w };
  };

  const upsertMine = (el: BoardEl, live = false) => {
    setMine((m) => {
      const i = m.findIndex((x) => x.id === el.id);
      if (i === -1) return [...m, el];
      const next = m.slice();
      next[i] = el;
      return next;
    });
    onDraw?.(el, live);
  };

  const moving = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null);
  const touchedByErase = useRef<Set<string>>(new Set());

  /**
   * Гумка учня: стирає частину будь-якого штриха на дошці (і свого, і вчителя),
   * а надпис під гумкою прибирає цілим словом.
   */
  const eraseAtPoint = (p: { x: number; y: number }) => {
    const cur = allRef.current;
    if (cur.length === 0) return;
    const radius = (14 * camRef.current.w) / (BOARD_W * (view.s || 1));
    const r = eraseAt(cur, p, radius, undefined);
    const removed = new Set(r.removed);
    // тексти під гумкою
    for (const el of r.next) {
      if (el.type !== "text" || !el.id) continue;
      const size = el.size || 0.045;
      const lines = String(el.text || " ").split("\n");
      const wN = (Math.max(2, ...lines.map((l) => l.length)) * size * 0.6 * BOARD_H) / BOARD_W;
      const x0 = el.x || 0, y0 = (el.y || 0) - size;
      const y1 = y0 + size * 1.35 * lines.length;
      if (p.x >= x0 - radius && p.x <= x0 + wN + radius && p.y >= y0 - radius && p.y <= y1 + radius) removed.add(el.id);
    }
    if (!r.changed && removed.size === 0) return;
    allRef.current = r.next.filter((el) => !removed.has(el.id!));
    setHidden((h) => { const n = new Set(h); removed.forEach((id) => n.add(id)); return n; });
    setMine((m) => [...m.filter((x) => !removed.has(x.id!) && !r.upserted.some((u) => u.id === x.id)), ...r.upserted]);
    removed.forEach((id) => onErase?.(id));
    r.upserted.forEach((el) => { if (el.id) touchedByErase.current.add(el.id); onDraw?.(el, true); });
  };

  const zoomTo = (nextW: number, fx = 0.5, fy = 0.5) => {
    const c = camRef.current;
    const w = Math.min(MAX_W, Math.max(MIN_W, nextW));
    const wx = c.x + fx * c.w;
    const wy = c.y + fy * c.w;
    setCam({ x: wx - fx * w, y: wy - fy * w, w });
  };

  const wheelRef = useRef((e: WheelEvent) => {});
  wheelRef.current = (e: WheelEvent) => {
    const { fx, fy } = frac(e.clientX, e.clientY);
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      zoomTo(camRef.current.w * Math.exp(e.deltaY * unit * 0.002), fx, fy);
      return;
    }
    const c = camRef.current;
    setCam({ x: c.x + (e.deltaX * unit * c.w) / 1000, y: c.y + (e.deltaY * unit * c.w) / 1000, w: c.w });
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); wheelRef.current(e); };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);


  /* ─────────── малювання ─────────── */

  const onPointerDown = (e: React.PointerEvent) => {
    const f = frac(e.clientX, e.clientY);
    const p = world(e.clientX, e.clientY);

    // Після введення тексту клік деінде лише завершує напис і дає «Стрілку»
    if (editing) {
      setEditing(null);
      setTool("select");
      return;
    }

    if (tool === "select") {
      const idAttr = ((e.target as Element).closest?.("[data-el-id]") as Element | null)?.getAttribute("data-el-id");
      const el = idAttr ? allRef.current.find((x) => x.id === idAttr) : null;
      if (el && el.type === "text") {
        (e.target as Element).setPointerCapture?.(e.pointerId);
        moving.current = { id: el.id!, dx: p.x - (el.x || 0), dy: p.y - (el.y || 0), moved: false };
        return;
      }
      panning.current = { fx: f.fx, fy: f.fy, cam: camRef.current };
      return;
    }

    if (tool === "pan") {
      panning.current = { fx: f.fx, fy: f.fy, cam: camRef.current };
      return;
    }

    if (tool === "pen" || tool === "marker") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const el: BoardEl = tool === "marker"
        ? { id: uid(), type: "stroke", color: MARKER_COLOR, width: 18 * cam.w, opacity: 0.4, points: [p] }
        : { id: uid(), type: "stroke", color, width: 4 * cam.w, points: [p] };
      drafting.current = el;
      upsertMine(el, true);
      return;
    }

    if (tool === "text") {
      e.preventDefault(); // інакше клік забирає фокус і поле одразу закривається
      const el: BoardEl = { id: uid(), type: "text", x: p.x, y: p.y, text: "", color, size: 0.045 * cam.w };
      upsertMine(el);
      setEditing(el.id!);
      return;
    }

    if (tool === "erase") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      erasing.current = true;
      eraseAtPoint(p);
    }
  };


  const onPointerMove = (e: React.PointerEvent) => {
    if (panning.current) {
      const f = frac(e.clientX, e.clientY);
      const s = panning.current;
      setCam({ x: s.cam.x - (f.fx - s.fx) * s.cam.w, y: s.cam.y - (f.fy - s.fy) * s.cam.w, w: s.cam.w });
      return;
    }
    const mv = moving.current;
    if (mv) {
      const el = allRef.current.find((x) => x.id === mv.id);
      if (!el) return;
      const p = world(e.clientX, e.clientY);
      mv.moved = true;
      upsertMine({ ...el, x: p.x - mv.dx, y: p.y - mv.dy }, true);
      return;
    }
    if (erasing.current) { eraseAtPoint(world(e.clientX, e.clientY)); return; }
    const d = drafting.current;
    if (d && (tool === "pen" || tool === "marker")) {
      const p = world(e.clientX, e.clientY);
      const next = { ...d, points: [...(d.points || []), p] };
      drafting.current = next;
      upsertMine(next, true);
    }
  };

  const endPointer = () => {
    panning.current = null;
    const mv = moving.current;
    if (mv) {
      moving.current = null;
      const el = allRef.current.find((x) => x.id === mv.id);
      if (el && mv.moved) onDraw?.(el, false);
      else if (el) setEditing(el.id!); // клік без руху — редагувати текст
    }
    if (erasing.current) {
      erasing.current = false;
      allRef.current.filter((el) => (el.type || "stroke") === "stroke" || el.type === "text")
        .forEach((el) => { if (touchedByErase.current.has(el.id!)) onDraw?.(el, false); });
      touchedByErase.current.clear();
    }
    if (drafting.current) {
      onDraw?.(drafting.current, false);
      drafting.current = null;
    }
    report(camRef.current, false);
  };

  const setText = (id: string, text: string) => {
    const el = allRef.current.find((x) => x.id === id);
    if (!el) return;
    upsertMine({ ...el, text }, true);
  };

  const cursor =
    tool === "pan" ? "grab" : tool === "select" ? "default" : tool === "erase" ? ERASER_CURSOR : tool === "pen" || tool === "marker" ? PEN_CURSOR : "text";


  return (
    <div className={`relative ${className || ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full touch-none select-none"
        style={{
          cursor,
          backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: `${(24 * view.s) / cam.w}px ${(24 * view.s) / cam.w}px`,
          backgroundPosition: `${view.dx - (cam.x / cam.w) * BOARD_W * view.s}px ${view.dy - (cam.y / cam.w) * BOARD_H * view.s}px`,

        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerLeave={endPointer}
      >
        <g transform={camTransform(cam)}>
          {/* центр дошки */}
          <g stroke="hsl(var(--border))" strokeWidth={2 * cam.w} opacity={0.8}>
            <line x1={-30 * cam.w} y1={0} x2={30 * cam.w} y2={0} />
            <line x1={0} y1={-30 * cam.w} x2={0} y2={30 * cam.w} />
          </g>
          {all.map((el, i) => (
            editing === el.id ? null : (
              <g key={el.id || i} data-el-id={el.id}>
                <BoardElement el={el} />
              </g>
            )
          ))}
        </g>
      </svg>

      {editingEl && (() => {
        const fs = ((editingEl.size || 0.045) * BOARD_H * view.s) / cam.w;
        const leftPx = view.dx + (((editingEl.x || 0) - cam.x) / cam.w) * BOARD_W * view.s;
        const topPx = view.dy + (((editingEl.y || 0) - cam.y) / cam.w) * BOARD_H * view.s - fs * 0.93;
        const boxW = BOARD_W * view.s + 2 * view.dx;

        const lines = Math.max(1, String(editingEl.text || "").split("\n").length);
        const cols = Math.max(6, ...String(editingEl.text || "").split("\n").map((l) => l.length + 2));
        return (
          <div
            key={editingEl.id}
            className="absolute z-20"
            style={{ left: Math.max(0, leftPx), top: Math.max(0, topPx) }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              ref={textInputRef}
              rows={lines}
              value={editingEl.text || ""}
              onChange={(e) => {
                const id = editingEl.id;
                if (id) setText(id, e.target.value);
              }}
              onBlur={(e) => { if (Date.now() - (editStartRef.current || 0) < 300) { e.currentTarget.focus(); return; } setEditing(null); setTool("select"); }}
              onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
              placeholder="Пишіть…"
              spellCheck={false}
              className="workbook-text-input bg-transparent border-0 outline-none resize-none overflow-hidden font-display font-semibold p-0 m-0 placeholder:text-muted-foreground/40"
              style={{
                color: editingEl.color || "#0F172A",
                fontSize: `${fs}px`,
                lineHeight: 1.25,
                caretColor: editingEl.color || "#0F172A",
                width: `${Math.max(fs * 4, Math.min(boxW - leftPx - 4, fs * 0.62 * cols))}px`,
                height: `${fs * 1.25 * lines + 2}px`,
                fontFamily: "Space Grotesk, system-ui, sans-serif",
              }}
            />
          </div>
        );
      })()}

      {/* панель інструментів учня */}
        <div className="absolute top-3 left-3 right-12 sm:right-auto flex flex-wrap items-center gap-1.5 rounded-md bg-card/90 backdrop-blur border border-border p-1.5 shadow-sm sm:max-w-[calc(100%-1.5rem)]">
        {([
          { k: "select", icon: MousePointer2, title: "Стрілка — перемістити текст" },
          { k: "pan", icon: Hand, title: "Рухати полотно" },
          { k: "pen", icon: Pencil, title: "Малювати" },
          { k: "marker", icon: Highlighter, title: "Жовтий маркер — виділити слова" },
          { k: "text", icon: Type, title: "Писати текст" },
          { k: "erase", icon: Eraser, title: "Гумка" },
        ] as { k: Tool; icon: any; title: string }[]).map(({ k, icon: Icon, title }) => (

          <Button
            animated={false}
            variant={tool === k ? "default" : "ghost"}
            size="icon"
            key={k}
            onClick={() => setTool(k)}
            title={title}
            className="w-8 h-8 rounded-md"
          >
            <Icon className="w-4 h-4" />
          </Button>
        ))}
        <span className="w-px h-6 bg-border mx-0.5" />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`w-6 h-6 rounded-lg border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
            style={{ background: c }}
            title="Колір"
          />
        ))}
      </div>

       <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-card/90 backdrop-blur border border-border p-1.5 shadow-sm max-w-[calc(100%-1.5rem)]">
         <Button animated={false} variant="ghost" size="icon"
          onClick={() => zoomTo(cam.w / 1.25)}
           className="w-8 h-8"
          title="Збільшити"
        >
          <ZoomIn className="w-4 h-4" />
         </Button>
         <Button animated={false} variant="ghost" size="icon"
          onClick={() => zoomTo(cam.w * 1.25)}
           className="w-8 h-8"
          title="Зменшити"
        >
          <ZoomOut className="w-4 h-4" />
         </Button>
         <Button animated={false} variant="ghost" size="icon"
          onClick={() => { setOwnCam({ x: 0, y: 0, w: 1 }); setFollow(false); report({ x: 0, y: 0, w: 1 }, false); }}
           className="w-8 h-8"
          title="До центру"
        >
          <Crosshair className="w-4 h-4" />
         </Button>
         <Button animated={false} variant={follow ? "default" : "ghost"}
          onClick={() => setFollow((f) => !f)}
           className="h-8 px-2.5 rounded-md text-xs font-medium"
          title="Слідувати за вчителем"
        >
          <Eye className="w-3.5 h-3.5" />
          {follow ? "За вчителем" : "Вільно"}
         </Button>
      </div>
    </div>
  );
}
