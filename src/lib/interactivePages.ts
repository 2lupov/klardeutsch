import { supabase } from "@/integrations/supabase/client";

/**
 * Interactive encyclopedia pages: instead of a flat photo of a book page,
 * a student gets an animated scene built from a fixed set of blocks.
 * German text only — the AI keeps the original language of the book.
 */

export type SceneBlock =
  | { type: "text"; title?: string | null; paragraphs: string[]; terms?: string[] }
  | {
      type: "orbit";
      title?: string | null;
      center: { label: string; color?: string | null };
      objects: Array<{
        label: string;
        description?: string | null;
        color?: string | null;
        size?: number | null;
        speed?: number | null;
        ring?: boolean | null;
      }>;
    }
  | {
      type: "hotspots";
      title?: string | null;
      image_path?: string | null;
      image_url?: string | null;
      points: Array<{ x: number; y: number; label: string; description?: string | null }>;
    }
  | {
      type: "scale";
      title?: string | null;
      unit?: string | null;
      items: Array<{ label: string; value: number; note?: string | null }>;
    }
  | { type: "facts"; title?: string | null; cards: Array<{ front: string; back: string }> }
  | { type: "table"; title?: string | null; headers: string[]; rows: string[][] }
  | {
      type: "vocab";
      title?: string | null;
      words: Array<{ de: string; article?: string | null; note?: string | null }>;
    }
  | {
      type: "quiz";
      title?: string | null;
      questions: Array<{ question: string; options: string[]; correct_index: number }>;
    };

export type SceneBlockType = SceneBlock["type"];

export const BLOCK_LABEL: Record<SceneBlockType, string> = {
  orbit: "Орбіти (рух)",
  hotspots: "Схема з підписами",
  scale: "Шкала / масштаб",
  facts: "Картки-факти",
  table: "Таблиця",
  vocab: "Лексика",
  text: "Текст",
  quiz: "Мінітест",
};

export interface InteractivePage {
  id: string;
  book_id: string | null;
  page_id: string | null;
  owner_id: string;
  title: string;
  level: string | null;
  scene: SceneBlock[];
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
}

/* ───────── sanitizing (AI output and hand edits share one path) ───────── */

const str = (v: unknown, max = 400): string =>
  v === null || v === undefined ? "" : String(v).slice(0, max);
