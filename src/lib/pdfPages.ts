import { insertPage, uploadPageImage } from "@/lib/books";

// pdfjs-dist v4 ESM build + worker
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_WIDTH = 1400;

async function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Не вдалося створити зображення"))),
      "image/jpeg",
      0.82,
    );
  });
}

/** Render every page of a PDF to a JPEG and store it as a book page. */
export async function renderPdfIntoBook(
  bookId: string,
  data: ArrayBuffer | Uint8Array,
  startPage: number,
  onProgress?: (done: number, total: number) => void,
): Promise<number> {
  const pdf = await (pdfjsLib as any).getDocument({ data }).promise;
  const total = pdf.numPages;
  onProgress?.(0, total);

  for (let i = 1; i <= total; i++) {
    const page = await pdf.getPage(i);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2.2, MAX_WIDTH / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    const blob = await blobFromCanvas(canvas);
    const pageNumber = startPage + i - 1;
    const path = await uploadPageImage(bookId, pageNumber, blob);
    await insertPage({ book_id: bookId, page_number: pageNumber, image_path: path });
    canvas.width = 0;
    canvas.height = 0;
    onProgress?.(i, total);
  }
  return total;
}
