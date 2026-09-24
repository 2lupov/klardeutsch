import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "@/integrations/supabase/client";
import { normalizeKit, type LessonKit } from "@/lib/lesson-kits";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** Малює вибрані сторінки PDF у JPEG-картинки (не більше `max`). */
export async function renderPdfPages(file: File, from: number, to: number, max = 8): Promise<Blob[]> {
  const doc = await (pdfjsLib as any).getDocument({ data: await file.arrayBuffer() }).promise;
  const first = Math.max(1, from);
  const last = Math.min(to, doc.numPages, first + max - 1);
  const out: Blob[] = [];
  for (let n = first; n <= last; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(2.2, 1400 / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    out.push(
      await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.82),
      ),
    );
    canvas.width = 0;
    canvas.height = 0;
  }
  return out;
}

export interface KitFromPdfInput {
  ownerId: string;
  file: File;
  title: string;
  level: string;
  focus: "kursbuch" | "arbeitsbuch";
  from: number;
  to: number;
  notes?: string;
  onProgress?: (text: string) => void;
}

/** Сторінки PDF → інтерактивний урок (набір блоків) у бібліотеці уроків. */
export async function createKitFromPdf(input: KitFromPdfInput): Promise<LessonKit> {
  const { file, from, to } = input;
  const blobs = await renderPdfPages(file, from, to);
  return createKitFromImages({ ...input, images: blobs, source: "pdf" });
}

/** Фото сторінок використовують той самий kit/AI pipeline, що й відрендерений PDF. */
export async function createKitFromImages(input: Omit<KitFromPdfInput, "file" | "from" | "to"> & { images: Blob[]; source?: "pdf" | "photo" }): Promise<LessonKit> {
  const { ownerId, title, level, focus, notes = "", onProgress, images, source = "photo" } = input;
  const say = (t: string) => onProgress?.(t);
  if (!images.length || images.length > 12) throw new Error("Виберіть від 1 до 12 сторінок");

  say("Створюємо урок…");
  const { data: created, error: insErr } = await supabase
    .from("lesson_kits")
    .insert({
      owner_id: ownerId,
      title: title.trim() || "Урок з книги",
      level,
      focus,
      source,
      notes: notes.trim() || null,
    })
    .select("id")
    .single();
  if (insErr) throw insErr;
  const kitId = (created as any).id as string;

  say("Готуємо сторінки книги…");
  const paths: string[] = [];
  for (const [i, blob] of images.entries()) {
    if (!blob.type.startsWith("image/")) throw new Error("Виберіть зображення сторінок");
    if (blob.size > 12 * 1024 * 1024) throw new Error("Зображення завелике (максимум 12 МБ на сторінку)");
    const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
    const path = `kits/${kitId}/page-${Date.now()}-${i}.${ext}`;
    const { error } = await supabase.storage
      .from("tutoring-materials")
      .upload(path, blob, { contentType: blob.type, upsert: true });
    if (error) throw error;
    paths.push(path);
  }

  say("ШІ читає текст, слова, пропуски й робить блоки…");
  const { data, error } = await supabase.functions.invoke("book-to-lesson-kit", {
    body: { kit_id: kitId, image_paths: paths, level, focus, instructions: notes.slice(0, 1500) },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);

  const { data: fresh, error: readErr } = await supabase.from("lesson_kits").select("*").eq("id", kitId).single();
  if (readErr) throw readErr;
  return normalizeKit(fresh);
}

export interface AssignableStudent {
  id: string;
  name: string;
}

export async function listAssignableStudents(limit = 200): Promise<AssignableStudent[]> {
  const { data } = await supabase
    .from("profiles")
    .select("user_id, display_name, nickname")
    .order("display_name")
    .limit(limit);
  return ((data ?? []) as any[]).map((p) => ({
    id: p.user_id,
    name: p.display_name || p.nickname || "Учень",
  }));
}

/** Дає готовий урок учню як домашнє завдання. */
export async function assignKitToStudent(teacherId: string, kit: LessonKit, studentId: string): Promise<void> {
  const images = [...kit.blocks, ...kit.sections.flatMap((s) => s.blocks)].map((b) => b.payload?.image_path).filter((p): p is string => typeof p === "string" && p.startsWith(`kits/${kit.id}/`));
  const audio = [...kit.blocks, ...kit.sections.flatMap((s) => s.blocks)].map((b) => b.payload?.audio_path).filter((p): p is string => typeof p === "string" && p.startsWith(`kits/${kit.id}/`));
  const { error } = await supabase.from("student_assignments").insert({
    teacher_id: teacherId,
    student_id: studentId,
    type: "blocks",
    title: kit.title,
    instructions: "Виконай усі блоки та натисни «Здати».",
    level: kit.level,
    payload: { kit_id: kit.id, blocks: kit.blocks, sections: kit.sections, page_paths: kit.page_paths, presentation_id: kit.presentation_id, image_paths: [...new Set(images)], audio_paths: [...new Set(audio)] } as any,
    status: "assigned",
  });
  if (error) throw error;
  await supabase.from("lesson_kits").update({ last_assigned_at: new Date().toISOString() }).eq("id", kit.id);
}