const num = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export function sanitizeBlock(raw: any): SceneBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const title = raw.title ? str(raw.title, 120) : null;

  switch (raw.type) {
    case "text": {
      const paragraphs = (Array.isArray(raw.paragraphs) ? raw.paragraphs : [])
        .map((p: unknown) => str(p, 1200))
        .filter(Boolean)
        .slice(0, 8);
      if (!paragraphs.length) return null;
      return {
        type: "text",
        title,
        paragraphs,
        terms: (Array.isArray(raw.terms) ? raw.terms : []).map((t: unknown) => str(t, 60)).filter(Boolean).slice(0, 20),
      };
    }
    case "orbit": {
      const objects = (Array.isArray(raw.objects) ? raw.objects : [])
        .map((o: any) => ({
          label: str(o?.label, 60),
          description: o?.description ? str(o.description, 400) : null,
          color: o?.color ? str(o.color, 24) : null,
          size: clamp(num(o?.size, 14), 6, 40),
          speed: clamp(num(o?.speed, 1), 0.1, 6),
          ring: !!o?.ring,
        }))
        .filter((o: any) => o.label)
        .slice(0, 12);
      if (!objects.length) return null;
      return {
        type: "orbit",
        title,
        center: {
          label: str(raw?.center?.label, 60) || "Zentrum",
          color: raw?.center?.color ? str(raw.center.color, 24) : null,
        },
        objects,
      };
    }
    case "hotspots": {
      const points = (Array.isArray(raw.points) ? raw.points : [])
        .map((p: any) => ({
          x: clamp(num(p?.x, 50), 0, 100),
          y: clamp(num(p?.y, 50), 0, 100),
          label: str(p?.label, 80),
          description: p?.description ? str(p.description, 500) : null,
        }))
        .filter((p: any) => p.label)
        .slice(0, 20);
      if (!points.length) return null;
      return {
        type: "hotspots",
        title,
        image_path: raw.image_path ? str(raw.image_path, 300) : null,
        image_url: raw.image_url ? str(raw.image_url, 800) : null,
        points,
      };
    }
    case "scale": {
      const items = (Array.isArray(raw.items) ? raw.items : [])
        .map((i: any) => ({
          label: str(i?.label, 60),
          value: num(i?.value, 0),
          note: i?.note ? str(i.note, 200) : null,
        }))
        .filter((i: any) => i.label)
        .slice(0, 16);
      if (!items.length) return null;
      return { type: "scale", title, unit: raw.unit ? str(raw.unit, 30) : null, items };
    }
    case "facts": {
      const cards = (Array.isArray(raw.cards) ? raw.cards : [])
        .map((c: any) => ({ front: str(c?.front, 120), back: str(c?.back, 400) }))
        .filter((c: any) => c.front)
        .slice(0, 12);
      if (!cards.length) return null;
      return { type: "facts", title, cards };
    }
    case "table": {
      const rows = (Array.isArray(raw.rows) ? raw.rows : [])
        .map((r: any) => (Array.isArray(r) ? r.slice(0, 8).map((c: unknown) => str(c, 200)) : []))
        .filter((r: string[]) => r.length)
        .slice(0, 30);
      if (!rows.length) return null;
      return {
        type: "table",
        title,
        headers: (Array.isArray(raw.headers) ? raw.headers : []).slice(0, 8).map((h: unknown) => str(h, 80)),
        rows,
      };
    }
    case "vocab": {
      const words = (Array.isArray(raw.words) ? raw.words : [])
        .map((w: any) => ({
          de: str(w?.de, 80),
          article: w?.article ? str(w.article, 8) : null,
          note: w?.note ? str(w.note, 200) : null,
        }))
        .filter((w: any) => w.de)
        .slice(0, 40);
      if (!words.length) return null;
      return { type: "vocab", title, words };
    }
    case "quiz": {
      const questions = (Array.isArray(raw.questions) ? raw.questions : [])
        .map((q: any) => {
          const options = (Array.isArray(q?.options) ? q.options : [])
            .map((o: unknown) => str(o, 200))
            .filter(Boolean)
            .slice(0, 6);
          return {
            question: str(q?.question, 400),
            options,
            correct_index: clamp(Math.round(num(q?.correct_index, 0)), 0, Math.max(0, options.length - 1)),
          };
        })
        .filter((q: any) => q.question && q.options.length >= 2)
        .slice(0, 8);
      if (!questions.length) return null;
      return { type: "quiz", title, questions };
    }
    default:
      return null;
  }
}

export function sanitizeScene(raw: unknown): SceneBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(sanitizeBlock).filter(Boolean).slice(0, 20) as SceneBlock[];
}

export function emptyBlock(type: SceneBlockType): SceneBlock {
  switch (type) {
    case "orbit":
      return { type: "orbit", title: "Bahnen", center: { label: "Sonne" }, objects: [{ label: "Planet", size: 14, speed: 1 }] };
    case "hotspots":
      return { type: "hotspots", title: "Schema", points: [{ x: 50, y: 50, label: "Punkt" }] };
    case "scale":
      return { type: "scale", title: "Skala", unit: "Mio. km", items: [{ label: "Merkur", value: 58 }] };
    case "facts":
      return { type: "facts", title: "Fakten", cards: [{ front: "Frage", back: "Antwort" }] };
    case "table":
      return { type: "table", title: "Tabelle", headers: ["A", "B"], rows: [["", ""]] };
    case "vocab":
      return { type: "vocab", title: "Wortschatz", words: [{ de: "Planet", article: "der" }] };
    case "quiz":
      return { type: "quiz", title: "Mini-Test", questions: [{ question: "?", options: ["A", "B"], correct_index: 0 }] };
    default:
      return { type: "text", title: "Text", paragraphs: [""] };
  }
}

/* ───────── data access ───────── */

const parse = (row: any): InteractivePage => ({
  ...row,
  scene: sanitizeScene(row?.scene),
}) as InteractivePage;

export async function listInteractivePages() {
  const { data, error } = await supabase
    .from("interactive_pages")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(parse);
}

export async function fetchInteractivePage(id: string) {
  const { data, error } = await supabase.from("interactive_pages").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? parse(data) : null;
}

export async function listPublishedInteractivePages() {
  const { data, error } = await supabase
    .from("interactive_pages")
    .select("id, title, level, status")
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function saveInteractivePage(
  id: string,
  patch: Partial<Pick<InteractivePage, "title" | "level" | "scene" | "status">>,
) {
  const { error } = await supabase
    .from("interactive_pages")
    .update({ ...patch, scene: patch.scene as any })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteInteractivePage(id: string) {
  const { error } = await supabase.from("interactive_pages").delete().eq("id", id);
  if (error) throw error;
}
