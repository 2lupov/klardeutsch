import { useEffect, useState } from "react";
import { BookMarked, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { listBooks, listPages, signedPageUrls, type Book, type BookPage } from "@/lib/books";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface PickedPage {
  book: Book;
  page: BookPage;
}

/** Діалог вибору сторінок підручника: обираєш книжку, тицяєш сторінки, додаєш у папку. */
export default function BookPagePicker({
  open, onOpenChange, onPick, actionLabel = "Додати в папку",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (pages: PickedPage[]) => Promise<void> | void;
  actionLabel?: string;
}) {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState("");
  const [pages, setPages] = useState<BookPage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    listBooks().then(setBooks).catch(() => toast.error("Не вдалося завантажити підручники"));
  }, [open]);

  useEffect(() => {
    if (!bookId) { setPages([]); setUrls({}); setPicked(new Set()); return; }
    let live = true;
    setLoading(true);
    setPicked(new Set());
    (async () => {
      try {
        const list = await listPages(bookId);
        if (!live) return;
        setPages(list);
        setUrls(await signedPageUrls(list.map((p) => p.image_path)));
      } catch {
        if (live) toast.error("Не вдалося завантажити сторінки");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [bookId]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const confirm = async () => {
    const book = books.find((b) => b.id === bookId);
    if (!book || picked.size === 0) return;
    setBusy(true);
    try {
      await onPick(pages.filter((p) => picked.has(p.id)).map((page) => ({ book, page })));
      setPicked(new Set());
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookMarked className="h-4 w-4 text-primary" /> Сторінки підручника
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap gap-2">
            {books.length === 0 && (
              <p className="text-sm text-muted-foreground">Немає доступних підручників.</p>
            )}
            {books.map((b) => (
              <button
                key={b.id}
                onClick={() => setBookId(b.id)}
                className={cn(
                  "rounded-xl border px-3 py-2 text-left text-xs font-semibold transition",
                  b.id === bookId ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50",
                )}
              >
                <span className="block max-w-[200px] truncate">{b.title}</span>
                {b.level && <span className="block text-[10px] font-normal text-muted-foreground">{b.level}</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="grid h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : pages.length > 0 ? (
            <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-4 lg:grid-cols-5">
              {pages.map((p) => {
                const on = picked.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className={cn(
                      "relative overflow-hidden rounded-xl border bg-muted/40 transition",
                      on ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/50",
                    )}
                  >
                    {urls[p.image_path] ? (
                      <img src={urls[p.image_path]} alt={`Сторінка ${p.page_number}`} className="aspect-[3/4] w-full object-cover" />
                    ) : (
                      <div className="grid aspect-[3/4] w-full place-items-center text-xs text-muted-foreground">…</div>
                    )}
                    <span className="absolute bottom-1 left-1 rounded-md bg-background/85 px-1.5 text-[11px] font-bold">
                      {p.page_number}
                    </span>
                    {on && (
                      <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : bookId ? (
            <p className="text-sm text-muted-foreground">У цій книжці ще немає сторінок.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Виберіть підручник, щоб побачити сторінки.</p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">Вибрано: {picked.size}</span>
          <Button animated={false} className="ml-auto" onClick={confirm} disabled={picked.size === 0 || busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Check />} {actionLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
