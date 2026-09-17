import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import type { LibraryBook } from "@/lib/book-library";
import LibraryBookPicker from "./LibraryBookPicker";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/** Бере сторінки книги з бібліотеки і віддає їх як картинки — далі як звичайні фото. */
export default function LibraryPagesPicker({
  max = 8,
  onPages,
  disabled,
}: {
  max?: number;
  onPages: (files: File[], book: LibraryBook) => void;
  disabled?: boolean;
}) {
  const [book, setBook] = useState<LibraryBook | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(2);
  const [busy, setBusy] = useState(false);

  const take = async () => {
    if (!file || !book) return;
    setBusy(true);
    try {
      const doc = await (pdfjsLib as any).getDocument({ data: await file.arrayBuffer() }).promise;
      const last = Math.min(to, doc.numPages, from + max - 1);
      const out: File[] = [];
      for (let n = Math.max(1, from); n <= last; n++) {
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
        const blob = await new Promise<Blob>((res, rej) =>
          canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.82),
        );
        out.push(new File([blob], `page-${n}.jpg`, { type: "image/jpeg" }));
        canvas.width = 0;
        canvas.height = 0;
      }
      if (out.length === 0) throw new Error("Виберіть сторінки");
      onPages(out, book);
      setBook(null);
      setFile(null);
    } catch (e: any) {
      toast({ title: "Не вдалося взяти сторінки", description: String(e?.message ?? ""), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <LibraryBookPicker
        theme="app"
        disabled={disabled || busy}
        label={book ? book.title : "З бібліотеки книг"}
        onPick={async (f, b) => {
          setBook(b);
          setFile(f);
          try {
            const doc = await (pdfjsLib as any).getDocument({ data: await f.arrayBuffer() }).promise;
            setTotal(doc.numPages);
            setFrom(1);
            setTo(Math.min(2, doc.numPages));
          } catch {
            setTotal(0);
          }
        }}
      />

      {book && (
        <>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">
              Сторінка з{total ? ` (усього ${total})` : ""}
            </label>
            <Input
              type="number"
              min={1}
              value={from}
              onChange={(e) => setFrom(Math.max(1, Number(e.target.value) || 1))}
              className="w-24"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase text-muted-foreground">до</label>
            <Input
              type="number"
              min={1}
              value={to}
              onChange={(e) => setTo(Math.max(1, Number(e.target.value) || 1))}
              className="w-24"
            />
          </div>
          <Button onClick={take} disabled={busy} className="gap-1.5">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Взяти сторінки
          </Button>
        </>
      )}
    </div>
  );
}
