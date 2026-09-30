import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookMarked, Plus, Trash2, Loader2, Sparkles, X, ChevronLeft, Send, Check,
  Archive, Music, Upload,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import {
  Book, BookKind, BookLektion, BookPage, BookTask, BookAudio, BookLessonPlan, BOOK_KIND_LABEL,
  bookToBank, createBook, deleteAudio, deleteBook, deletePage, deleteTask, detectLektionen,
  insertAudio, linkPagesToLektion, listAudio, listBooks, listLektionen, listPages, listTasks,
  recognisePage, signedAudioUrl, signedPageUrls, updateAudio, uploadAudioFile, upsertLektion,
} from "@/lib/books";

import PdfUploader from "@/components/books/PdfUploader";
import BookArchiveImporter from "@/components/books/BookArchiveImporter";
import BookTheoryBlock from "@/components/books/BookTheoryBlock";
import BookLessonPlanPanel from "@/components/books/BookLessonPlanPanel";


interface StudentRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

const KIND_LABEL: Record<string, string> = {
  reading: "📖 Читання",
  listening: "🎧 Аудіювання",
  grammar: "🧩 Граматика",
  writing: "✍️ Письмо",
  speaking: "🗣 Говоріння",
  vocab: "📚 Лексика",
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [archive, setArchive] = useState(false);
  const [openBook, setOpenBook] = useState<Book | null>(null);
  const [shelf, setShelf] = useState<string | null>(null);
  const [moving, setMoving] = useState<Book | null>(null);

  const shelves = useMemo(
    () => [...new Set(books.map((b) => b.folder).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "uk")),
    [books],
  );
  const visibleBooks = useMemo(
    () => (shelf === null ? books : shelf === "__none__" ? books.filter((b) => !b.folder) : books.filter((b) => b.folder === shelf)),
    [books, shelf],
  );

  const load = async () => {
    try {
      setBooks(await listBooks());
    } catch (e: any) {
      toast.error(e?.message ?? "Не вдалося завантажити підручники");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (openBook) {
    return <BookDetail book={openBook} onBack={() => { setOpenBook(null); load(); }} />;
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Підручники"
        subtitle="Kursbuch / Arbeitsbuch + аудіо (Hören) — джерело домашніх завдань"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setArchive((v) => !v)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Archive className="w-4 h-4" /> Імпорт ZIP (книги + аудіо)
            </button>
            <button
              onClick={() => setCreating(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Новий підручник
            </button>
          </div>
        }
      />

      {archive && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-slate-900">Імпорт архіву</h3>
          <p className="text-xs text-slate-500 mt-1 mb-3">
            Один ZIP може містити кілька книг (Kursbuch, Arbeitsbuch…) і всі аудіофайли до них.
            Кожен PDF стане окремим підручником, аудіо привʼяжеться до вибраної книги.
          </p>
          <BookArchiveImporter onDone={load} />
        </Card>
      )}


      {loading ? (
        <Card className="p-10 flex justify-center">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </Card>
      ) : books.length === 0 ? (
        <EmptyState
          title="Ще немає підручників"
          description="Додайте Kursbuch або Arbeitsbuch, завантажте сторінки PDF — і AI розпізнає вправи для домашніх завдань."
          cta={{ label: "Додати підручник", onClick: () => setCreating(true) }}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {books.map((b) => (
            <Card key={b.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-slate-900 font-semibold">
                    <BookMarked className="w-4 h-4 text-indigo-600" />
                    <span className="truncate">{b.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {BOOK_KIND_LABEL[b.kind] ?? b.kind}
                    {b.level ? ` · ${b.level}` : ""}
                    {b.publisher ? ` · ${b.publisher}` : ""}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm(`Видалити «${b.title}» разом зі сторінками?`)) return;
                    try {
                      await deleteBook(b.id);
                      toast.success("Видалено");
                      load();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Помилка");
                    }
                  }}
                  className="text-slate-300 hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <button
                onClick={() => setOpenBook(b)}
                className="mt-4 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Відкрити
              </button>
            </Card>
          ))}
        </div>
      )}

      {creating && (
        <CreateBookModal
          onClose={() => setCreating(false)}
          onCreated={(b) => {
            setCreating(false);
            load();
            setOpenBook(b);
          }}
        />
      )}
    </div>
  );
}

/* ───────── create book ───────── */

function CreateBookModal({ onClose, onCreated }: { onClose: () => void; onCreated: (b: Book) => void }) {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<BookKind>("kursbuch");
  const [level, setLevel] = useState("A1");
  const [publisher, setPublisher] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!title.trim()) return toast.error("Вкажіть назву");
    setSaving(true);
    try {
      const b = await createBook({
        title: title.trim(),
        kind,
        level,
        publisher: publisher.trim() || null,
        language: "de",
      });
      toast.success("Підручник створено");
      onCreated(b);
    } catch (e: any) {
      toast.error(e?.message ?? "Помилка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Новий підручник" onClose={onClose}>
      <div className="space-y-4">
        <Field label="Назва *">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Menschen A1.1 Kursbuch"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Тип">
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as BookKind)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            >
              {(Object.keys(BOOK_KIND_LABEL) as BookKind[]).map((k) => (
                <option key={k} value={k}>{BOOK_KIND_LABEL[k]}</option>
              ))}
            </select>
          </Field>
          <Field label="Рівень">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
            >
              {["A1", "A2", "B1", "B2", "C1"].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Видавництво">
          <input
            value={publisher}
            onChange={(e) => setPublisher(e.target.value)}
            placeholder="Hueber"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </Field>
        <button
          onClick={submit}
          disabled={saving}
          className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Створення…" : "Створити"}
        </button>
      </div>
    </Modal>
  );
}

/* ───────── book detail ───────── */

function BookDetail({ book, onBack }: { book: Book; onBack: () => void }) {
  const [pages, setPages] = useState<BookPage[]>([]);
  const [lektionen, setLektionen] = useState<BookLektion[]>([]);
  const [tasks, setTasks] = useState<BookTask[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [recognising, setRecognising] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [bulk, setBulk] = useState<{ total: number; done: number; failed: number } | null>(null);
  const [planToIssue, setPlanToIssue] = useState<BookLessonPlan | null>(null);
  const planTasks = useMemo(() => {
    if (!planToIssue) return null;
    const ids = new Set<string>([
      ...planToIssue.stages.flatMap((s) => s.task_ids),
      ...planToIssue.homework.task_ids,
    ]);
    return tasks.filter((t) => ids.has(t.id));
  }, [planToIssue, tasks]);
  const bulkStop = useRef(false);

  const load = async () => {
    try {
      const [p, l, t] = await Promise.all([
        listPages(book.id),
        listLektionen(book.id),
        listTasks(book.id),
      ]);
      setPages(p);
      setLektionen(l);
      setTasks(t);
      setUrls(await signedPageUrls(p.map((x) => x.image_path)));
      setActivePage((cur) => cur ?? p[0]?.id ?? null);
    } catch (e: any) {
      toast.error(e?.message ?? "Помилка завантаження");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]);

  const nextPageNumber = useMemo(
    () => (pages.length ? Math.max(...pages.map((p) => p.page_number)) + 1 : 1),
    [pages],
  );

  const isTheory = (t: BookTask) => t.kind === "theory" || t.content?.format === "theory";

  const page = pages.find((p) => p.id === activePage) ?? null;
  const pageAll = tasks.filter((t) => t.page_id === activePage);
  const pageTheory = pageAll.filter(isTheory);
  const pageTasks = pageAll.filter((t) => !isTheory(t));
  const selectedTasks = tasks.filter((t) => selected.includes(t.id));

  const stats = useMemo(() => {
    const m = new Map<string, { theory: number; tasks: number }>();
    for (const t of tasks) {
      const cur = m.get(t.page_id) ?? { theory: 0, tasks: 0 };
      if (isTheory(t)) cur.theory += 1;
      else cur.tasks += 1;
      m.set(t.page_id, cur);
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks]);

  const totalTheory = tasks.filter(isTheory).length;
  const totalTasks = tasks.length - totalTheory;

  const runRecognise = async (pageId: string) => {
    setRecognising(pageId);
    try {
      const res: any = await recognisePage(pageId);
      const t = Number(res?.tasks ?? 0);
      const th = Number(res?.theory ?? 0);
      if (t || th) {
        toast.success(`Розпізнано: вправ ${t}, теорії ${th}`);
      } else {
        toast.info("На сторінці не знайдено ні вправ, ні теорії");
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "AI не змогла обробити сторінку");
    } finally {
      setRecognising(null);
    }
  };

  /** Recognise every page in the background, one by one. */
  const runRecogniseAll = async (onlyNew: boolean) => {
    const queue = pages.filter((p) => (onlyNew ? !stats.get(p.id) : true));
    if (queue.length === 0) {
      toast.info("Немає сторінок для обробки");
      return;
    }
    bulkStop.current = false;
    setBulk({ total: queue.length, done: 0, failed: 0 });
    let done = 0;
    let failed = 0;
    for (const p of queue) {
      if (bulkStop.current) break;
      try {
        await recognisePage(p.id);
      } catch {
        failed += 1;
      }
      done += 1;
      setBulk({ total: queue.length, done, failed });
      // refresh the list every few pages so progress is visible
      if (done % 3 === 0) {
        try {
          setTasks(await listTasks(book.id));
        } catch {
          /* ignore */
        }
      }
    }
    try {
      setTasks(await listTasks(book.id));
    } catch {
      /* ignore */
    }
    setBulk(null);
    if (bulkStop.current) toast.info(`Зупинено. Оброблено ${done} з ${queue.length}`);
    else if (failed) toast.warning(`Готово: ${done - failed} сторінок, помилок ${failed}`);
    else toast.success(`Готово: оброблено ${done} сторінок`);
  };


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
          <ChevronLeft className="w-4 h-4" /> Усі підручники
        </button>
        {selected.length > 0 && (
          <button
            onClick={() => setAssigning(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium"
          >
            <Send className="w-4 h-4" /> Видати як домашку ({selected.length})
          </button>
        )}
      </div>

      <SectionHeader
        title={book.title}
        subtitle={`${BOOK_KIND_LABEL[book.kind] ?? book.kind}${book.level ? ` · ${book.level}` : ""} · сторінок: ${pages.length} · вправ: ${totalTasks} · теорії: ${totalTheory}`}
      />

      {pages.length > 0 && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-auto min-w-[200px]">
              <p className="text-sm font-semibold text-slate-900">Розпізнати всю книгу</p>
              <p className="text-xs text-slate-500">
                {bulk
                  ? `Обробка у фоні: ${bulk.done} / ${bulk.total}${bulk.failed ? ` · помилок ${bulk.failed}` : ""}`
                  : "AI пройде сторінки одну за одною і витягне теорію та вправи."}
              </p>
            </div>
            {bulk ? (
              <button
                onClick={() => { bulkStop.current = true; }}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium"
              >
                <X className="w-4 h-4" /> Зупинити
              </button>
            ) : (
              <>
                <button
                  onClick={() => runRecogniseAll(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium"
                >
                  <Sparkles className="w-4 h-4" /> Розпізнати всі нові
                </button>
                <button
                  onClick={() => {
                    if (confirm("Пройти AI по ВСІХ сторінках заново?")) runRecogniseAll(false);
                  }}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm"
                >
                  Заново всі
                </button>
              </>
            )}
          </div>
          {bulk && (
            <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all"
                style={{ width: `${Math.round((bulk.done / Math.max(1, bulk.total)) * 100)}%` }}
              />
            </div>
          )}
        </Card>
      )}

      <Card className="p-4">
        <PdfUploader bookId={book.id} startPage={nextPageNumber} onDone={load} />
      </Card>

      <BookAudioPanel bookId={book.id} lektionen={lektionen} />

      <BookAiLibrarian book={book} lektionen={lektionen} pages={pages} urls={urls} taskCount={tasks.length} />

      <BookLessonPlanPanel
        book={book}
        lektionen={lektionen}
        onIssue={(plan) => {
          setPlanToIssue(plan);
          setAssigning(true);
        }}
      />





      <LektionenEditor
        bookId={book.id}
        lektionen={lektionen}
        onChanged={load}
      />

      {loading ? (
        <Card className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></Card>
      ) : pages.length === 0 ? (
        <EmptyState title="Немає сторінок" description="Завантажте PDF підручника або фото окремих сторінок." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          {/* page list */}
          <Card className="p-2 max-h-[70vh] overflow-y-auto">
            {pages.map((p) => {
              const st = stats.get(p.id);
              const on = p.id === activePage;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePage(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between gap-2 ${on ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700"}`}
                >
                  <span>Стор. {p.page_number}</span>
                  {st ? (
                    <span className="flex items-center gap-1 text-[11px] shrink-0">
                      {st.theory > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700">
                          {st.theory} теорія
                        </span>
                      )}
                      {st.tasks > 0 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700">
                          {st.tasks} вправ
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </button>
              );
            })}

          </Card>

          {/* page detail */}
          <div className="space-y-4">
            {page && (
              <Card className="p-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-slate-900">Сторінка {page.page_number}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => runRecognise(page.id)}
                      disabled={recognising === page.id}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium disabled:opacity-60"
                    >
                      {recognising === page.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
Розпізнати вправи та теорію
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Видалити сторінку?")) return;
                        try {
                          await deletePage(page);
                          setActivePage(null);
                          await load();
                        } catch (e: any) {
                          toast.error(e?.message ?? "Помилка");
                        }
                      }}
                      className="text-slate-300 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {urls[page.image_path] ? (
                  <img
                    src={urls[page.image_path]}
                    alt={`Сторінка ${page.page_number}`}
                    loading="lazy"
                    className="w-full rounded-xl border border-slate-200"
                  />
                ) : (
                  <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
                )}
              </Card>
            )}

            {pageTheory.length > 0 && (
              <Card className="p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Теорія на сторінці · {pageTheory.length}
                </h3>
                <div className="space-y-3">
                  {pageTheory.map((t) => {
                    const on = selected.includes(t.id);
                    return (
                      <div key={t.id} className="flex items-start gap-3">
                        <button
                          onClick={() => setSelected((v) => (on ? v.filter((x) => x !== t.id) : [...v, t.id]))}
                          className={`mt-1 w-5 h-5 shrink-0 rounded-md flex items-center justify-center border ${on ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 text-transparent"}`}
                          title="Додати теорію до домашки"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <BookTheoryBlock title={t.title} content={t.content} tone="admin" />
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await deleteTask(t.id);
                              setSelected((v) => v.filter((x) => x !== t.id));
                              await load();
                            } catch (e: any) {
                              toast.error(e?.message ?? "Помилка");
                            }
                          }}
                          className="text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            <Card className="p-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Вправи на сторінці</h3>
              {pageTasks.length === 0 ? (
                <p className="text-xs text-slate-500">Ще не розпізнано. Натисніть «Розпізнати вправи та теорію» — AI витягне і теорію, і вправи.</p>
              ) : (
                <div className="space-y-2">
                  {pageTasks.map((t) => {
                    const on = selected.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        className={`rounded-xl border p-3 ${on ? "border-indigo-300 bg-indigo-50/50" : "border-slate-200"}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => setSelected((v) => (on ? v.filter((x) => x !== t.id) : [...v, t.id]))}
                            className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border ${on ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 text-transparent"}`}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-slate-900">
                              {t.code ? `№${t.code} · ` : ""}{t.title || "Вправа"}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {KIND_LABEL[t.kind ?? ""] ?? t.kind ?? "—"}
                              {t.content?.format ? ` · ${t.content.format}` : ""}
                              {t.content?.items?.length ? ` · пунктів: ${t.content.items.length}` : ""}
                            </div>
                            {t.instructions && (
                              <p className="text-xs text-slate-600 mt-1.5 whitespace-pre-wrap">{t.instructions}</p>
                            )}
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                await deleteTask(t.id);
                                setSelected((v) => v.filter((x) => x !== t.id));
                                await load();
                              } catch (e: any) {
                                toast.error(e?.message ?? "Помилка");
                              }
                            }}
                            className="text-slate-300 hover:text-rose-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {assigning && (
        <AssignBookHomeworkModal
          book={book}
          tasks={planTasks ?? selectedTasks}
          pages={pages}
          plan={planToIssue}
          onClose={() => { setAssigning(false); setPlanToIssue(null); }}
          onDone={() => {
            setAssigning(false);
            setPlanToIssue(null);
            setSelected([]);
          }}
        />
      )}

    </div>
  );
}

/* ───────── AI librarian: book → materials bank / course ───────── */

function BookAiLibrarian({
  book, lektionen, pages, urls, taskCount,
}: {
  book: Book;
  lektionen: BookLektion[];
  pages: BookPage[];
  urls: Record<string, string>;
  taskCount: number;
}) {
  const [lektionId, setLektionId] = useState<string>("");
  const [variants, setVariants] = useState(4);
  const [busy, setBusy] = useState<"bank" | "course" | null>(null);
  const [result, setResult] = useState<Awaited<ReturnType<typeof bookToBank>> | null>(null);

  const scopePages = useMemo(
    () => (lektionId ? pages.filter((p) => p.lektion_id === lektionId) : pages),
    [pages, lektionId],
  );

  const runBank = async () => {
    setBusy("bank");
    setResult(null);
    try {
      const res = await bookToBank({ bookId: book.id, lektionId: lektionId || null, variants });
      setResult(res);
      toast.success(`Банк оновлено: папок ${res.folders.length}, матеріалів ${res.imported}, згенеровано ${res.generated}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Не вдалося опрацювати книгу");
    } finally {
      setBusy(null);
    }
  };

  const runCourse = async () => {
    const imgs = scopePages.map((p) => urls[p.image_path]).filter(Boolean).slice(0, 12);
    if (!imgs.length) {
      toast.error("Немає сторінок для курсу");
      return;
    }
    setBusy("course");
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-from-book", {
        body: {
          images: imgs,
          paths: [],
          level: book.level || "A1",
          lessonCount: Math.min(6, Math.max(1, Math.ceil(imgs.length / 2))),
          hint: `Матеріал із підручника «${book.title}»${lektionId ? ` (${lektionen.find((l) => l.id === lektionId)?.title || "Lektion"})` : ""}. Збережи структуру й лексику книги.`,
        },
      });
      if (error) throw new Error((data as any)?.error || error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Курс створено: ${(data as any).courseTitle || "новий курс"} · уроків ${(data as any).lessonsCreated}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Не вдалося створити курс");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" /> ІІ-бібліотекар
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ІІ вивчає, що є в книзі (теорія + вправи), сам створює потрібні папки в банку матеріалів,
            переносить туди зміст книги та генерує схожі завдання. Звідси ж можна зібрати курс.
          </p>
        </div>
        <span className="text-xs text-slate-400">розпізнано: {taskCount}</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <Field label="Обсяг">
          <select
            value={lektionId}
            onChange={(e) => setLektionId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          >
            <option value="">Уся книга</option>
            {lektionen.map((l) => (
              <option key={l.id} value={l.id}>
                Lektion {l.number}{l.title ? ` · ${l.title}` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Схожих завдань на папку">
          <input
            type="number"
            min={0}
            max={10}
            value={variants}
            onChange={(e) => setVariants(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
            className="w-24 px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </Field>
        <button
          onClick={runBank}
          disabled={busy !== null || taskCount === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {busy === "bank" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Розкласти в банк матеріалів
        </button>
        <button
          onClick={runCourse}
          disabled={busy !== null || scopePages.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-medium disabled:opacity-50"
        >
          {busy === "course" ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookMarked className="w-4 h-4" />}
          Створити курс із книги
        </button>
      </div>

      {taskCount === 0 && (
        <p className="text-xs text-amber-600">
          Спершу розпізнайте сторінки — ІІ-бібліотекар працює з розпізнаною теорією та вправами.
        </p>
      )}

      {result && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2">
          {result.summary && <p className="text-xs text-slate-600 whitespace-pre-line">{result.summary}</p>}
          <div className="flex flex-wrap gap-2">
            {result.folders.map((f) => (
              <span key={f.folder_id} className="text-xs px-2.5 py-1 rounded-lg bg-white border border-slate-200">
                📁 {f.name} · {f.imported} з книги{f.generated ? ` · +${f.generated} ІІ` : ""}
              </span>
            ))}
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent("admin-v2:navigate", { detail: { key: "materials" } }))}
            className="text-xs text-indigo-600 font-medium"
          >
            Відкрити банк матеріалів →
          </button>
        </div>
      )}
    </Card>
  );
}

/* ───────── audio (Hören) ───────── */


function BookAudioPanel({ bookId, lektionen }: { bookId: string; lektionen: BookLektion[] }) {
  const [tracks, setTracks] = useState<BookAudio[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const list = await listAudio(bookId);
      setTracks(list);
      const map: Record<string, string> = {};
      await Promise.all(
        list.map(async (t) => {
          const u = await signedAudioUrl(t.file_path);
          if (u) map[t.file_path] = u;
        }),
      );
      setUrls(map);
    } catch (e: any) {
      toast.error(e?.message ?? "Не вдалося завантажити аудіо");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const handleFiles = async (files: File[]) => {
    setBusy(true);
    try {
      for (const f of files) {
        const path = await uploadAudioFile(bookId, f.name, f, f.type);
        const num = f.name.match(/(\d{1,3})/);
        await insertAudio({
          book_id: bookId,
          title: f.name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " "),
          file_path: path,
          track_no: num ? Number(num[1]) : null,
        });
      }
      toast.success(`Додано аудіо: ${files.length}`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Помилка завантаження аудіо");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Music className="w-4 h-4 text-emerald-600" /> Аудіо (Hören) · {tracks.length}
        </h3>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const f = Array.from(e.target.files ?? []);
            if (f.length) handleFiles(f);
          }}
        />
        <button
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Додати аудіофайли
        </button>
      </div>

      {tracks.length === 0 ? (
        <p className="text-xs text-slate-500">
          Аудіо ще немає. Завантажте файли або імпортуйте ZIP-архів із книгами та аудіо.
        </p>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {tracks.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 w-8 shrink-0">
                  {t.track_no ?? "—"}
                </span>
                <input
                  defaultValue={t.title}
                  onBlur={async (e) => {
                    const v = e.target.value.trim();
                    if (v && v !== t.title) {
                      await updateAudio(t.id, { title: v });
                      toast.success("Назву оновлено");
                    }
                  }}
                  className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-slate-200 text-sm"
                />
                <select
                  value={t.lektion_id ?? ""}
                  onChange={async (e) => {
                    await updateAudio(t.id, { lektion_id: e.target.value || null });
                    await load();
                  }}
                  className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs max-w-[150px]"
                >
                  <option value="">Без Lektion</option>
                  {lektionen.map((l) => (
                    <option key={l.id} value={l.id}>
                      Lektion {l.number}{l.title ? ` · ${l.title}` : ""}
                    </option>
                  ))}
                </select>
                <button
                  onClick={async () => {
                    if (!confirm(`Видалити «${t.title}»?`)) return;
                    try {
                      await deleteAudio(t);
                      await load();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Помилка");
                    }
                  }}
                  className="text-slate-300 hover:text-rose-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {urls[t.file_path] && (
                <audio src={urls[t.file_path]} controls preload="none" className="w-full h-8" />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ───────── lektionen ───────── */


function LektionenEditor({
  bookId, lektionen, onChanged,
}: { bookId: string; lektionen: BookLektion[]; onChanged: () => void }) {
  const [number, setNumber] = useState("");
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);

  const runAi = async () => {
    if (lektionen.length && !confirm("ІІ перестворить розділи книги. Поточні Lektionen буде замінено. Продовжити?")) return;
    setAiBusy(true);
    setAiSummary(null);
    try {
      const res = await detectLektionen(bookId, true);
      setAiSummary(res.summary);
      toast.success(
        `ІІ створила розділів: ${res.lektionen.length}${res.audio_linked ? ` · аудіо привʼязано: ${res.audio_linked}` : ""}`,
      );
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "ІІ не змогла визначити розділи");
    } finally {
      setAiBusy(false);
    }
  };

  const add = async () => {
    const n = Number(number);
    if (!n) return toast.error("Вкажіть номер Lektion");
    setSaving(true);
    try {
      await upsertLektion({
        book_id: bookId,
        number: n,
        title: title.trim() || null,
        page_from: from ? Number(from) : null,
        page_to: to ? Number(to) : null,
      });
      const fresh = await listLektionen(bookId);
      const created = fresh.find((l) => l.number === n);
      if (created) await linkPagesToLektion(created);
      setNumber(""); setTitle(""); setFrom(""); setTo("");
      toast.success("Lektion збережено");
      onChanged();
    } catch (e: any) {
      toast.error(e?.message ?? "Помилка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="text-sm font-semibold text-slate-900">Lektionen (розділи книги)</h3>
        <button
          onClick={runAi}
          disabled={aiBusy}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-medium disabled:opacity-60"
        >
          {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          ІІ створює Lektionen
        </button>
      </div>
      <p className="text-xs text-slate-500 -mt-2 mb-3">
        ІІ сама читає книгу, визначає розділи з межами сторінок, привʼязує сторінки й розкладає аудіо по Lektionen.
      </p>
      {aiSummary && (
        <p className="text-xs text-slate-600 mb-3 rounded-xl bg-slate-50 border border-slate-200 p-2.5">{aiSummary}</p>
      )}

      {lektionen.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {lektionen.map((l) => (
            <span key={l.id} className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-100 text-xs text-slate-700">
              L{l.number} {l.title ? `· ${l.title}` : ""} {l.page_from ? `(с. ${l.page_from}–${l.page_to ?? "?"})` : ""}
              <button
                onClick={async () => {
                  await supabase.from("book_lektionen").delete().eq("id", l.id);
                  onChanged();
                }}
                className="text-slate-400 hover:text-rose-500"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-5">
        <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="№" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Назва" className="px-3 py-2 rounded-xl border border-slate-200 text-sm sm:col-span-2" />
        <input value={from} onChange={(e) => setFrom(e.target.value)} placeholder="стор. від" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="стор. до" className="px-3 py-2 rounded-xl border border-slate-200 text-sm" />
      </div>
      <button
        onClick={add}
        disabled={saving}
        className="mt-3 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 disabled:opacity-60"
      >
        {saving ? "Збереження…" : "Додати Lektion"}
      </button>
    </Card>
  );
}

/* ───────── assign homework ───────── */

function AssignBookHomeworkModal({
  book, tasks, pages, plan, onClose, onDone,
}: {
  book: Book;
  tasks: BookTask[];
  pages: BookPage[];
  plan?: BookLessonPlan | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [title, setTitle] = useState(
    plan?.title ??
      `${book.title} — с. ${[...new Set(tasks.map((t) => pages.find((p) => p.id === t.page_id)?.page_number).filter(Boolean))].join(", ")}`,
  );
  const [instructions, setInstructions] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [audio, setAudio] = useState<BookAudio[]>([]);
  const [audioIds, setAudioIds] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("get_admin_users");
      setStudents(
        ((data as any[]) ?? []).map((u) => ({
          user_id: u.user_id,
          display_name: u.display_name,
          email: u.email,
        })),
      );
      try {
        const tracks = await listAudio(book.id);
        setAudio(tracks);
        if (plan) {
          const planAudio = new Set([
            ...plan.stages.flatMap((s) => s.audio_ids),
            ...plan.homework.audio_ids,
          ]);
          setAudioIds(tracks.filter((t) => planAudio.has(t.id)).map((t) => t.id));
        } else {
          // auto-select audio that belongs to the Lektionen of the selected pages
          const lektionIds = new Set(
            tasks
              .map((t) => pages.find((p) => p.id === t.page_id)?.lektion_id)
              .filter(Boolean) as string[],
          );
          setAudioIds(tracks.filter((t) => t.lektion_id && lektionIds.has(t.lektion_id)).map((t) => t.id));
        }
      } catch { /* ignore */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async () => {
    if (ids.length === 0) return toast.error("Оберіть учнів");
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const payload = {
        category: plan ? "book_plan" : "book",
        plan: plan ?? undefined,
        book: { id: book.id, title: book.title, kind: book.kind, level: book.level },
        audio: audio
          .filter((a) => audioIds.includes(a.id))
          .map((a) => ({ id: a.id, title: a.title, track_no: a.track_no, file_path: a.file_path })),

        tasks: tasks.map((t) => {
          const p = pages.find((x) => x.id === t.page_id);
          return {
            id: t.id,
            code: t.code,
            kind: t.kind,
            title: t.title,
            instructions: t.instructions,
            format: t.content?.format ?? "open",
            theory:
              t.content?.format === "theory" || t.kind === "theory"
                ? {
                    summary: t.content?.summary ?? t.instructions ?? null,
                    rules: t.content?.rules ?? [],
                    examples: t.content?.examples ?? [],
                    phrases: t.content?.phrases ?? [],
                    table: t.content?.table ?? null,
                  }
                : null,
            items: (t.content?.items ?? []).map((it) => ({
              prompt: it.prompt ?? "",
              options: it.options ?? undefined,
              correct_index: it.correct_index ?? null,
              answer: it.answer ?? null,
            })),
            page_number: p?.page_number ?? null,
            image_path: p?.image_path ?? null,
          };
        }),
      };
      const rows = ids.map((sid) => ({
        teacher_id: auth?.user?.id,
        student_id: sid,
        type: "book",
        title: title.trim() || book.title,
        instructions: instructions.trim() || null,
        level: book.level,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        payload,
      }));
      const { error } = await supabase.from("student_assignments").insert(rows as any);
      if (error) throw error;
      toast.success(`Видано домашок: ${rows.length}`);
      onDone();
    } catch (e: any) {
      toast.error(e?.message ?? "Помилка");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={plan ? "Видати план уроку" : "Домашка з підручника"} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500">
          {plan
            ? <>Етапів: <b className="text-slate-900">{plan.stages.length}</b> · блоків: <b className="text-slate-900">{tasks.length}</b> · домашка: <b className="text-slate-900">{plan.homework.task_ids.length}</b></>
            : <>Вибрано блоків: <b className="text-slate-900">{tasks.length}</b> (вправи + теорія)</>}
        </p>
        <Field label="Назва">
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        </Field>
        <Field label="Коментар для учня">
          <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        </Field>
        <Field label="Дедлайн">
          <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
        </Field>
        {audio.length > 0 && (
          <Field label="Аудіо (Hören) до завдання">
            <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
              {audio.map((a) => {
                const on = audioIds.includes(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => setAudioIds((v) => (on ? v.filter((x) => x !== a.id) : [...v, a.id]))}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left ${on ? "bg-emerald-50" : "hover:bg-slate-50"}`}
                  >
                    <span className="truncate">
                      <span className="text-slate-400 text-xs mr-2">{a.track_no ?? "—"}</span>
                      {a.title}
                    </span>
                    {on && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Треки з Lektion вибраних сторінок позначені автоматично.
            </p>
          </Field>
        )}

        <Field label="Учні *">
          <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {students.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">Немає учнів.</p>
            ) : (
              students.map((s) => {
                const on = ids.includes(s.user_id);
                return (
                  <button
                    key={s.user_id}
                    onClick={() => setIds((v) => (on ? v.filter((i) => i !== s.user_id) : [...v, s.user_id]))}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left ${on ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  >
                    <span className="truncate">
                      <b className="text-slate-900">{s.display_name || "Без імені"}</b>{" "}
                      <span className="text-slate-400 text-xs">{s.email}</span>
                    </span>
                    {on && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </Field>
        <button
          onClick={submit}
          disabled={saving}
          className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Видача…" : "Видати домашку"}
        </button>
      </div>
    </Modal>
  );
}

/* ───────── small ui ───────── */

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg my-8 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
