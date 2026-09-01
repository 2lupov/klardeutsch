import { useEffect, useRef, useState } from "react";
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
import { ZoomIn, ZoomOut, Crosshair, Eye } from "lucide-react";

const MIN_W = 0.05;
const MAX_W = 8;

/**
 * Нескінченна дошка для учня: він може сам рухати полотно й зумити,
 * або слідувати за камерою вчителя. Своє положення транслює вчителю.
 */
export default function BoardStudentView({
  elements,
  className,
  onCamChange,
}: {
  elements: BoardEl[];
  className?: string;
  onCamChange?: (cam: BoardCam) => void;
}) {
  const teacherCam = camFromBoard(elements);
  const content = contentOfBoard(elements);

  const [follow, setFollow] = useState(true);
  const [ownCam, setOwnCam] = useState<BoardCam>(teacherCam);
  const cam = follow ? teacherCam : ownCam;

  const svgRef = useRef<SVGSVGElement | null>(null);
  const camRef = useRef(cam);
  const panning = useRef<{ fx: number; fy: number; cam: BoardCam } | null>(null);
  const lastCast = useRef(0);
  useEffect(() => { camRef.current = cam; }, [cam]);

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

  return (
    <div className={`relative ${className || ""}`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full touch-none select-none cursor-grab"
        style={{
          backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: `${24 / cam.w}px ${24 / cam.w}px`,
          backgroundPosition: `${(-cam.x / cam.w) * 100}% ${(-cam.y / cam.w) * 100}%`,
        }}
        onPointerDown={(e) => {
          const f = frac(e.clientX, e.clientY);
          panning.current = { fx: f.fx, fy: f.fy, cam: camRef.current };
        }}
        onPointerMove={(e) => {
          if (!panning.current) return;
          const f = frac(e.clientX, e.clientY);
          const s = panning.current;
          setCam({ x: s.cam.x - (f.fx - s.fx) * s.cam.w, y: s.cam.y - (f.fy - s.fy) * s.cam.w, w: s.cam.w });
        }}
        onPointerUp={() => { panning.current = null; report(camRef.current, false); }}
        onPointerLeave={() => { panning.current = null; }}
      >
        <g transform={camTransform(cam)}>
          {/* центр дошки */}
          <g stroke="hsl(var(--border))" strokeWidth={2 * cam.w} opacity={0.8}>
            <line x1={-30 * cam.w} y1={0} x2={30 * cam.w} y2={0} />
            <line x1={0} y1={-30 * cam.w} x2={0} y2={30 * cam.w} />
          </g>
          {content.map((el, i) => (
            <BoardElement key={el.id || i} el={el} />
          ))}
        </g>
      </svg>

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
