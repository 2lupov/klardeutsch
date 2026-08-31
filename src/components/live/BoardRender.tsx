export interface BoardEl {
  id?: string;
  type?: "stroke" | "text" | "image" | "shape" | "view";
  // stroke
  points?: { x: number; y: number }[];
  color?: string;
  width?: number;
  // text / image / shape
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  text?: string;
  size?: number;
  url?: string;
  shape?: "rect" | "ellipse" | "line" | "arrow";
  fill?: string;
}

export const BOARD_W = 1000;
export const BOARD_H = 750;

/** Camera on the infinite canvas: top-left world point + visible width (world units). */
export interface BoardCam {
  x: number;
  y: number;
  w: number;
}

export const DEFAULT_CAM: BoardCam = { x: 0, y: 0, w: 1 };
export const CAM_ID = "__view";

/** Camera is stored inside the board array so it syncs/persists without extra columns. */
export function camFromBoard(board: BoardEl[] | null | undefined): BoardCam {
  const el = (board || []).find((e) => e.type === "view");
  if (!el) return DEFAULT_CAM;
  return { x: el.x || 0, y: el.y || 0, w: el.w && el.w > 0 ? el.w : 1 };
}

export function contentOfBoard(board: BoardEl[] | null | undefined): BoardEl[] {
  return (board || []).filter((e) => e.type !== "view");
}

export function camToEl(cam: BoardCam): BoardEl {
  return { id: CAM_ID, type: "view", x: cam.x, y: cam.y, w: cam.w };
}

export function camTransform(cam: BoardCam) {
  const k = 1 / (cam.w || 1);
  return `translate(${-cam.x * BOARD_W * k} ${-cam.y * BOARD_H * k}) scale(${k})`;
}

/** Renders one board element inside a 1000x750 SVG (coords are normalized 0..1). */
export function BoardElement({ el }: { el: BoardEl }) {
  const type = el.type || "stroke";

  if (type === "view") return null;

  if (type === "stroke") {
    return (
      <polyline
        fill="none"
        stroke={el.color || "#4F46E5"}
        strokeWidth={el.width || 4}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={(el.points || []).map((p) => `${p.x * BOARD_W},${p.y * BOARD_H}`).join(" ")}
      />
    );
  }

  if (type === "image") {
    return (
      <image
        href={el.url}
        x={(el.x || 0) * BOARD_W}
        y={(el.y || 0) * BOARD_H}
        width={(el.w || 0.3) * BOARD_W}
        height={(el.h || 0.3) * BOARD_H}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  if (type === "text") {
    const size = (el.size || 0.04) * BOARD_H;
    const lines = String(el.text || "").split("\n");
    return (
      <text
        x={(el.x || 0) * BOARD_W}
        y={(el.y || 0) * BOARD_H}
        fill={el.color || "#0F172A"}
        fontSize={size}
        fontFamily="Space Grotesk, system-ui, sans-serif"
        fontWeight={600}
      >
        {lines.map((l, i) => (
          <tspan key={i} x={(el.x || 0) * BOARD_W} dy={i === 0 ? 0 : size * 1.25}>
            {l}
          </tspan>
        ))}
      </text>
    );
  }

  // shapes
  const x = (el.x || 0) * BOARD_W;
  const y = (el.y || 0) * BOARD_H;
  const w = (el.w || 0) * BOARD_W;
  const h = (el.h || 0) * BOARD_H;
  const stroke = el.color || "#4F46E5";
  const sw = el.width || 4;

  if (el.shape === "ellipse") {
    return (
      <ellipse
        cx={x + w / 2}
        cy={y + h / 2}
        rx={Math.abs(w / 2)}
        ry={Math.abs(h / 2)}
        fill={el.fill || "none"}
        stroke={stroke}
        strokeWidth={sw}
      />
    );
  }

  if (el.shape === "line" || el.shape === "arrow") {
    const x2 = x + w;
    const y2 = y + h;
    const ang = Math.atan2(y2 - y, x2 - x);
    const head = 16 + sw * 2;
    return (
      <g stroke={stroke} strokeWidth={sw} strokeLinecap="round" fill="none">
        <line x1={x} y1={y} x2={x2} y2={y2} />
        {el.shape === "arrow" && (
          <>
            <line x1={x2} y1={y2} x2={x2 - head * Math.cos(ang - 0.5)} y2={y2 - head * Math.sin(ang - 0.5)} />
            <line x1={x2} y1={y2} x2={x2 - head * Math.cos(ang + 0.5)} y2={y2 - head * Math.sin(ang + 0.5)} />
          </>
        )}
      </g>
    );
  }

  // rect (default)
  return (
    <rect
      x={Math.min(x, x + w)}
      y={Math.min(y, y + h)}
      width={Math.abs(w)}
      height={Math.abs(h)}
      rx={10}
      fill={el.fill || "none"}
      stroke={stroke}
      strokeWidth={sw}
    />
  );
}

/** Read-only board view (student side) — follows the teacher's camera. */
export function BoardView({ elements, className }: { elements: BoardEl[]; className?: string }) {
  const cam = camFromBoard(elements);
  return (
    <svg viewBox={`0 0 ${BOARD_W} ${BOARD_H}`} className={className} preserveAspectRatio="xMidYMid slice">
      <g transform={camTransform(cam)}>
        {contentOfBoard(elements).map((el, i) => (
          <BoardElement key={el.id || i} el={el} />
        ))}
      </g>
    </svg>
  );
}
