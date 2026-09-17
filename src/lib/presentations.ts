import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "@/integrations/supabase/client";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const PRESENTATION_BUCKET = "presentation-slides";

export interface Presentation {
  id: string;
  owner_id: string;
  title: string;
  slide_paths: string[];
  page_count: number;
  created_at: string;
}

function normalize(row: any): Presentation {
  return {
    id: row.id,
    owner_id: row.owner_id,
    title: row.title,
    slide_paths: row.slide_paths ?? [],
    page_count: row.page_count ?? (row.slide_paths ?? []).length,
    created_at: row.created_at,
  };
}

export async function listPresentations(): Promise<Presentation[]> {
  const { data, error } = await supabase
    .from("presentations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

/** Підписані посилання на слайди (для показу учню). */
export async function slideUrls(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data, error } = await supabase.storage
    .from(PRESENTATION_BUCKET)
    .createSignedUrls(paths, 60 * 60 * 6);
  if (error) throw error;
  const map = new Map((data ?? []).map((d: any) => [d.path, d.signedUrl]));
  return paths.map((p) => map.get(p) || "");
}

/** PDF презентації → картинки слайдів + запис у бібліотеці. */
export async function uploadPresentation(opts: {
  ownerId: string;
  file: File;
  title?: string;
  onProgress?: (text: string) => void;
}): Promise<Presentation> {
  const { ownerId, file, onProgress } = opts;
  const say = (t: string) => onProgress?.(t);
  const title = (opts.title || file.name.replace(/\.pdf$/i, "")).trim() || "Презентація";

  say("Читаємо PDF…");
  const doc = await (pdfjsLib as any).getDocument({ data: await file.arrayBuffer() }).promise;
  const total: number = doc.numPages;

  const { data: created, error: insErr } = await supabase
    .from("presentations")
    .insert({ owner_id: ownerId, title, slide_paths: [], page_count: 0 })
    .select("*")
    .single();
  if (insErr) throw insErr;

  const paths: string[] = [];
  for (let n = 1; n <= total; n++) {
    say(`Готуємо слайд ${n} з ${total}…`);
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2.4, 1800 / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await new Promise<Blob>((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.85),
    );
    canvas.width = 0;
    canvas.height = 0;

    const path = `${created.id}/slide-${String(n).padStart(3, "0")}.jpg`;
    const { error: upErr } = await supabase.storage
      .from(PRESENTATION_BUCKET)
      .upload(path, blob, { contentType: "image/jpeg", upsert: true });
    if (upErr) throw upErr;
    paths.push(path);
  }

  const { data: updated, error: updErr } = await supabase
    .from("presentations")
    .update({ slide_paths: paths, page_count: paths.length })
    .eq("id", created.id)
    .select("*")
    .single();
  if (updErr) throw updErr;
  say("Готово");
  return normalize(updated);
}

export async function renamePresentation(id: string, title: string) {
  const { error } = await supabase.from("presentations").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function deletePresentation(p: Presentation) {
  if (p.slide_paths.length) {
    await supabase.storage.from(PRESENTATION_BUCKET).remove(p.slide_paths);
  }
  const { error } = await supabase.from("presentations").delete().eq("id", p.id);
  if (error) throw error;
}
