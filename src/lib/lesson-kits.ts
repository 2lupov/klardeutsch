import type { LessonBlock } from "@/components/blocks/types";

export interface KitBlock {
  type: string;
  title?: string | null;
  payload?: any;
}

export interface LessonKit {
  id: string;
  title: string;
  level: string | null;
  book_id: string | null;
  focus: string;
  source: string;
  page_paths: string[];
  blocks: KitBlock[];
  notes: string | null;
  topics: string[];
  summary: string | null;
  last_assigned_at: string | null;
  created_at: string;
}


/** Перетворює блоки набору в LessonBlock для рендера (без записів у базі). */
export function kitBlocksToLessonBlocks(blocks: KitBlock[], prefix = "kit"): LessonBlock[] {
  return (blocks ?? []).map((b, i) => ({
    id: `${prefix}-${i}`,
    lesson_id: prefix,
    type: b.type,
    title: b.title ?? null,
    sort_order: i,
    visible_to_student: true,
    payload: b.payload ?? {},
    source: "kit",
    book_page_id: null,
  }));
}

export function normalizeKit(row: any): LessonKit {
  return {
    id: row.id,
    title: row.title ?? "Урок",
    level: row.level ?? null,
    book_id: row.book_id ?? null,
    focus: row.focus ?? "kursbuch",
    source: row.source ?? "pdf",
    page_paths: Array.isArray(row.page_paths) ? row.page_paths : [],
    blocks: Array.isArray(row.blocks) ? row.blocks : [],
    notes: row.notes ?? null,
    topics: Array.isArray(row.topics) ? row.topics : [],
    summary: row.summary ?? null,
    last_assigned_at: row.last_assigned_at ?? null,
    created_at: row.created_at,
  };
}
