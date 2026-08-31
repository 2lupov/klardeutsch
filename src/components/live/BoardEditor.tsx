import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BoardEl, BoardElement, BOARD_W, BOARD_H } from "./BoardRender";
import {
  MousePointer2,
  Pen,
  Type,
  Square as SquareIcon,
  Circle,
  ArrowUpRight,
  Minus,
  Image as ImageIcon,
  Eraser,
  Undo2,
  Trash2,
} from "lucide-react";

type Tool = "select" | "pen" | "text" | "rect" | "ellipse" | "arrow" | "line" | "erase";

const COLORS = ["#0F172A", "#4F46E5", "#DC2626", "#059669", "#F59E0B", "#DB2777"];
const uid = () => Math.random().toString(36).slice(2, 10);

export default function BoardEditor({ classId, initial }: { classId: string; initial: BoardEl[] }) {
  const [els, setEls] = useState<BoardEl[]>(initial || []);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState(COLORS[1]);
  const [width, setWidth] = useState(4);
  const [selected, setSelected] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const drafting = useRef<BoardEl | null>(null);
  const dragging = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const saveTimer = useRef<any>(null);

  const persist = (next: BoardEl[]) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase.from("live_classes").update({ board: next as any }).eq("id", classId);
    }, 200);
  };

  const commit = (next: BoardEl[]) => {
    setEls(next);
    persist(next);
  };

  const pos = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
  };

  const onDown = (e: React.PointerEvent) => {
    const p = pos(e);
    const target = (e.target as SVGElement).closest("[data-el-id]") as SVGElement | null;
    const id = target?.getAttribute("data-el-id") || null;

    if (tool === "erase") {
      if (id) commit(els.filter((x) => x.id !== id));
      return;
    }

    if (tool === "select") {
      setSelected(id);
      if (id) {
        const el = els.find((x) => x.id === id)!;
        if (el.type === "stroke") return;
        dragging.current = { id, dx: p.x - (el.x || 0), dy: p.y - (el.y || 0) };
      }
      return;
    }

    if (tool === "text") {
      const text = window.prompt("Текст на дошці:");
      if (!text) return;
      commit([...els, { id: uid(), type: "text", x: p.x, y: p.y, text, color, size: 0.045 }]);
      setTool("select");
      return;
    }

    if (tool === "pen") {
      drafting.current = { id: uid(), type: "stroke", color, width, points: [p] };
      setEls((prev) => [...prev, drafting.current!]);
      return;
    }

    // shapes
    drafting.current = {
      id: uid(),
      type: "shape",
      shape: tool as any,
      x: p.x,
      y: p.y,
      w: 0,
      h: 0,
      color,
      width,
    };
    setEls((prev) => [...prev, drafting.current!]);
  };

  const onMove = (e: React.PointerEvent) => {
    const p = pos(e);

    if (dragging.current) {
      const { id, dx, dy } = dragging.current;
      setEls((prev) => prev.map((x) => (x.id === id ? { ...x, x: p.x - dx, y: p.y - dy } : x)));
      return;
    }

    const d = drafting.current;
    if (!d) return;
    if (d.type === "stroke") {
      d.points!.push(p);
      setEls((prev) => prev.map((x) => (x.id === d.id ? { ...d, points: [...d.points!] } : x)));
    } else {
      d.w = p.x - (d.x || 0);
      d.h = p.y - (d.y || 0);
      setEls((prev) => prev.map((x) => (x.id === d.id ? { ...d } : x)));
    }
  };

  const onUp = () => {
    if (dragging.current) {
      dragging.current = null;
      setEls((prev) => { persist(prev); return prev; });
      return;
    }
    if (drafting.current) {
      drafting.current = null;
      setEls((prev) => { persist(prev); return prev; });
    }
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const path = `board/${classId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("tutoring-materials").upload(path, file, {
        contentType: file.type,
        upsert: true,
      });
      if (error) throw error;
      const url = supabase.storage.from("tutoring-materials").getPublicUrl(path).data.publicUrl;
      const img = new Image();
      img.onload = () => {
        const ratio = img.height / img.width || 0.75;
        const w = 0.34;
        commit([...els, { id: uid(), type: "image", url, x: 0.08, y: 0.08, w, h: (w * BOARD_W * ratio) / BOARD_H }]);
      };
      img.onerror = () => commit([...els, { id: uid(), type: "image", url, x: 0.08, y: 0.08, w: 0.34, h: 0.26 }]);
      img.src = url;
      setTool("select");
    } catch (e: any) {
      toast({ title: "Не вдалося завантажити фото", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const selectedEl = els.find((x) => x.id === selected) || null;

  const scaleSelected = (factor: number) => {
    if (!selectedEl) return;
    commit(
      els.map((x) =>
        x.id !== selectedEl.id
          ? x
          : x.type === "text"
          ? { ...x, size: Math.max(0.015, (x.size || 0.045) * factor) }
          : { ...x, w: (x.w || 0.3) * factor, h: (x.h || 0.3) * factor },
      ),
    );
  };

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Btn active={tool === "select"} onClick={() => setTool("select")} title="Виділити / перемістити">
          <MousePointer2 className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "pen"} onClick={() => setTool("pen")} title="Малювати">
          <Pen className="w-4 h-4" />
        </Btn>
        <Btn active={tool === "text"} onClick={() => setTool("text")} title="Текст">
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
        <Btn active={tool === "erase"} onClick={() => setTool("erase")} title="Видалити елемент">
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

        <Btn active={false} onClick={() => commit(els.slice(0, -1))} title="Скасувати">
          <Undo2 className="w-4 h-4" />
        </Btn>
        <Btn active={false} onClick={() => { setSelected(null); commit([]); }} title="Очистити дошку">
          <Trash2 className="w-4 h-4" />
        </Btn>

        {selectedEl && (
          <div className="flex items-center gap-1 ml-1">
            <button onClick={() => scaleSelected(0.85)} className="px-2 h-9 rounded-xl border border-slate-200 text-sm">−</button>
            <button onClick={() => scaleSelected(1.18)} className="px-2 h-9 rounded-xl border border-slate-200 text-sm">+</button>
            <button
              onClick={() => { commit(els.filter((x) => x.id !== selectedEl.id)); setSelected(null); }}
              className="px-2 h-9 rounded-xl border border-red-200 text-red-600 text-sm"
            >
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

      <svg
        ref={svgRef}
        viewBox={`0 0 ${BOARD_W} ${BOARD_H}`}
        className={`w-full aspect-[4/3] rounded-xl border border-slate-200 bg-white touch-none ${
          tool === "select" ? "cursor-default" : tool === "erase" ? "cursor-pointer" : "cursor-crosshair"
        }`}
        style={{
          backgroundImage: "radial-gradient(#E2E8F0 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        {els.map((el, i) => (
          <g key={el.id || i} data-el-id={el.id}>
            <BoardElement el={el} />
            {selected === el.id && el.type !== "stroke" && (
              <rect
                x={(Math.min(el.x || 0, (el.x || 0) + (el.w || 0))) * BOARD_W - 6}
                y={(Math.min(el.y || 0, (el.y || 0) + (el.h || 0))) * BOARD_H - (el.type === "text" ? (el.size || 0.045) * BOARD_H : 6)}
                width={Math.abs(el.w || 0.2) * BOARD_W + 12}
                height={(el.type === "text" ? (el.size || 0.045) * 1.5 : Math.abs(el.h || 0.2)) * BOARD_H + 12}
                fill="none"
                stroke="#4F46E5"
                strokeDasharray="6 5"
                strokeWidth={2}
              />
            )}
          </g>
        ))}
      </svg>

      <p className="text-xs text-slate-500">
        Малюйте, додавайте фото, текст і фігури — учень бачить усе в реальному часі. Інструмент «стрілка» —
        перетягування та зміна розміру.
      </p>
    </div>
  );
}
