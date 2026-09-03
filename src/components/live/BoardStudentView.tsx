import { useEffect, useMemo, useRef, useState } from "react";
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
import { ZoomIn, ZoomOut, Crosshair, Eye, Pencil, Hand, Type, Eraser } from "lucide-react";

const MIN_W = 0.05;
const MAX_W = 8;
const COLORS = ["#4F46E5", "#DC2626", "#059669", "#F59E0B", "#0F172A"];
const uid = () => "s" + Math.random().toString(36).slice(2, 10);

type Tool = "pan" | "pen" | "text" | "erase";

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

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[0]);
  /** Локальні елементи учня — доки вчитель не поверне їх у спільній дошці. */
  const [mine, setMine] = useState<BoardEl[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [pxW, setPxW] = useState(BOARD_W);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const camRef = useRef(cam);
  const panning = useRef<{ fx: number; fy: number; cam: BoardCam } | null>(null);
  const drafting = useRef<BoardEl | null>(null);
  const lastCast = useRef(0);
  useEffect(() => { camRef.current = cam; }, [cam]);

  const serverIds = useMemo(() => new Set(content.map((e) => e.id)), [content]);
  const pending = mine.filter((e) => !serverIds.has(e.id));
  const all = [...content, ...pending];
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

  const frac = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { fx: (clientX - r.left) / r.width, fy: (clientY - r.top) / r.height };
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
    const ro = new ResizeObserver(() => setPxW(el.getBoundingClientRect().width || BOARD_W));
    ro.observe(el);
    setPxW(el.getBoundingClientRect().width || BOARD_W);
    return () => ro.disconnect();
  }, []);

  /* ─────────── малювання ─────────── */

  const onPointerDown = (e: React.PointerEvent) => {
    const f = frac(e.clientX, e.clientY);
    const p = world(e.clientX, e.clientY);

    if (tool === "pan") {
      panning.current = { fx: f.fx, fy: f.fy, cam: camRef.current };
      return;
    }

    if (tool === "pen") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      const el: BoardEl = { id: uid(), type: "stroke", color, width: 4 * cam.w, points: [p] };
      drafting.current = el;
      upsertMine(el, true);
      return;
    }

    if (tool === "text") {
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
    const d = drafting.current;
    if (d && tool === "pen") {
      const p = world(e.clientX, e.clientY);
      const next = { ...d, points: [...(d.points || []), p] };
      drafting.current = next;
      upsertMine(next, true);
    }
  };

  const endPointer = () => {
    panning.current = null;
    if (drafting.current) {
      onDraw?.(drafting.current, false);
      drafting.current = null;
    }
    report(camRef.current, false);
  };

  const setText = (id: string, text: string) => {
    const el = all.find((x) => x.id === id);
    if (!el) return;
    upsertMine({ ...el, text }, true);
  };

  const cursor = tool === "pan" ? "grab" : tool === "erase" ? "cell" : "crosshair";

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
          backgroundSize: `${24 / cam.w}px ${24 / cam.w}px`,
          backgroundPosition: `${(-cam.x / cam.w) * 100}% ${(-cam.y / cam.w) * 100}%`,
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
            <BoardElement key={el.id || i} el={el} />
          ))}
        </g>
      </svg>

      {editingEl && (
        <div
          className="absolute z-10"
          style={{
            left: `${((editingEl.x! - cam.x) / cam.w) * 100}%`,
            top: `${((editingEl.y! - cam.y) / cam.w) * 100 - ((editingEl.size || 0.045) / cam.w) * 100 * 0.95}%`,
            width: `${Math.min(60, Math.max(24, 100 - ((editingEl.x! - cam.x) / cam.w) * 100))}%`,
          }}
        >
          <textarea
            autoFocus
            rows={Math.max(1, String(editingEl.text || "").split("\n").length)}
            value={editingEl.text || ""}
            onChange={(e) => setText(editingEl.id!, e.target.value)}
            onBlur={() => setEditing(null)}
            onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
            placeholder="Пишіть…"
            className="w-full rounded-xl border-2 border-primary bg-card/95 shadow-lg px-2 py-1 outline-none resize-none overflow-hidden font-display font-semibold leading-tight"
            style={{
              color: editingEl.color || "#0F172A",
              fontSize: `${((editingEl.size || 0.045) * BOARD_H * (pxW / BOARD_W)) / cam.w}px`,
              lineHeight: 1.25,
            }}
          />
        </div>
      )}

      {/* панель інструментів учня */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-2xl bg-card/90 backdrop-blur border border-border p-1.5 shadow-sm">
        {([
          { k: "pen", icon: Pencil, title: "Малювати" },
          { k: "text", icon: Type, title: "Писати текст" },
          { k: "erase", icon: Eraser, title: "Стерти своє" },
          { k: "pan", icon: Hand, title: "Рухати полотно" },
        ] as { k: Tool; icon: any; title: string }[]).map(({ k, icon: Icon, title }) => (
          <button
            key={k}
            onClick={() => setTool(k)}
            title={title}
            className={`w-8 h-8 rounded-xl grid place-items-center ${
              tool === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
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

      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-2xl bg-card/90 backdrop-blur border border-border p-1.5 shadow-sm">
        <button
          onClick={() => zoomTo(cam.w / 1.25)}
          className="w-8 h-8 rounded-xl grid place-items-center text-muted-foreground hover:bg-muted"
          title="Збільшити"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomTo(cam.w * 1.25)}
          className="w-8 h-8 rounded-xl grid place-items-center text-muted-foreground hover:bg-muted"
          title="Зменшити"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => { setOwnCam({ x: 0, y: 0, w: 1 }); setFollow(false); report({ x: 0, y: 0, w: 1 }, false); }}
          className="w-8 h-8 rounded-xl grid place-items-center text-muted-foreground hover:bg-muted"
          title="До центру"
        >
          <Crosshair className="w-4 h-4" />
        </button>
        <button
          onClick={() => setFollow((f) => !f)}
          className={`h-8 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-medium ${
            follow ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          }`}
          title="Слідувати за вчителем"
        >
          <Eye className="w-3.5 h-3.5" />
          {follow ? "За вчителем" : "Вільно"}
        </button>
      </div>
    </div>
  );
}

/** Проста перевірка попадання по елементу (для гумки). */
function nearElement(el: BoardEl, p: { x: number; y: number }, camW: number) {
  const tol = 0.012 * camW;
  if ((el.type || "stroke") === "stroke") {
    return (el.points || []).some((q) => Math.abs(q.x - p.x) < tol && Math.abs(q.y - p.y) < tol);
  }
  const x = el.x || 0;
  const y = el.y || 0;
  if (el.type === "text") {
    const s = el.size || 0.045;
    return p.x > x - tol && p.x < x + s * 12 && p.y > y - s && p.y < y + s * 0.4;
  }
  const w = el.w || 0.2;
  const h = el.h || 0.2;
  return p.x > Math.min(x, x + w) - tol && p.x < Math.max(x, x + w) + tol &&
    p.y > Math.min(y, y + h) - tol && p.y < Math.max(y, y + h) + tol;
}
