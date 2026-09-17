import { useEffect, useState } from "react";
import { Library, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  downloadLibraryBook,
  kindLabel,
  listLibraryBooks,
  type LibraryBook,
} from "@/lib/book-library";

/** Кнопка «З бібліотеки»: вибрав книгу — вона приходить як файл. */
export default function LibraryBookPicker({
  onPick,
  disabled,
  label = "З бібліотеки",
}: {
  onPick: (file: File, book: LibraryBook) => void;
  disabled?: boolean;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [books, setBooks] = useState<LibraryBook[] | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (!open || books) return;
    listLibraryBooks()
      .then(setBooks)
      .catch((e) => {
        toast({ title: "Бібліотека недоступна", description: String(e?.message ?? ""), variant: "destructive" });
        setBooks([]);
      });
  }, [open, books]);

  const pick = async (b: LibraryBook) => {
    setBusy(b.id);
    try {
      const file = await downloadLibraryBook(b);
      setOpen(false);
      onPick(file, b);
    } catch (e: any) {
      toast({ title: "Не вдалося взяти книгу", description: String(e?.message ?? ""), variant: "destructive" });
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-admin-border px-4 py-2 text-sm font-medium text-admin-fg transition-all hover:bg-admin-fg/5 disabled:opacity-50"
      >
        <Library className="h-4 w-4" /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="max-h-[75vh] w-full max-w-md overflow-y-auto rounded-2xl border border-admin-border bg-admin-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-sm font-semibold text-admin-fg">Книги з бібліотеки</h3>
            {books === null && <p className="text-sm text-admin-muted">Завантаження…</p>}
            {books?.length === 0 && (
              <p className="text-sm text-admin-muted">
                Бібліотека порожня. Додайте PDF у розділі «Бібліотека книг».
              </p>
            )}
            <div className="space-y-1">
              {(books ?? []).map((b) => (
                <button
                  key={b.id}
                  disabled={!!busy}
                  onClick={() => pick(b)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm text-admin-fg hover:bg-admin-fg/5 disabled:opacity-50"
                >
                  <span className="truncate">{b.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-admin-muted">
                    {kindLabel(b.kind)}
                    {b.level ? ` · ${b.level}` : ""}
                    {busy === b.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
