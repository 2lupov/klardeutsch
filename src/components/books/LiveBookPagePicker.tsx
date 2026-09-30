import { useEffect, useMemo, useState } from "react";
import { BookMarked, Check, Eye, EyeOff, GripVertical, ImagePlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  listBooks, listPages, signedPageUrls, longSignedPageUrl,
  type Book, type BookPage,
} from "@/lib/books";
import { setLiveBookPage, type LiveBookPage } from "@/lib/live-class";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function LiveBookPagePicker({
  classId, current, onToBoard,
}: {
  classId: string;
  current?: LiveBookPage | null;
  /** When provided, a selected page can be placed directly onto the whiteboard. */
  onToBoard?: (url: string, page: BookPage, bookTitle: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState("");
  const [pages, setPages] = useState<BookPage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [longUrls, setLongUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [shown, setShown] = useState<LiveBookPage | null>(current ?? null);
  const canAddToBoard = Boolean(onToBoard);

  const togglePick = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  useEffect(() => {
    (async () => {
      try {
        setBooks(await listBooks());
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    setShown(current ?? null);
  }, [current]);

  useEffect(() => {
    if (!bookId) {
      setPages([]);
      setSelectedId(null);
      return;
    }
    let active = true;
    setLoading(true);
    setUrls({});
    setLongUrls({});
    (async () => {
      try {
        const nextPages = await listPages(bookId);
        if (!active) return;
        setPages(nextPages);
        setSelectedId(nextPages[0]?.id ?? null);
        setUrls(await signedPageUrls(nextPages.map((page) => page.image_path)));
        if (canAddToBoard) {
          const entries = await Promise.all(
            nextPages.map(async (page) => [page.image_path, await longSignedPageUrl(page.image_path)] as const),
          );
          if (!active) return;
          const nextLongUrls: Record<string, string> = {};
          entries.forEach(([path, url]) => { if (url) nextLongUrls[path] = url; });
          setLongUrls(nextLongUrls);
        }
      } catch (error: unknown) {
        toast.error(error instanceof Error ? error.message : "Не вдалося завантажити сторінки");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookId, canAddToBoard]);

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedId) ?? pages[0] ?? null,
    [pages, selectedId],
  );
  const selectedBook = books.find((book) => book.id === bookId);

  const toBoard = async () => {
    if (!onToBoard || !selectedPage) return;
    const url = longUrls[selectedPage.image_path] || await longSignedPageUrl(selectedPage.image_path);
    if (!url) { toast.error("Не вдалося отримати сторінку"); return; }
    onToBoard(url, selectedPage, selectedBook?.title ?? "Підручник");
    toast.success(`Сторінка ${selectedPage.page_number ?? ""} на дошці`);
    setOpen(false);
  };

  const show = async () => {
    if (!selectedPage) return;
    const payload: LiveBookPage = {
      book_title: selectedBook?.title ?? "Підручник",
      page_number: selectedPage.page_number ?? null,
      image_path: selectedPage.image_path,
    };
    try {
      await setLiveBookPage(classId, payload);
      setShown(payload);
      toast.success(`Учень бачить с. ${selectedPage.page_number ?? ""}`);
      setOpen(false);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Помилка");
    }
  };

  const hide = async () => {
    try {
      await setLiveBookPage(classId, null);
      setShown(null);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Помилка");
    }
  };

  return (
    <div className="rounded-md border border-admin-border bg-admin-surface p-2 shadow-sm">
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button animated={false} variant="outline" className="h-auto w-full justify-start gap-3 px-3 py-3 text-left">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <BookMarked className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Обрати сторінку</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {shown ? `${shown.book_title} · с. ${shown.page_number ?? "—"}` : "Перегляд підручника"}
              </span>
            </span>
          </Button>
        </DialogTrigger>

        <DialogContent className="flex h-[min(88dvh,860px)] w-[min(96vw,1180px)] max-w-none flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-12">
            <div className="flex flex-wrap items-center gap-3">
              <DialogTitle className="mr-auto flex items-center gap-2 text-base">
                <BookMarked className="size-5 text-primary" />
                Сторінки підручника
              </DialogTitle>
              <select
                value={bookId}
                onChange={(event) => setBookId(event.target.value)}
                aria-label="Оберіть підручник"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring sm:w-80"
              >
                <option value="">Оберіть підручник…</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>{book.title}{book.level ? ` · ${book.level}` : ""}</option>
                ))}
              </select>
            </div>
          </DialogHeader>

          {!bookId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
              <span className="flex size-14 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <BookMarked className="size-6" />
              </span>
              <div>
                <p className="font-semibold text-foreground">Оберіть підручник</p>
                <p className="mt-1 text-sm text-muted-foreground">Усі сторінки відкриються тут для зручного перегляду.</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : pages.length > 0 && selectedPage ? (
            <div className="grid min-h-0 flex-1 grid-rows-[minmax(180px,38%)_minmax(0,1fr)] md:grid-cols-[310px_minmax(0,1fr)] md:grid-rows-1">
              <aside className="min-h-0 overflow-y-auto border-b border-border bg-muted/35 p-3 md:border-b-0 md:border-r">
                <div className="mb-3 flex items-center justify-between px-1">
                  <p className="text-xs font-semibold text-foreground">{pages.length} сторінок</p>
                  {canAddToBoard && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <GripVertical className="size-3" /> можна перетягувати
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-2">
                  {pages.map((page) => {
                    const selected = page.id === selectedPage.id;
                    const visible = shown?.image_path === page.image_path;
                    const pageUrl = urls[page.image_path];
                    return (
                      <Button
                        animated={false}
                        type="button"
                        variant="ghost"
                        key={page.id}
                        draggable={canAddToBoard}
                        onDragStart={(event) => {
                          const url = longUrls[page.image_path] || pageUrl;
                          if (!url) return;
                          event.dataTransfer.setData("application/x-board-image", url);
                          event.dataTransfer.setData("text/plain", url);
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => setSelectedId(page.id)}
                        className={`relative h-auto overflow-hidden rounded-md border-2 p-0 transition-colors ${
                          selected ? "border-primary bg-primary/5" : "border-border bg-background hover:border-primary/40"
                        } ${canAddToBoard ? "cursor-grab active:cursor-grabbing" : ""}`}
                        aria-label={`Переглянути сторінку ${page.page_number ?? "без номера"}`}
                      >
                        {pageUrl ? (
                          <img src={pageUrl} alt={`Сторінка ${page.page_number ?? ""}`} loading="lazy" className="aspect-[3/4] w-full object-cover object-top" />
                        ) : (
                          <span className="block aspect-[3/4] w-full animate-pulse bg-muted" />
                        )}
                        <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-background/90 px-2 py-1 text-[11px] font-semibold text-foreground backdrop-blur-sm">
                          с. {page.page_number ?? "—"}
                          {visible && <Check className="size-3.5 text-emerald-600" />}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </aside>

              <section className="flex min-h-0 flex-col bg-muted/20">
                <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
                  <div className="mx-auto flex min-h-full max-w-3xl items-center justify-center">
                    {urls[selectedPage.image_path] ? (
                      <img
                        src={urls[selectedPage.image_path]}
                        alt={`${selectedBook?.title ?? "Підручник"}, сторінка ${selectedPage.page_number ?? ""}`}
                        className="max-h-full max-w-full rounded-md border border-border bg-background object-contain shadow-lg"
                      />
                    ) : (
                      <div className="aspect-[3/4] h-full max-h-[560px] animate-pulse rounded-md bg-muted" />
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-border bg-background px-4 py-3">
                  <div className="mr-auto min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{selectedBook?.title}</p>
                    <p className="text-xs text-muted-foreground">Сторінка {selectedPage.page_number ?? "—"}</p>
                  </div>
                  {canAddToBoard && (
                    <Button animated={false} variant="outline" onClick={toBoard}>
                      <ImagePlus className="size-4" /> На дошку
                    </Button>
                  )}
                  <Button animated={false} onClick={show}>
                    <Eye className="size-4" /> Показати учню
                  </Button>
                </div>
              </section>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
              У цьому підручнику ще немає сторінок.
            </div>
          )}
        </DialogContent>
      </Dialog>

      {shown && (
        <div className="mt-2 flex items-center gap-2 rounded-md bg-emerald-500/10 px-2.5 py-2">
          <Eye className="size-3.5 shrink-0 text-emerald-600" />
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
            Учень бачить с. {shown.page_number ?? "—"}
          </span>
          <Button animated={false} variant="ghost" size="icon" onClick={hide} className="size-7 shrink-0" title="Прибрати сторінку в учня">
            <EyeOff className="size-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}