import { useRef, useState } from "react";
import { Loader2, FileUp, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { insertPage, uploadPageImage } from "@/lib/books";

// pdfjs-dist v4 ESM build + worker
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Props {
  bookId: string;
  /** page number the next uploaded page gets */
  startPage: number;
  onDone: () => void;
}

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

export default function PdfUploader({ bookId, startPage, onDone }: Props) {
  const pdfRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const handlePdf = async (file: File) => {
    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
      const total = pdf.numPages;
      setProgress({ done: 0, total });

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
        setProgress({ done: i, total });
      }
      toast.success(`Завантажено сторінок: ${total}`);
      onDone();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Не вдалося обробити PDF");
    } finally {
      setBusy(false);
      setProgress(null);
      if (pdfRef.current) pdfRef.current.value = "";
    }
  };

  const handleImages = async (files: File[]) => {
    setBusy(true);
    try {
      setProgress({ done: 0, total: files.length });
      for (let i = 0; i < files.length; i++) {
        const pageNumber = startPage + i;
        const path = await uploadPageImage(bookId, pageNumber, files[i]);
        await insertPage({ book_id: bookId, page_number: pageNumber, image_path: path });
        setProgress({ done: i + 1, total: files.length });
      }
      toast.success(`Завантажено сторінок: ${files.length}`);
      onDone();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Не вдалося завантажити фото");
    } finally {
      setBusy(false);
      setProgress(null);
      if (imgRef.current) imgRef.current.value = "";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={pdfRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handlePdf(f);
        }}
      />
      <input
        ref={imgRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const f = Array.from(e.target.files ?? []);
          if (f.length) handleImages(f);
        }}
      />
      <button
        disabled={busy}
        onClick={() => pdfRef.current?.click()}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
        Завантажити PDF
      </button>
      <button
        disabled={busy}
        onClick={() => imgRef.current?.click()}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 disabled:opacity-60"
      >
        <ImageIcon className="w-4 h-4" />
        Фото сторінок
      </button>
      {progress && (
        <span className="text-xs text-slate-500">
          Обробка {progress.done}/{progress.total}…
        </span>
      )}
      <span className="text-xs text-slate-400">Перша сторінка отримає № {startPage}</span>
    </div>
  );
}
