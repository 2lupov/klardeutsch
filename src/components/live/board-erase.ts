import { BoardEl } from "./BoardRender";

const uid = (p = "e") => p + Math.random().toString(36).slice(2, 10);

export type EraseResult = {
  /** Оновлений список елементів (порядок збережено). */
  next: BoardEl[];
  /** Чи щось змінилось. */
  changed: boolean;
  /** Видалені id (повністю стерті елементи). */
  removed: string[];
  /** Нові/змінені елементи (частини штрихів після стирання). */
  upserted: BoardEl[];
};

function dist2(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/** Відстань від точки до відрізка. */
function segDist(p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) {
  const l2 = dist2(a, b);
  if (l2 === 0) return Math.sqrt(dist2(p, a));
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(dist2(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }));
}

/**
 * Справжня гумка: стирає частину штриха під курсором, розбиваючи його
 * на окремі шматки. Інші типи елементів (текст, фігури, зображення)
 * видаляються цілком, коли гумка їх торкається.
 */
export function eraseAt(
  els: BoardEl[],
  p: { x: number; y: number },
  radius: number,
  filter?: (el: BoardEl) => boolean,
): EraseResult {
  const next: BoardEl[] = [];
  const removed: string[] = [];
  const upserted: BoardEl[] = [];
  let changed = false;

  for (const el of els) {
    if (filter && !filter(el)) { next.push(el); continue; }

    const type = el.type || "stroke";

    if (type === "stroke") {
      const pts = el.points || [];
      if (pts.length === 0) { next.push(el); continue; }

      const touched = pts.some((q) => Math.sqrt(dist2(q, p)) <= radius) ||
        pts.slice(0, -1).some((q, i) => segDist(p, q, pts[i + 1]) <= radius);
      if (!touched) { next.push(el); continue; }

      // Додаємо проміжні точки перед стиранням. Інакше один довгий SVG-відрізок
      // зникає цілком навіть від короткого дотику гумки.
      const dense: typeof pts = [];
      const step = Math.max(radius * 0.35, 0.0008);
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const length = Math.sqrt(dist2(a, b));
        const count = Math.max(1, Math.ceil(length / step));
        for (let j = 0; j < count; j++) {
          const t = j / count;
          dense.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
      dense.push(pts[pts.length - 1]);

      // Лише точки безпосередньо під круглою гумкою зникають; решта штриха
      // залишається окремими фрагментами й стирається поступово під час руху.
      const pieces: typeof pts[] = [];
      let cur: typeof pts = [];
      for (const q of dense) {
        if (Math.sqrt(dist2(q, p)) <= radius) {
          if (cur.length > 1) pieces.push(cur);
          cur = [];
        } else {
          cur.push(q);
        }
      }
      if (cur.length > 1) pieces.push(cur);

      changed = true;
      if (pieces.length === 0) {
        removed.push(String(el.id));
        continue;
      }
      // перший шматок лишає id, решта — нові елементи
      pieces.forEach((points, i) => {
        const piece: BoardEl = i === 0 ? { ...el, points } : { ...el, id: uid("k"), points };
        next.push(piece);
        upserted.push(piece);
      });
      continue;
    }

    // не-штрихи: видаляємо цілком при попаданні
    const x = el.x || 0;
    const y = el.y || 0;
    let hit = false;
    if (type === "text") {
      const s = el.size || 0.045;
      hit = p.x > x - radius && p.x < x + s * 12 && p.y > y - s && p.y < y + s * 0.4;
    } else {
      const w = el.w || 0.2;
      const h = el.h || 0.2;
      hit =
        p.x > Math.min(x, x + w) - radius && p.x < Math.max(x, x + w) + radius &&
        p.y > Math.min(y, y + h) - radius && p.y < Math.max(y, y + h) + radius;
    }
    if (hit) {
      changed = true;
      removed.push(String(el.id));
    } else {
      next.push(el);
    }
  }

  return { next, changed, removed, upserted };
}
