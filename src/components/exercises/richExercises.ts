/** Shared metadata + helpers for the interactive ("rich") lesson exercise types. */

export const RICH_TYPES = ["word_image", "drag_cloze", "matching", "sorting"] as const;
export type RichType = (typeof RICH_TYPES)[number];

export const isRichType = (t: string): t is RichType => (RICH_TYPES as readonly string[]).includes(t);

export interface WordImageItem {
  word: string;
  translation?: string | null;
  emoji?: string | null;
  image_path?: string | null;
  image_url?: string | null;
}

export interface RichPayload {
  /** word_image */
  items?: WordImageItem[];
  /** matching */
  pairs?: Array<{ left: string; right: string }>;
  /** drag_cloze */
  text?: string;
  tokens?: string[];
  distractors?: string[];
  /** sorting */
  groups?: Array<{ name: string; items: string[] }>;
}

/** Fisher–Yates, returns a new array. */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** True when the stored payload actually contains everything the type needs to render. */
export function hasRichPayload(type: string, payload: any): boolean {
  const p: RichPayload = payload || {};
  switch (type) {
    case "word_image":
      return Array.isArray(p.items) && p.items.length >= 2;
    case "matching":
      return Array.isArray(p.pairs) && p.pairs.length >= 2;
    case "drag_cloze":
      return typeof p.text === "string" && p.text.includes("___") && Array.isArray(p.tokens) && p.tokens.length > 0;
    case "sorting":
      return Array.isArray(p.groups) && p.groups.length >= 2 && p.groups.every((g) => Array.isArray(g.items));
    default:
      return false;
  }
}
