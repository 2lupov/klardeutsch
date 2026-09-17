import { useEffect, useState } from "react";
import { Check, Loader2, Send, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { downloadLibraryBook, type LibraryBook } from "@/lib/book-library";
import {
  assignKitToStudent,
  createKitFromPdf,
  listAssignableStudents,
  type AssignableStudent,
} from "@/lib/kit-from-book";
import type { LessonKit } from "@/lib/lesson-kits";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import { kitBlocksToLessonBlocks } from "@/lib/lesson-kits";
import { Btn } from "./_ui";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

/** Вибрав сторінки книги — ШІ зробив інтерактивний урок, одразу можна дати учню. */
export default function BookLessonDialog({
  book,
  ownerId,
  autoAssign,
  onClose,
  onCreated,
}: {
  book: LibraryBook;
  ownerId: string;
  /** Одразу після генерації показати список учнів. */
  autoAssign?: boolean;
  onClose: () => void;
  onCreated?: (kit: LessonKit) => void;
}) {
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(2);
  const [level, setLevel] = useState(book.level ?? "A2");
  const [focus, setFocus] = useState<"kursbuch" | "arbeitsbuch">(
    book.kind === "arbeitsbuch" || book.kind === "grammatik" ? "arbeitsbuch" : "kursbuch",
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [kit, setKit] = useState<LessonKit | null>(null);
  const [students, setStudents] = useState<AssignableStudent[] | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);

  const showStudents = async () => {
    setStudents((s) => s ?? []);
    setStudents(await listAssignableStudents());
  };

  useEffect(() => {
    if (kit && autoAssign) showStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kit]);

  const generate = async () => {
    if (!ownerId) return;
    setBusy(true);
    try {
      const file = await downloadLibraryBook(book);
      const made = await createKitFromPdf({
        ownerId,
        file,
        title: `${book.title} · стор. ${from}${to > from ? `–${to}` : ""}`,
        level,
        focus,
        from,
        to,
        notes,
        onProgress: setProgress,
      });
      setKit(made);
      onCreated?.(made);
      toast({ title: "Урок готовий", description: `Блоків: ${made.blocks.length}` });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      toast({
        title: "Не вдалося зробити урок",
        description: msg.includes("402")
          ? "Закінчились AI-кредити"
          : msg.includes("429")
            ? "Забагато запитів, спробуйте за хвилину"
            : msg,
        variant: "destructive",
      });
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const assign = async (studentId: string) => {
    if (!kit) return;
    setAssigning(true);
    try {
      await assignKitToStudent(ownerId, kit, studentId);
      setAssignedTo((s) => [...s, studentId]);
      toast({ title: "Домашку призначено 🐼" });
    } catch (e: any) {
      toast({ title: "Не вдалося призначити", description: String(e?.message ?? ""), variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-admin-border bg-admin-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-admin-fg">{book.title}</h3>
        <p className="mt-0.5 text-xs text-admin-muted">
          {book.total_pages ? `${book.total_pages} стор. у книзі · ` : ""}виберіть сторінки — ШІ зробить інтерактивний урок
        </p>

        {!kit && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-admin-muted">Сторінка з</label>
                <input
                  type="number"
                  min={1}
                  value={from}
                  onChange={(e) => setFrom(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-lg border border-admin-border bg-admin-card px-2 py-1.5 text-sm text-admin-fg"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-admin-muted">до</label>
                <input
                  type="number"
                  min={1}
                  value={to}
                  onChange={(e) => setTo(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-lg border border-admin-border bg-admin-card px-2 py-1.5 text-sm text-admin-fg"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-admin-muted">Рівень</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  className="w-full rounded-lg border border-admin-border bg-admin-card px-2 py-1.5 text-sm text-admin-fg"
                >
                  {LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-bold uppercase text-admin-muted">Фокус</label>
                <select
                  value={focus}
                  onChange={(e) => setFocus(e.target.value as any)}
                  className="w-full rounded-lg border border-admin-border bg-admin-card px-2 py-1.5 text-sm text-admin-fg"
                >
                  <option value="kursbuch">Читання й аудіо</option>
                  <option value="arbeitsbuch">Граматика</option>
                </select>
              </div>
            </div>

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Що саме потрібно (напр. Genitiv, Wechselpräpositionen)"
              className="mt-3 w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
            />
            <p className="mt-1 text-[11px] text-admin-muted">За раз до 8 сторінок.</p>

            <div className="mt-4 flex flex-wrap gap-2">
              <Btn onClick={generate} disabled={busy}>
                <span className="inline-flex items-center gap-1.5">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {busy ? "Роблю урок…" : "Створити урок"}
                </span>
              </Btn>
              <Btn variant="ghost" onClick={onClose} disabled={busy}>
                Закрити
              </Btn>
            </div>
            {busy && progress && <p className="mt-2 text-xs text-admin-muted">{progress}</p>}
          </>
        )}

        {kit && (
          <>
            <div className="mt-4 rounded-xl border border-admin-border p-3 text-sm text-admin-fg">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Check className="h-4 w-4 text-admin-accent" /> {kit.title}
              </span>
              <p className="mt-1 text-xs text-admin-muted">
                {kit.blocks.length} інтерактивних блоків · {kit.level ?? "—"} · лишається в бібліотеці уроків
              </p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Btn onClick={showStudents} disabled={assigning}>
                <span className="inline-flex items-center gap-1.5">
                  <Send className="h-4 w-4" /> Дати як домашку
                </span>
              </Btn>
              <Btn variant="ghost" onClick={() => setPreview((p) => !p)}>
                {preview ? "Сховати урок" : "Подивитись урок"}
              </Btn>
              <Btn variant="ghost" onClick={onClose}>
                Готово
              </Btn>
            </div>

            {students && (
              <div className="mt-3 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-admin-border p-2">
                {students.length === 0 && <p className="px-2 py-1 text-sm text-admin-muted">Завантаження…</p>}
                {students.map((s) => (
                  <button
                    key={s.id}
                    disabled={assigning || assignedTo.includes(s.id)}
                    onClick={() => assign(s.id)}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-admin-fg hover:bg-admin-fg/5 disabled:opacity-50"
                  >
                    {s.name}
                    {assignedTo.includes(s.id) && <Check className="h-4 w-4 text-admin-accent" />}
                  </button>
                ))}
              </div>
            )}

            {preview && (
              <div className="mt-3 rounded-xl border border-admin-border p-2">
                <StudentBlocks blocks={kitBlocksToLessonBlocks(kit.blocks, kit.id)} persist={false} showActions={false} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
