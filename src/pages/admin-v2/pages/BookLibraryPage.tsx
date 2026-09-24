import { useEffect, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ExternalLink, FileUp, Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  BOOK_KINDS,
  deleteLibraryBook,
  kindLabel,
  libraryBookUrl,
  listLibraryBooks,
  prettySize,
  uploadLibraryBook,
  type LibraryBook,
} from "@/lib/book-library";
import { Btn, Card, EmptyState, SectionHeader } from "./_ui";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

/** Бібліотека книг: закинув PDF один раз — далі бере будь-де. */
export default function BookLibraryPage() {
  const { user } = useAuth();
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [uploading, setUploading] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const openWorkshop = (book: LibraryBook, assign = false) => {
    sessionStorage.setItem("klar-workshop-source", JSON.stringify({ source: "book", id: book.id, assign }));
    window.dispatchEvent(new CustomEvent("admin-v2:navigate", { detail: { key: "workshop" } }));
  };

  const load = async () => {
    try {
      setBooks(await listLibraryBooks());
    } catch (e: any) {
      toast({ title: "Не вдалося відкрити бібліотеку", description: String(e?.message ?? ""), variant: "destructive" });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addFiles = async (files: File[]) => {
    if (!user?.id) return;
    const pdfs = files.filter((f) => f.type === "application/pdf");
    if (pdfs.length === 0) return toast({ title: "Потрібні PDF-файли", variant: "destructive" });

    for (const [i, f] of pdfs.entries()) {
      setUploading(`${f.name} (${i + 1}/${pdfs.length})`);
      try {
        let pages = 0;
        try {
          const doc = await (pdfjsLib as any).getDocument({ data: await f.arrayBuffer() }).promise;
          pages = doc.numPages;
        } catch {
          pages = 0;
        }
        const name = f.name.replace(/\.pdf$/i, "");
        const guessLevel = LEVELS.find((l) => new RegExp(l, "i").test(name)) ?? null;
        const guessKind = /arbeitsbuch|übungsbuch|ubungsbuch/i.test(name)
          ? "arbeitsbuch"
          : /grammatik|trainer/i.test(name)
            ? "grammatik"
            : "kursbuch";
        const book = await uploadLibraryBook({
          ownerId: user.id,
          file: f,
          title: name,
          kind: guessKind,
          level: guessLevel,
          totalPages: pages,
        });
        setBooks((s) => [book, ...s]);
      } catch (e: any) {
        toast({ title: `Не вдалося додати ${f.name}`, description: String(e?.message ?? ""), variant: "destructive" });
      }
    }
    setUploading("");
  };

  const patch = async (book: LibraryBook, values: Partial<LibraryBook>) => {
    setBooks((s) => s.map((b) => (b.id === book.id ? { ...b, ...values } : b)));
    const { error } = await supabase.from("book_files").update(values as any).eq("id", book.id);
    if (error) toast({ title: "Не збереглося", description: error.message, variant: "destructive" });
  };

  const remove = async (book: LibraryBook) => {
    try {
      await deleteLibraryBook(book);
      setBooks((s) => s.filter((b) => b.id !== book.id));
    } catch (e: any) {
      toast({ title: "Не вдалося видалити", description: String(e?.message ?? ""), variant: "destructive" });
    }
  };

  const open = async (book: LibraryBook) => {
    const url = await libraryBookUrl(book);
    if (url) window.open(url, "_blank");
  };

  const shown = books.filter(
    (b) =>
      (kind === "all" || b.kind === kind) &&
      (search.trim() === "" || `${b.title} ${b.level ?? ""}`.toLowerCase().includes(search.toLowerCase())),
  );

  const uploadLabel = (
    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-admin-primary px-4 py-2 text-sm font-medium text-admin-primary-fg hover:opacity-90">
      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
      {uploading ? "Завантажую…" : "Додати книги"}
      <input
        type="file"
        accept="application/pdf"
        multiple
        className="hidden"
        disabled={!!uploading}
        onChange={(e) => {
          const list = Array.from(e.target.files ?? []);
          e.target.value = "";
          addFiles(list);
        }}
      />
    </label>
  );

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Бібліотека книг"
        subtitle="Закиньте PDF один раз — далі вони доступні в генераторі уроку і на живому уроці"
        action={uploadLabel}
      />

      {uploading && <Card className="p-3 text-sm text-admin-muted">{uploading}</Card>}

      {books.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за назвою"
            className="w-56 rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
          >
            <option value="all">Усі типи</option>
            {BOOK_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-admin-muted">{shown.length} книг</span>
        </div>
      )}

      {books.length === 0 && !uploading ? (
        <EmptyState
          title="Бібліотека поки порожня"
          description="Перетягніть сюди свої PDF — Kursbuch, Arbeitsbuch, граматики. Потім вибираєте книгу зі списку, і ШІ робить з неї урок."
          cta={undefined}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((b) => (
            <Card key={b.id} className="p-4 space-y-3">
              <input
                value={b.title}
                onChange={(e) => setBooks((s) => s.map((x) => (x.id === b.id ? { ...x, title: e.target.value } : x)))}
                onBlur={(e) => patch(b, { title: e.target.value.trim() || b.title })}
                className="w-full rounded-lg bg-transparent text-sm font-semibold text-admin-fg outline-none focus:bg-admin-fg/5 px-1 py-0.5"
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={b.kind}
                  onChange={(e) => patch(b, { kind: e.target.value })}
                  className="rounded-lg border border-admin-border bg-admin-card px-2 py-1 text-xs text-admin-fg"
                >
                  {BOOK_KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <select
                  value={b.level ?? ""}
                  onChange={(e) => patch(b, { level: e.target.value || null })}
                  className="rounded-lg border border-admin-border bg-admin-card px-2 py-1 text-xs text-admin-fg"
                >
                  <option value="">Рівень —</option>
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-admin-muted">
                  {b.total_pages ? `${b.total_pages} стор.` : "—"} · {prettySize(b.size_bytes)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Btn onClick={() => openWorkshop(b)}>
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" /> Створити урок із книги
                  </span>
                </Btn>
                <Btn variant="ghost" onClick={() => openWorkshop(b, true)}>
                  <span className="inline-flex items-center gap-1.5">
                    <Send className="h-4 w-4" /> Дати як домашку
                  </span>
                </Btn>
              </div>

              <div className="flex items-center justify-between">
                <span className="rounded-full bg-admin-accent/20 px-2 py-0.5 text-[11px] font-medium text-admin-fg">
                  {kindLabel(b.kind)}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => open(b)}
                    title="Відкрити PDF"
                    className="rounded-lg p-2 text-admin-muted hover:bg-admin-fg/5 hover:text-admin-fg"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => remove(b)}
                    title="Видалити"
                    className="rounded-lg p-2 text-admin-danger hover:bg-admin-danger/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

    </div>
  );
}
