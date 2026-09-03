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

      const keep = pts.map((q) => Math.sqrt(dist2(q, p)) > radius);
      // також перевіряємо середини відрізків, щоб гумка «прорізала» довгі лінії
      const cutSeg: boolean[] = [];
      for (let i = 0; i < pts.length - 1; i++) {
        cutSeg[i] = segDist(p, pts[i], pts[i + 1]) <= radius;
      }

      if (keep.every(Boolean) && !cutSeg.some(Boolean)) { next.push(el); continue; }

      // збираємо шматки, що залишились
      const pieces: typeof pts[] = [];
      let cur: typeof pts = [];
      for (let i = 0; i < pts.length; i++) {
        const brokenBefore = i > 0 && cutSeg[i - 1];
        if (!keep[i] || brokenBefore) {
          if (cur.length > 1) pieces.push(cur);
          cur = keep[i] ? [pts[i]] : [];
          continue;
        }
        cur.push(pts[i]);
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
