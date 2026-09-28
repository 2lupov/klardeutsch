import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  BoardEl,
  BoardElement,
  BOARD_W,
  BOARD_H,
  BoardCam,
  camFromBoard,
  contentOfBoard,
  camToEl,
  camTransform,
  DEFAULT_CAM,
} from "./BoardRender";
import { eraseAt } from "./board-erase";

import {
  MousePointer2,
  Hand,
  Pen,
  Type,
  Square as SquareIcon,
  Circle,
  ArrowUpRight,
  Minus,
  Image as ImageIcon,
  Eraser,
  Highlighter,
  Undo2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Crosshair,
  Eye,
} from "lucide-react";

type Tool = "select" | "pan" | "pen" | "marker" | "text" | "rect" | "ellipse" | "arrow" | "line" | "erase";

const COLORS = ["#0F172A", "#4F46E5", "#DC2626", "#059669", "#F59E0B", "#DB2777"];
const uid = () => Math.random().toString(36).slice(2, 10);
const MIN_W = 0.05; // max zoom in
const MAX_W = 8; // max zoom out

export interface BoardApi {
  /** Places an image on the infinite board (centered in the current viewport). */
  insertImage: (url: string) => void;
}

export default function BoardEditor({
  classId,
  initial,
  apiRef,
  studentId,
  compact = false,
  className = "",
}: {
  classId: string;
  initial: BoardEl[];
  apiRef?: React.MutableRefObject<BoardApi | null>;
  /** Якщо передано — дошка зберігається в student_boards учня (спільна з кабінетом учня). */
  studentId?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const [els, setEls] = useState<BoardEl[]>(() => contentOfBoard(initial));
  const [cam, setCam] = useState<BoardCam>(() => camFromBoard(initial));
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[1]);
  const [width, setWidth] = useState(4);
  const [selected, setSelected] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dropHint, setDropHint] = useState(false);
  const [pxW, setPxW] = useState(BOARD_W);
  const [stuCam, setStuCam] = useState<BoardCam | null>(null);


  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const editStartRef = useRef(0);
  const drafting = useRef<BoardEl | null>(null);
  const dragging = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const resizing = useRef<{
    id: string;
    x0: number;
    y0: number;
    w0: number;
    h0: number;
    size0?: number;
    px0?: number;
    py0?: number;
    lines?: number;
  } | null>(null);

  const panning = useRef<{ fx: number; fy: number; cam: BoardCam } | null>(null);
  const erasing = useRef(false);
  const saveTimer = useRef<any>(null);
  const lastCast = useRef(0);


  const elsRef = useRef(els);
  const camRef = useRef(cam);
  useEffect(() => { elsRef.current = els; }, [els]);
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

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (svg) setPxW(svg.getBoundingClientRect().width || BOARD_W);
  }, []);

  // Завантажуємо актуальну дошку з БД (щоб перехід між розділами нічого не стирав)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let board: BoardEl[] = [];
      if (studentId) {
        const { data } = await (supabase as any).from("student_boards").select("elements").eq("user_id", studentId).maybeSingle();
        if (cancelled) return;
        board = (data?.elements || []) as BoardEl[];
      } else {
        const { data } = await supabase.from("live_classes").select("board").eq("id", classId).maybeSingle();
        if (cancelled || !data) return;
        board = ((data as any).board || []) as BoardEl[];
      }
      const content = contentOfBoard(board);
      const c = camFromBoard(board);
      setEls(content);
      elsRef.current = content;
      setCam(c);
      camRef.current = c;
    })();
    return () => { cancelled = true; };
  }, [classId, studentId]);

  // Live broadcast channel — миттєва передача дошки учню
  const chanRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  useEffect(() => {
    const ch = supabase.channel(`live-board:${classId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "studentcam" }, ({ payload }: any) => {
      if (payload?.cam) setStuCam(payload.cam as BoardCam);
    });
    // Учень теж пише/малює — приймаємо його елементи й зберігаємо у спільній дошці
    ch.on("broadcast", { event: "studentdraw" }, ({ payload }: any) => {
      const el = payload?.el as BoardEl | undefined;
      if (!el?.id) return;
      const cur = elsRef.current;
      const i = cur.findIndex((x) => x.id === el.id);
      const next = i === -1 ? [...cur, el] : cur.map((x) => (x.id === el.id ? el : x));
      setEls(next);
      elsRef.current = next;
      persist(next, camRef.current);
    });
    ch.on("broadcast", { event: "studenterase" }, ({ payload }: any) => {
      const id = payload?.id as string | undefined;
      if (!id) return;
      const next = elsRef.current.filter((x) => x.id !== id);
      setEls(next);
      elsRef.current = next;
      persist(next, camRef.current);
    });

    ch.subscribe();
    chanRef.current = ch;
    return () => { supabase.removeChannel(ch); chanRef.current = null; };
  }, [classId]);


  const fullBoard = (content: BoardEl[], c: BoardCam) => [camToEl(c), ...content];

  const broadcast = (content: BoardEl[], c: BoardCam) => {
    chanRef.current?.send({ type: "broadcast", event: "board", payload: { board: fullBoard(content, c) } });
  };

  const persist = (content: BoardEl[], c: BoardCam) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const full = fullBoard(content, c) as any;
      if (studentId) {
        void (supabase as any)
          .from("student_boards")
          .upsert({ user_id: studentId, elements: full })
          .then(({ error }: any) => { if (error) console.error("board save failed", error); });
        return;
      }
      void supabase
        .from("live_classes")
        .update({ board: full })
        .eq("id", classId)
        .then(({ error }) => { if (error) console.error("board save failed", error); });
    }, 400);
  };

  const sync = (content: BoardEl[], c: BoardCam, live = false) => {
    if (live) {
      const now = Date.now();
      if (now - lastCast.current > 60) { lastCast.current = now; broadcast(content, c); }
    } else {
      broadcast(content, c);
    }
    persist(content, c);
  };

  const commit = (next: BoardEl[], live = false) => {
    setEls(next);
    elsRef.current = next;
    sync(next, camRef.current, live);
  };

  /** Гумка стирає частину штриха під курсором (як у Miro). */
  const eraseAtPoint = (p: { x: number; y: number }) => {
    // Перетворюємо екранний радіус гумки у координати нескінченної дошки.
    // Раніше сюди потрапляло значення 10+ world units, тому весь штрих
    // опинявся всередині гумки та зникав одним дотиком.
    const radius = (Math.max(10, width * 1.8) / BOARD_W) * camRef.current.w;
    const r = eraseAt(elsRef.current, p, radius, undefined);
    if (!r.changed) return;
    commit(r.next, true);
  };


  const setCamera = (next: BoardCam, live = true) => {
    setCam(next);
    camRef.current = next;
    sync(elsRef.current, next, live);
  };

  /* ─────────── coordinates ─────────── */

  const frac = (clientX: number, clientY: number) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { fx: (clientX - r.left) / r.width, fy: (clientY - r.top) / r.height };
  };

  const world = (clientX: number, clientY: number) => {
    const { fx, fy } = frac(clientX, clientY);
    const c = camRef.current;
    return { x: c.x + fx * c.w, y: c.y + fy * c.w };
  };

  /* ─────────── zoom / pan ─────────── */

  const zoomTo = (nextW: number, fx = 0.5, fy = 0.5) => {
    const c = camRef.current;
    const w = Math.min(MAX_W, Math.max(MIN_W, nextW));
    const wx = c.x + fx * c.w;
    const wy = c.y + fy * c.w;
    setCamera({ x: wx - fx * w, y: wy - fy * w, w });
  };

  const wheelRef = useRef((e: WheelEvent) => {});
  wheelRef.current = (e: WheelEvent) => {
    const { fx, fy } = frac(e.clientX, e.clientY);
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1;
    if (e.ctrlKey || e.metaKey) {
      zoomTo(camRef.current.w * Math.exp(e.deltaY * unit * 0.0025), fx, fy);
      return;
    }
    if (e.shiftKey) {
      zoomTo(camRef.current.w * Math.exp(e.deltaY * unit * 0.0015), fx, fy);
      return;
    }
    const c = camRef.current;
    setCamera({
      x: c.x + (e.deltaX * unit * c.w) / 1000,
      y: c.y + (e.deltaY * unit * c.w) / 1000,
      w: c.w,
    });
  };

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => { e.preventDefault(); wheelRef.current(e); };
    el.addEventListener("wheel", onWheel, { passive: false });
    const ro = new ResizeObserver(() => setPxW(el.getBoundingClientRect().width || BOARD_W));
    ro.observe(el);
    setPxW(el.getBoundingClientRect().width || BOARD_W);
    return () => { el.removeEventListener("wheel", onWheel); ro.disconnect(); };
  }, []);

  const fitAll = () => {
    const boxes: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const el of elsRef.current) {
      if (el.type === "stroke") {
        for (const p of el.points || []) boxes.push({ x1: p.x, y1: p.y, x2: p.x, y2: p.y });
      } else {
        const x1 = Math.min(el.x || 0, (el.x || 0) + (el.w || 0));
        const y1 = Math.min(el.y || 0, (el.y || 0) + (el.h || 0));
        boxes.push({
          x1,
          y1,
          x2: x1 + Math.abs(el.w || (el.type === "text" ? 0.25 : 0.2)),
          y2: y1 + Math.abs(el.h || (el.type === "text" ? (el.size || 0.045) * 1.4 : 0.2)),
        });
      }
    }
    if (!boxes.length) { setCamera(DEFAULT_CAM); return; }
    const x1 = Math.min(...boxes.map((b) => b.x1));
    const y1 = Math.min(...boxes.map((b) => b.y1));
    const x2 = Math.max(...boxes.map((b) => b.x2));
    const y2 = Math.max(...boxes.map((b) => b.y2));
    const w = Math.min(MAX_W, Math.max(MIN_W, Math.max(x2 - x1, y2 - y1) * 1.15));
    setCamera({ x: (x1 + x2) / 2 - w / 2, y: (y1 + y2) / 2 - w / 2, w });
  };

  /* ─────────── imperative API ─────────── */

  const placeImage = (url: string, at?: { x: number; y: number }) => {
    const c = camRef.current;
    const put = (ratio: number) => {
      let w = c.w * 0.7;
      let h = (w * BOARD_W * ratio) / BOARD_H;
      if (h > c.w * 0.9) { h = c.w * 0.9; w = (h * BOARD_H) / ratio / BOARD_W; }
      const x = at ? at.x - w / 2 : c.x + (c.w - w) / 2;
      const y = at ? at.y - h / 2 : c.y + (c.w - h) / 2;
      const el: BoardEl = { id: uid(), type: "image", url, x, y, w, h };
      // images go behind strokes / text
      commit([el, ...elsRef.current]);
      setSelected(el.id!);
      setTool("select");
    };
    const img = new Image();
    img.onload = () => put(img.height / img.width || 1.4);
    img.onerror = () => put(1.4);
    img.src = url;
  };

  const insertImage = (url: string) => placeImage(url);

  useEffect(() => {
    if (!apiRef) return;
    apiRef.current = { insertImage };
    return () => { apiRef.current = null; };
  });

  /* ─────────── pointer interaction ─────────── */

  const onDown = (e: React.PointerEvent) => {
    if (editing) setEditing(null);
    const p = world(e.clientX, e.clientY);
    const targetEl = e.target as SVGElement;
    const handle = targetEl.getAttribute?.("data-handle");
    const idAttr = (targetEl.closest("[data-el-id]") as SVGElement | null)?.getAttribute("data-el-id") || null;

    // middle mouse or pan tool → pan
    if (tool === "pan" || e.button === 1) {
      const f = frac(e.clientX, e.clientY);
      panning.current = { fx: f.fx, fy: f.fy, cam: camRef.current };
      return;
    }

    if (handle && selected) {
      const el = els.find((x) => x.id === selected);
      if (el) {
        resizing.current = {
          id: el.id!,
          x0: el.x || 0,
          y0: el.y || 0,
          w0: el.w || 0.2,
          h0: el.h || 0.2,
          size0: el.size,
          px0: p.x,
          py0: p.y,
          lines: Math.max(1, String(el.text || " ").split("\n").length),
        };

        return;
      }
    }

    if (tool === "erase") {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      erasing.current = true;
      eraseAtPoint(p);
      return;
    }


    if (tool === "select") {
      setSelected(idAttr);
      if (idAttr) {
        const el = els.find((x) => x.id === idAttr)!;
        if (el.type === "stroke") return;
        // текст: клік по вже виділеному тексті — одразу редагування прямо на дошці
        if (el.type === "text" && selected === idAttr) {
          setEditing(el.id!);
          return;
        }
        dragging.current = { id: idAttr, dx: p.x - (el.x || 0), dy: p.y - (el.y || 0) };
      } else {
        // empty space → pan the infinite canvas
        const f = frac(e.clientX, e.clientY);
        panning.current = { fx: f.fx, fy: f.fy, cam: camRef.current };
      }
      return;
    }


    if (tool === "text") {
      e.preventDefault(); // інакше клік забирає фокус і поле одразу закривається
      const el: BoardEl = { id: uid(), type: "text", x: p.x, y: p.y, text: "", color, size: camRef.current.w * 0.05 };
      commit([...els, el]);
      setSelected(el.id!);
      setEditing(el.id!);
      setTool("select");
      return;
    }

    if (tool === "pen" || tool === "marker") {
      drafting.current = tool === "marker"
        ? { id: uid(), type: "stroke", color: "#FACC15", width: 18 * camRef.current.w, opacity: 0.4, points: [p] }
        : { id: uid(), type: "stroke", color, width: width * camRef.current.w, points: [p] };
      setEls((prev) => [...prev, drafting.current!]);
      return;
    }

    drafting.current = {
      id: uid(),
      type: "shape",
      shape: tool as any,
      x: p.x,
      y: p.y,
      w: 0,
      h: 0,
      color,
      width: width * camRef.current.w,
    };
    setEls((prev) => [...prev, drafting.current!]);
  };

  const onMove = (e: React.PointerEvent) => {
    if (panning.current) {
      const f = frac(e.clientX, e.clientY);
      const start = panning.current;
      setCamera({
        x: start.cam.x - (f.fx - start.fx) * start.cam.w,
        y: start.cam.y - (f.fy - start.fy) * start.cam.w,
        w: start.cam.w,
      });
      return;
    }

    const p = world(e.clientX, e.clientY);

    if (erasing.current) { eraseAtPoint(p); return; }

    if (resizing.current) {

      const r = resizing.current;
      setEls((prev) => {
        const next = prev.map((x) => {
          if (x.id !== r.id) return x;
          if (x.type === "text") {
            // Плавно, як у картинки: приріст висоти боксу ділимо на кількість рядків
            const size0 = r.size0 || 0.045;
            const dy = p.y - (r.py0 ?? r.y0);
            const next = size0 + dy / (1.35 * (r.lines || 1));
            return { ...x, size: Math.max(0.008, Math.min(1.5, next)) };
          }

          const w = Math.max(0.01, p.x - r.x0);
          const ratio = r.h0 / (r.w0 || 1);
          return { ...x, w, h: x.type === "image" ? w * ratio : Math.max(0.01, p.y - r.y0) };
        });
        elsRef.current = next;
        sync(next, camRef.current, true);
        return next;
      });
      return;
    }

    if (dragging.current) {
      const { id, dx, dy } = dragging.current;
      setEls((prev) => {
        const next = prev.map((x) => (x.id === id ? { ...x, x: p.x - dx, y: p.y - dy } : x));
        elsRef.current = next;
        sync(next, camRef.current, true);
        return next;
      });
      return;
    }

    const d = drafting.current;
    if (!d) return;
    if (d.type === "stroke") {
      d.points!.push(p);
      setEls((prev) => {
        const next = prev.map((x) => (x.id === d.id ? { ...d, points: [...d.points!] } : x));
        elsRef.current = next;
        sync(next, camRef.current, true);
        return next;
      });
    } else {
      d.w = p.x - (d.x || 0);
      d.h = p.y - (d.y || 0);
      setEls((prev) => {
        const next = prev.map((x) => (x.id === d.id ? { ...d } : x));
        elsRef.current = next;
        sync(next, camRef.current, true);
        return next;
      });
    }
  };

  const onUp = () => {
    panning.current = null;
    const finish = () => setEls((prev) => { elsRef.current = prev; sync(prev, camRef.current); return prev; });
    if (erasing.current) { erasing.current = false; finish(); return; }

    if (resizing.current) { resizing.current = null; finish(); return; }
    if (dragging.current) { dragging.current = null; finish(); return; }
    if (drafting.current) { drafting.current = null; finish(); }
  };

  /* ─────────── drag & drop (textbook pages / files) ─────────── */

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropHint(false);
    const at = world(e.clientX, e.clientY);
    const url =
      e.dataTransfer.getData("application/x-board-image") ||
      e.dataTransfer.getData("text/uri-list") ||
      e.dataTransfer.getData("text/plain");
    if (url && /^https?:\/\//.test(url.trim())) { placeImage(url.trim(), at); return; }
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) await uploadImage(file, at);
  };

  /* ─────────── upload ─────────── */

  const uploadImage = async (file: File, at?: { x: number; y: number }) => {
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${classId}/${Date.now()}-${uid()}.${ext}`;
      const { error } = await supabase.storage.from("board-images").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage
        .from("board-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("Не вдалося отримати посилання");
      placeImage(signed.signedUrl, at);
    } catch (e: any) {
      toast({ title: "Не вдалося завантажити фото", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  /* ─────────── selection helpers ─────────── */

  const selectedEl = els.find((x) => x.id === selected) || null;
  const editingEl = els.find((x) => x.id === editing) || null;

  const scaleSelected = (factor: number) => {
    if (!selectedEl) return;
    commit(
      els.map((x) =>
        x.id !== selectedEl.id
          ? x
          : x.type === "text"
          ? { ...x, size: Math.max(0.005, (x.size || 0.045) * factor) }
          : { ...x, w: (x.w || 0.3) * factor, h: (x.h || 0.3) * factor },
      ),
    );
  };

  const setText = (id: string, text: string) => {
    const next = elsRef.current.map((x) => (x.id === id ? { ...x, text } : x));
    commit(next, true);
  };

  const removeSelected = () => {
    if (!selectedEl) return;
    commit(els.filter((x) => x.id !== selectedEl.id));
    setSelected(null);
    setEditing(null);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing) return;
      const t = e.target as HTMLElement;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selected) { e.preventDefault(); removeSelected(); }
      if (e.key === "Escape") { setSelected(null); setEditing(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing, selected]);

  const k = 1 / cam.w;
  const hs = 10 / k; // handle size in world px (screen-constant)

  const Btn = ({ active, onClick, title, children }: any) => (
    <button
      onClick={onClick}
      title={title}
      className={`w-9 h-9 rounded-xl grid place-items-center border transition ${
        active ? "text-white border-transparent" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
      style={active ? { background: "#4F46E5" } : undefined}
    >
      {children}
    </button>
  );

  const box = (el: BoardEl) => {
    const x = Math.min(el.x || 0, (el.x || 0) + (el.w || 0)) * BOARD_W;
    const isText = el.type === "text";
    const size = (el.size || 0.045) * BOARD_H;
    const y = isText ? (el.y || 0) * BOARD_H - size : Math.min(el.y || 0, (el.y || 0) + (el.h || 0)) * BOARD_H;
    const w = isText
      ? Math.max(60, String(el.text || "").split("\n").reduce((m, l) => Math.max(m, l.length), 4) * size * 0.6)
      : Math.abs(el.w || 0.2) * BOARD_W;
    const h = isText ? size * 1.35 * String(el.text || " ").split("\n").length : Math.abs(el.h || 0.2) * BOARD_H;
    return { x, y, w, h };
  };

  return (
    <div className={`${compact ? "h-full min-h-0 flex flex-col rounded-md p-2" : "rounded-2xl p-4 space-y-3"} border border-slate-200 bg-white ${className}`}>
      <div className={`flex flex-wrap items-center gap-1.5 ${compact ? "shrink-0 pb-2" : ""}`}>
        <Btn active={tool === "select"} onClick={() => setTool("select")} title="Виділити / перемістити">
          <MousePointer2 className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "pan"} onClick={() => setTool("pan")} title="Рука — рухати полотно">
          <Hand className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "pen"} onClick={() => setTool("pen")} title="Малювати">
          <Pen className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "marker"} onClick={() => setTool("marker")} title="Жовтий маркер — виділити слова">
          <Highlighter className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "text"} onClick={() => setTool("text")} title="Текст (пишеться в реальному часі)">
          <Type className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "rect"} onClick={() => setTool("rect")} title="Прямокутник">
          <SquareIcon className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "ellipse"} onClick={() => setTool("ellipse")} title="Овал">
          <Circle className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "arrow"} onClick={() => setTool("arrow")} title="Стрілка">
          <ArrowUpRight className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "line"} onClick={() => setTool("line")} title="Лінія">
          <Minus className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "erase"} onClick={() => setTool("erase")} title="Гумка — стирає намальоване">
          <Eraser className="w-4 h-4" />
        </Btn>
        <Btn active={false} onClick={() => fileRef.current?.click()} title="Додати фото">
          <ImageIcon className="w-4 h-4" />
        </Btn>

        <span className="w-px h-6 bg-slate-200 mx-1" />

        <div className="flex items-center gap-1">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-6 h-6 rounded-full border-2 ${color === c ? "border-slate-900" : "border-white"}`}
              style={{ background: c }}
            />
          ))}
        </div>

        <input
          type="range"
          min={2}
          max={16}
          value={width}
          onChange={(e) => setWidth(Number(e.target.value))}
          className="w-24"
          title="Товщина"
        />

        <span className="w-px h-6 bg-slate-200 mx-1" />

        <Btn active={false} onClick={() => zoomTo(cam.w / 1.25)} title="Збільшити">
          <ZoomIn className="w-4 h-4" />
        </Btn>
        <Btn active={false} onClick={() => zoomTo(cam.w * 1.25)} title="Зменшити">
          <ZoomOut className="w-4 h-4" />
        </Btn>
        <Btn active={false} onClick={fitAll} title="Показати все">
          <Maximize className="w-4 h-4" />
        </Btn>
        <Btn active={false} onClick={() => setCamera({ x: -cam.w / 2, y: -cam.w / 2, w: cam.w })} title="До центру дошки">
          <Crosshair className="w-4 h-4" />
        </Btn>
        <Btn
          active={false}
          onClick={() => stuCam && setCamera(stuCam)}
          title={stuCam ? "Перейти до вікна учня" : "Учень ще не відкрив дошку"}
        >
          <Eye className={`w-4 h-4 ${stuCam ? "" : "opacity-40"}`} />
        </Btn>
        <span className="text-[11px] text-slate-500 w-10">{Math.round((1 / cam.w) * 100)}%</span>


        <span className="w-px h-6 bg-slate-200 mx-1" />

        <Btn active={false} onClick={() => commit(els.slice(0, -1))} title="Скасувати">
          <Undo2 className="w-4 h-4" />
        </Btn>
        <Btn active={false} onClick={() => { setSelected(null); setEditing(null); commit([]); }} title="Очистити дошку">
          <Trash2 className="w-4 h-4" />
        </Btn>

        {selectedEl && (
          <div className="flex items-center gap-1 ml-1">
            <button onClick={() => scaleSelected(0.85)} className="px-2 h-9 rounded-xl border border-slate-200 text-sm">−</button>
            <button onClick={() => scaleSelected(1.18)} className="px-2 h-9 rounded-xl border border-slate-200 text-sm">+</button>
            {selectedEl.type === "text" && (
              <>
                <input
                  type="range"
                  min={8}
                  max={400}
                  step={1}
                  value={Math.round((selectedEl.size || 0.045) * 1000)}
                  onChange={(e) =>
                    commit(
                      els.map((x) => (x.id === selectedEl.id ? { ...x, size: Number(e.target.value) / 1000 } : x)),
                      true,
                    )
                  }
                  className="w-28"
                  title="Розмір тексту"
                />
              </>
            )}

            <button onClick={removeSelected} className="px-2 h-9 rounded-xl border border-red-200 text-red-600 text-sm">
              Видалити
            </button>
          </div>
        )}


        {uploading && <span className="text-xs text-slate-500">Завантаження…</span>}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }}
      />

      <div ref={wrapRef} className={`relative ${compact ? "flex-1 min-h-0" : ""}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
          className={`w-full ${compact ? "h-full" : "aspect-[4/3]"} rounded-xl border-2 bg-white touch-none select-none ${
            dropHint ? "border-indigo-400" : "border-slate-200"
          } ${
            tool === "pan"
              ? "cursor-grab"
              : tool === "select"
              ? "cursor-default"
              : tool === "erase"
              ? "cursor-cell"
              : "cursor-crosshair"
          }`}
          style={{
            backgroundImage: "radial-gradient(#E2E8F0 1px, transparent 1px)",
            backgroundSize: `${24 / cam.w}px ${24 / cam.w}px`,
            backgroundPosition: `${(-cam.x / cam.w) * 100}% ${(-cam.y / cam.w) * 100}%`,
          }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
          onDoubleClick={(e) => {
            const id = ((e.target as SVGElement).closest("[data-el-id]") as SVGElement | null)?.getAttribute("data-el-id");
            const el = els.find((x) => x.id === id);
            if (el?.type === "text") { setSelected(el.id!); setEditing(el.id!); }
          }}
          onDragOver={(e) => { e.preventDefault(); setDropHint(true); }}
          onDragLeave={() => setDropHint(false)}
          onDrop={onDrop}
        >
          <g transform={camTransform(cam)}>
            {/* центр нескінченної дошки */}
            <g stroke="#94A3B8" strokeWidth={2 / k} opacity={0.7}>
              <line x1={-40 / k} y1={0} x2={40 / k} y2={0} />
              <line x1={0} y1={-40 / k} x2={0} y2={40 / k} />
            </g>
            <text x={12 / k} y={-12 / k} fill="#94A3B8" fontSize={13 / k} fontFamily="system-ui">
              центр
            </text>

            {els.map((el, i) => {
              const b = selected === el.id && el.type !== "stroke" ? box(el) : null;
              return (
                <g key={el.id || i} data-el-id={el.id}>
                  {editing === el.id ? null : <BoardElement el={el} />}
                  {b && (
                    <>
                      <rect
                        x={b.x - 6}
                        y={b.y - 6}
                        width={b.w + 12}
                        height={b.h + 12}
                        fill="none"
                        stroke="#4F46E5"
                        strokeDasharray={`${6 / k} ${5 / k}`}
                        strokeWidth={2 / k}
                      />
                      <rect
                        data-handle="se"
                        x={b.x + b.w - hs / 2}
                        y={b.y + b.h - hs / 2}
                        width={hs}
                        height={hs}
                        rx={hs / 4}
                        fill="#4F46E5"
                        stroke="#fff"
                        strokeWidth={2 / k}
                        style={{ cursor: "nwse-resize" }}
                      />
                    </>
                  )}
                </g>
              );
            })}
            {/* що бачить учень */}
            {stuCam && (
              <g pointerEvents="none">
                <rect
                  x={stuCam.x * BOARD_W}
                  y={stuCam.y * BOARD_H}
                  width={stuCam.w * BOARD_W}
                  height={stuCam.w * BOARD_H}
                  fill="none"
                  stroke="#059669"
                  strokeWidth={2.5 / k}
                  strokeDasharray={`${8 / k} ${6 / k}`}
                  rx={8 / k}
                />
                <text
                  x={stuCam.x * BOARD_W + 10 / k}
                  y={stuCam.y * BOARD_H + 22 / k}
                  fill="#059669"
                  fontSize={14 / k}
                  fontFamily="system-ui"
                >
                  Бачить учень
                </text>
              </g>
            )}
          </g>
        </svg>

        {editingEl && (() => {
          const fs = ((editingEl.size || 0.045) * BOARD_H * (pxW / BOARD_W)) / cam.w;
          const leftPx = (((editingEl.x || 0) - cam.x) / cam.w) * pxW;
          // по вертикалі 1 world-unit = BOARD_H px, а не BOARD_W — інакше поле
          // «тікало» нижче кліку (іноді за межі дошки) і текст був невидимий
          const topPx = (((editingEl.y || 0) - cam.y) / cam.w) * pxW * (BOARD_H / BOARD_W) - fs * 0.93;
          const lines = Math.max(1, String(editingEl.text || "").split("\n").length);
          return (
            <div
              key={editingEl.id}
              className="absolute z-20"
              style={{ left: Math.max(0, leftPx), top: Math.max(0, topPx) }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Пишемо прямо на дошці: прозоре поле точно на місці тексту */}
              <textarea
                ref={textInputRef}
                rows={lines}
                value={editingEl.text || ""}
                onChange={(e) => {
                  const id = editingEl.id;
                  if (id) setText(id, e.target.value);
                }}
                onBlur={(e) => { if (Date.now() - (editStartRef.current || 0) < 300) { e.currentTarget.focus(); return; } setEditing(null); }}
                onKeyDown={(e) => { if (e.key === "Escape") setEditing(null); }}
                placeholder="Пишіть…"
                spellCheck={false}
                className="workbook-text-input bg-transparent border-0 outline-none resize-none overflow-hidden font-display font-semibold p-0 m-0 placeholder:text-slate-300"
                style={{
                  color: editingEl.color || "#0F172A",
                  fontSize: `${fs}px`,
                  lineHeight: 1.25,
                  caretColor: editingEl.color || "#0F172A",
                  width: `${Math.max(fs * 4, Math.min(pxW - leftPx - 4, fs * 0.62 * (Math.max(6, ...String(editingEl.text || "").split("\n").map((l) => l.length + 2)))))}px`,
                  height: `${fs * 1.25 * lines + 2}px`,
                  fontFamily: "Space Grotesk, system-ui, sans-serif",
                }}
              />
            </div>

          );
        })()}


      </div>

      {!compact && (
        <p className="text-xs text-slate-500">
          Нескінченна дошка: колесо — прокрутка, Ctrl/⇧+колесо — зум, «рука» або порожнє місце — рух полотна. Хрестик
          показує центр дошки, зелена рамка — що саме зараз бачить учень (кнопка «око» переносить вас туди). Перетягуйте
          сторінки підручника прямо на дошку, змінюйте розмір за кутовий маркер або повзунком. Дошка зберігається для цього
          учня і переноситься на наступний урок.
        </p>
      )}
    </div>
  );
}
