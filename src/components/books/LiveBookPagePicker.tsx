import { useEffect, useState } from "react";
import { Loader2, BookMarked, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  listBooks, listPages, signedPageUrls, longSignedPageUrl,
  type Book, type BookPage,
} from "@/lib/books";
import { setLiveBookPage, type LiveBookPage } from "@/lib/live-class";

export default function LiveBookPagePicker({
  classId, current, onToBoard,
}: {
  classId: string;
  current?: LiveBookPage | null;
  /** When provided, clicking a page puts it right onto the whiteboard. */
  onToBoard?: (url: string, page: BookPage, bookTitle: string) => void;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState("");
  const [pages, setPages] = useState<BookPage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState<LiveBookPage | null>(current ?? null);

  useEffect(() => {
    (async () => {
      try {
        const list = await listBooks();
        setBooks(list);
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    if (!bookId) { setPages([]); return; }
    setLoading(true);
    (async () => {
      try {
        const p = await listPages(bookId);
        setPages(p);
        setUrls(await signedPageUrls(p.map((x) => x.image_path)));
      } catch (e: any) {
        toast.error(e?.message ?? "Не вдалося завантажити сторінки");
      } finally {
        setLoading(false);
      }
    })();
  }, [bookId]);

  const toBoard = async (p: BookPage) => {
    if (!onToBoard) return;
    const book = books.find((b) => b.id === bookId);
    const url = await longSignedPageUrl(p.image_path);
    if (!url) { toast.error("Не вдалося отримати сторінку"); return; }
    onToBoard(url, p, book?.title ?? "Підручник");
    toast.success(`Сторінка ${p.page_number ?? ""} на дошці`);
  };

  const show = async (p: BookPage) => {
    const book = books.find((b) => b.id === bookId);
    const payload: LiveBookPage = {
      book_title: book?.title ?? "Підручник",
      page_number: p.page_number ?? null,
      image_path: p.image_path,
    };
    try {
      await setLiveBookPage(classId, payload);
      setShown(payload);
      toast.success(`Учень бачить с. ${p.page_number ?? ""}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Помилка");
    }
  };

  const hide = async () => {
    try {
      await setLiveBookPage(classId, null);
      setShown(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Помилка");
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookMarked className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {onToBoard ? "Сторінка підручника на дошку" : "Сторінка підручника для учня"}
          </h3>
        </div>
        {shown && (
          <button
            onClick={hide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 hover:bg-slate-50"
          >
            <EyeOff className="w-3.5 h-3.5" /> Прибрати
          </button>
        )}
      </div>

      {shown && (
        <p className="mt-1 text-xs text-emerald-600">
          Показано: {shown.book_title}{shown.page_number ? `, с. ${shown.page_number}` : ""}
        </p>
      )}

      <select
        value={bookId}
        onChange={(e) => setBookId(e.target.value)}
        className="mt-3 w-full md:w-80 px-3 py-2 rounded-xl border border-slate-200 text-sm"
      >
        <option value="">Оберіть підручник…</option>
        {books.map((b) => (
          <option key={b.id} value={b.id}>{b.title}{b.level ? ` · ${b.level}` : ""}</option>
        ))}
      </select>

      {loading ? (
        <div className="mt-4 flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : pages.length > 0 ? (
        <div className="mt-3 grid grid-cols-3 md:grid-cols-6 gap-2 max-h-72 overflow-y-auto">
          {pages.map((p) => {
            const on = shown?.image_path === p.image_path;
            return (
              <button
                key={p.id}
                onClick={() => (onToBoard ? toBoard(p) : show(p))}
                className={`relative rounded-xl overflow-hidden border-2 transition ${
                  on ? "border-emerald-500" : "border-slate-200 hover:border-indigo-300"
                }`}
              >
                {urls[p.image_path] ? (
                  <img src={urls[p.image_path]} alt={`Сторінка ${p.page_number ?? ""}`} loading="lazy" className="w-full" />
                ) : (
                  <div className="aspect-[3/4] bg-slate-100" />
                )}
                <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-white/90 text-[10px] font-semibold">
                  {p.page_number ?? "—"}
                </span>
              </button>
            );
          })}
        </div>
      ) : bookId ? (
        <p className="mt-3 text-xs text-slate-500">У цьому підручнику ще немає сторінок.</p>
      ) : null}
    </div>
  );
}
