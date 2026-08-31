import { useRef, useState } from "react";
import { Archive, Loader2, FileText, Music, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { unzip } from "fflate";
import {
  BookKind, BOOK_KIND_LABEL, createBook, insertAudio, uploadAudioFile,
} from "@/lib/books";
import { renderPdfIntoBook } from "@/lib/pdfPages";

const AUDIO_EXT = ["mp3", "m4a", "wav", "ogg", "aac", "mp4a", "opus"];

interface PdfEntry {
  name: string;
  base: string;
  data: Uint8Array;
  title: string;
  kind: BookKind;
  level: string;
  include: boolean;
}

interface AudioEntry {
  name: string;
  base: string;
  data: Uint8Array;
  title: string;
  trackNo: number | null;
  targetPdf: number; // index into pdfs
  include: boolean;
}

function ext(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function baseName(path: string) {
  return path.split("/").pop() ?? path;
}

function guessKind(name: string): BookKind {
  const n = name.toLowerCase();
  if (/arbeitsbuch|\bab\b|workbook|zoshyt|übungsbuch|ubungsbuch/.test(n)) return "arbeitsbuch";
  if (/kursbuch|\bkb\b|lehrbuch|coursebook|textbook/.test(n)) return "kursbuch";
  return "other";
}

function guessLevel(name: string): string {
  const m = name.toUpperCase().match(/\b(A1|A2|B1|B2|C1|C2)\b/);
  return m ? m[1] : "A1";
}

function guessTrackNo(name: string): number | null {
  const m = baseName(name).match(/(\d{1,3})/);
  return m ? Number(m[1]) : null;
}

function cleanTitle(name: string) {
  return baseName(name).replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").trim();
}

/** Pick the PDF whose folder/name best matches the audio path. */
function matchPdf(audioPath: string, pdfs: PdfEntry[]): number {
  const a = audioPath.toLowerCase();
  let best = 0;
  let bestScore = -1;
  pdfs.forEach((p, i) => {
    const folder = p.name.toLowerCase().split("/").slice(0, -1).join("/");
    let score = 0;
    if (folder && a.startsWith(folder)) score += 3;
    if (p.kind === "kursbuch") score += 1;
    if (score > bestScore) { bestScore = score; best = i; }
  });
  return best;
}

interface Props {
  onDone: () => void;
}

export default function BookArchiveImporter({ onDone }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [pdfs, setPdfs] = useState<PdfEntry[]>([]);
  const [audios, setAudios] = useState<AudioEntry[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const reset = () => {
    setPdfs([]);
    setAudios([]);
    setStatus(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleZip = async (file: File) => {
    setReading(true);
    setStatus("Розпаковую архів…");
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const files = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
        unzip(buf, (err, data) => (err ? reject(err) : resolve(data)));
      });

      const nextPdfs: PdfEntry[] = [];
      const rawAudio: { name: string; data: Uint8Array }[] = [];

      Object.entries(files).forEach(([name, data]) => {
        if (!data?.length || name.endsWith("/") || baseName(name).startsWith(".")) return;
        const e = ext(name);
        if (e === "pdf") {
          nextPdfs.push({
            name,
            base: baseName(name),
            data,
            title: cleanTitle(name),
            kind: guessKind(name),
            level: guessLevel(name),
            include: true,
          });
        } else if (AUDIO_EXT.includes(e)) {
          rawAudio.push({ name, data });
        }
      });

      if (!nextPdfs.length && !rawAudio.length) {
        toast.error("В архіві не знайдено PDF або аудіофайлів");
        reset();
        return;
      }

      nextPdfs.sort((a, b) => a.name.localeCompare(b.name));
      const nextAudios: AudioEntry[] = rawAudio
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
        .map(({ name, data }) => ({
          name,
          base: baseName(name),
          data,
          title: cleanTitle(name),
          trackNo: guessTrackNo(name),
          targetPdf: nextPdfs.length ? matchPdf(name, nextPdfs) : -1,
          include: true,
        }));

      setPdfs(nextPdfs);
      setAudios(nextAudios);
      setStatus(null);
      toast.success(`Знайдено: ${nextPdfs.length} PDF · ${nextAudios.length} аудіо`);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Не вдалося прочитати ZIP");
      reset();
    } finally {
      setReading(false);
    }
  };

  const runImport = async () => {
    const usePdfs = pdfs.filter((p) => p.include);
    const useAudios = audios.filter((a) => a.include);
    if (!usePdfs.length) return toast.error("Виберіть хоча б один PDF (книгу)");

    setImporting(true);
    try {
      const createdIds: (string | null)[] = pdfs.map(() => null);

      for (let i = 0; i < pdfs.length; i++) {
        const p = pdfs[i];
        if (!p.include) continue;
        setStatus(`Створюю книгу «${p.title}»…`);
        const book = await createBook({
          title: p.title,
          kind: p.kind,
          level: p.level,
          language: "de",
        });
        createdIds[i] = book.id;
        await renderPdfIntoBook(book.id, p.data, 1, (done, total) => {
          setStatus(`«${p.title}»: сторінка ${done}/${total}`);
        });
      }

      for (let i = 0; i < useAudios.length; i++) {
        const a = useAudios[i];
        const bookId = createdIds[a.targetPdf] ?? createdIds.find((x) => x) ?? null;
        if (!bookId) continue;
        setStatus(`Аудіо ${i + 1}/${useAudios.length}: ${a.title}`);
        const blob = new Blob([a.data as unknown as BlobPart]);
        const path = await uploadAudioFile(bookId, a.base, blob);
        await insertAudio({
          book_id: bookId,
          title: a.title,
          file_path: path,
          track_no: a.trackNo,
        });
      }

      toast.success(`Готово: книг ${usePdfs.length}, аудіо ${useAudios.length}`);
      reset();
      onDone();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message ?? "Помилка імпорту");
    } finally {
      setImporting(false);
      setStatus(null);
    }
  };

  const busy = reading || importing;

  return (
    <div className="space-y-4">
      <input
        ref={fileRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleZip(f);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <button
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
          Вибрати ZIP-архів
        </button>
        {(pdfs.length > 0 || audios.length > 0) && !importing && (
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600"
          >
            <Trash2 className="w-4 h-4" /> Скинути
          </button>
        )}
        {status && <span className="text-xs text-slate-500">{status}</span>}
      </div>

      {pdfs.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Книги з архіву ({pdfs.length})
          </h4>
          {pdfs.map((p, i) => (
            <div key={p.name} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={p.include}
                  disabled={importing}
                  onChange={(e) =>
                    setPdfs((v) => v.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))
                  }
                  className="mt-1"
                />
                <FileText className="w-4 h-4 mt-1 text-indigo-600 shrink-0" />
                <div className="min-w-0 flex-1 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    value={p.title}
                    disabled={importing}
                    onChange={(e) =>
                      setPdfs((v) => v.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                  />
                  <select
                    value={p.kind}
                    disabled={importing}
                    onChange={(e) =>
                      setPdfs((v) => v.map((x, j) => (j === i ? { ...x, kind: e.target.value as BookKind } : x)))
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                  >
                    {(Object.keys(BOOK_KIND_LABEL) as BookKind[]).map((k) => (
                      <option key={k} value={k}>{BOOK_KIND_LABEL[k]}</option>
                    ))}
                  </select>
                  <select
                    value={p.level}
                    disabled={importing}
                    onChange={(e) =>
                      setPdfs((v) => v.map((x, j) => (j === i ? { ...x, level: e.target.value } : x)))
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                  >
                    {["A1", "A2", "B1", "B2", "C1"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 pl-6 truncate">{p.name}</p>
            </div>
          ))}
        </div>
      )}

      {audios.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Аудіо (Hören) — {audios.length}
          </h4>
          <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
            {audios.map((a, i) => (
              <div key={a.name} className="rounded-xl border border-slate-200 p-2.5 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={a.include}
                  disabled={importing}
                  onChange={(e) =>
                    setAudios((v) => v.map((x, j) => (j === i ? { ...x, include: e.target.checked } : x)))
                  }
                />
                <Music className="w-4 h-4 text-emerald-600 shrink-0" />
                <input
                  value={a.title}
                  disabled={importing}
                  onChange={(e) =>
                    setAudios((v) => v.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                  }
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                />
                <input
                  type="number"
                  value={a.trackNo ?? ""}
                  disabled={importing}
                  placeholder="№"
                  onChange={(e) =>
                    setAudios((v) =>
                      v.map((x, j) =>
                        j === i ? { ...x, trackNo: e.target.value ? Number(e.target.value) : null } : x,
                      ),
                    )
                  }
                  className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm"
                />
                <select
                  value={a.targetPdf}
                  disabled={importing}
                  onChange={(e) =>
                    setAudios((v) => v.map((x, j) => (j === i ? { ...x, targetPdf: Number(e.target.value) } : x)))
                  }
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-sm max-w-[180px]"
                >
                  {pdfs.map((p, pi) => (
                    <option key={p.name} value={pi}>{p.title}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {(pdfs.length > 0 || audios.length > 0) && (
        <button
          onClick={runImport}
          disabled={importing}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium disabled:opacity-60"
        >
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Імпортувати в банк підручників
        </button>
      )}
    </div>
  );
}
