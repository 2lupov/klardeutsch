import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Check, FileUp, Image as ImageIcon, Loader2, Music, Send, Trash2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import { kitBlocksToLessonBlocks, normalizeKit, type LessonKit } from "@/lib/lesson-kits";
import { Btn, Card, EmptyState, SectionHeader } from "./_ui";
import BookAutoWizard from "./BookAutoWizard";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

type Step = 0 | 1 | 2 | 3;
const STEP_LABELS = ["Книга", "Матеріал", "Аудіо", "Урок"];

interface Book {
  id: string;
  title: string;
  kind: string | null;
  level: string | null;
}

export default function LessonGeneratorPage() {
  const { user } = useAuth();
  const [kits, setKits] = useState<LessonKit[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [wizard, setWizard] = useState(false);
  const [autoWizard, setAutoWizard] = useState(false);
  const [openKit, setOpenKit] = useState<LessonKit | null>(null);

  const load = async () => {
    const [k, b] = await Promise.all([
      supabase.from("lesson_kits").select("*").order("created_at", { ascending: false }),
      supabase.from("books").select("id, title, kind, level").order("title"),
    ]);
    setKits(((k.data ?? []) as any[]).map(normalizeKit));
    setBooks((b.data ?? []) as Book[]);
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("lesson_kits").delete().eq("id", id);
    if (error) return toast({ title: "Не вдалося видалити", description: error.message, variant: "destructive" });
    setKits((s) => s.filter((x) => x.id !== id));
    if (openKit?.id === id) setOpenKit(null);
  };

  if (autoWizard) {
    return (
      <BookAutoWizard
        ownerId={user?.id ?? ""}
        books={books}
        onDone={async () => {
          setAutoWizard(false);
          await load();
        }}
        onCancel={() => setAutoWizard(false)}
      />
    );
  }

  if (wizard) {
    return (
      <Wizard
        books={books}
        ownerId={user?.id ?? ""}
        onDone={async () => {
          setWizard(false);
          await load();
        }}
        onCancel={() => setWizard(false)}
      />
    );
  }

  if (openKit) {
    return (
      <div className="space-y-4">
        <SectionHeader
          title={openKit.title}
          subtitle={`${openKit.blocks.length} блоків · ${openKit.level ?? "—"}`}
          action={
            <div className="flex gap-2">
              <AssignButton kit={openKit} />
              <Btn variant="ghost" onClick={() => setOpenKit(null)}>
                Назад
              </Btn>
            </div>
          }
        />
        <div className="rounded-2xl border border-admin-border bg-admin-card p-3">
          <StudentBlocks blocks={kitBlocksToLessonBlocks(openKit.blocks, openKit.id)} persist={false} showActions={false} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Генератор уроку з книги"
        subtitle="Кинули підручник — ШІ сам розбив на теми. Або крок за кроком: сторінки → аудіо → урок"
        action={
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => setAutoWizard(true)}>
              <span className="inline-flex items-center gap-1.5">
                <Wand2 className="w-4 h-4" /> Підручник цілком (ШІ)
              </span>
            </Btn>
            <Btn variant="ghost" onClick={() => setWizard(true)}>
              Один урок
            </Btn>
          </div>
        }
      />

      {kits.length === 0 ? (
        <EmptyState
          title="Ще немає готових уроків"
          description="Киньте PDF підручника — ШІ прочитає його, визначить теми, поставить кілька питань і зробить інтерактивні уроки. Їх можна відкрити на живому уроці або дати як домашку."
          cta={{ label: "Підручник цілком (ШІ)", onClick: () => setAutoWizard(true) }}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {kits.map((k) => (
            <Card key={k.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-admin-fg truncate">{k.title}</h3>
                  <p className="text-xs text-admin-muted mt-0.5">
                    {k.level ?? "—"} · {k.focus === "arbeitsbuch" ? "Arbeitsbuch" : "Kursbuch"} · {k.blocks.length} блоків
                  </p>
                </div>
                <button
                  onClick={() => remove(k.id)}
                  className="text-admin-muted hover:text-admin-danger shrink-0"
                  title="Видалити"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn variant="ghost" onClick={() => setOpenKit(k)}>
                  Відкрити
                </Btn>
                <AssignButton kit={k} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Домашка ---------------- */

function AssignButton({ kit }: { kit: LessonKit }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<Array<{ id: string; name: string }>>([]);
  const [busy, setBusy] = useState(false);

  const openPicker = async () => {
    setOpen(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, nickname")
      .order("display_name")
      .limit(200);
    setStudents(
      ((data ?? []) as any[]).map((p) => ({
        id: p.user_id,
        name: p.display_name || p.nickname || "Учень",
      })),
    );
  };

  const assign = async (studentId: string) => {
    if (!user || kit.blocks.length === 0) return;
    setBusy(true);
    const { error } = await supabase.from("student_assignments").insert({
      teacher_id: user.id,
      student_id: studentId,
      type: "blocks",
      title: kit.title,
      instructions: "Виконай усі блоки та натисни «Здати».",
      level: kit.level,
      payload: { kit_id: kit.id, blocks: kit.blocks } as any,
      status: "assigned",
    });
    setBusy(false);
    setOpen(false);
    if (error) return toast({ title: "Не вдалося призначити", description: error.message, variant: "destructive" });
    toast({ title: "Домашку призначено 🐼" });
  };

  return (
    <>
      <Btn variant="ghost" onClick={openPicker}>
        <span className="inline-flex items-center gap-1.5">
          <Send className="w-4 h-4" /> Як домашку
        </span>
      </Btn>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-sm max-h-[70vh] overflow-y-auto rounded-2xl bg-admin-card border border-admin-border p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-admin-fg mb-3">Кому дати домашку?</h3>
            {students.length === 0 && <p className="text-sm text-admin-muted">Завантаження…</p>}
            <div className="space-y-1">
              {students.map((s) => (
                <button
                  key={s.id}
                  disabled={busy}
                  onClick={() => assign(s.id)}
                  className="w-full text-left px-3 py-2 rounded-xl text-sm text-admin-fg hover:bg-admin-fg/5 disabled:opacity-50"
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- Візард ---------------- */

function Wizard({
  books,
  ownerId,
  onDone,
  onCancel,
}: {
  books: Book[];
  ownerId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [step, setStep] = useState<Step>(0);
  const [bookId, setBookId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("A2");
  const [focus, setFocus] = useState<"kursbuch" | "arbeitsbuch">("kursbuch");
  const [notes, setNotes] = useState("");

  const [pdf, setPdf] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState(0);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(2);
  const [photos, setPhotos] = useState<File[]>([]);
  const [audio, setAudio] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<LessonKit | null>(null);
  const kitIdRef = useRef<string | null>(null);

  const pickPdf = async (f: File) => {
    if (f.type !== "application/pdf") return toast({ title: "Потрібен PDF-файл", variant: "destructive" });
    setPdf(f);
    setPhotos([]);
    try {
      const doc = await (pdfjsLib as any).getDocument({ data: await f.arrayBuffer() }).promise;
      setPdfPages(doc.numPages);
      setFrom(1);
      setTo(Math.min(2, doc.numPages));
    } catch {
      toast({ title: "Не вдалося прочитати PDF", variant: "destructive" });
    }
  };

  const uploadPages = async (kitId: string): Promise<string[]> => {
    const paths: string[] = [];
    if (photos.length > 0) {
      for (const [i, f] of photos.slice(0, 8).entries()) {
        const ext = f.name.split(".").pop() || "jpg";
        const path = `kits/${kitId}/photo-${Date.now()}-${i}.${ext}`;
        const { error } = await supabase.storage.from("tutoring-materials").upload(path, f, { upsert: true });
        if (error) throw error;
        paths.push(path);
      }
      return paths;
    }
    if (!pdf) return paths;
    const doc = await (pdfjsLib as any).getDocument({ data: await pdf.arrayBuffer() }).promise;
    for (let n = from; n <= Math.min(to, doc.numPages); n++) {
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
      const path = `kits/${kitId}/page-${Date.now()}-${n}.jpg`;
      const { error } = await supabase.storage.from("tutoring-materials").upload(path, blob, { upsert: true });
      if (error) throw error;
      paths.push(path);
      canvas.width = 0;
      canvas.height = 0;
    }
    return paths;
  };

  const generate = async () => {
    if (!ownerId) return;
    setBusy(true);
    setStep(3);
    try {
      setProgress("Створюємо урок…");
      let kitId = kitIdRef.current;
      if (!kitId) {
        const book = books.find((b) => b.id === bookId);
        const { data, error } = await supabase
          .from("lesson_kits")
          .insert({
            owner_id: ownerId,
            title: title.trim() || book?.title || "Урок з книги",
            level,
            focus,
            book_id: bookId || null,
            source: photos.length > 0 ? "photos" : "pdf",
            notes: notes.trim() || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        kitId = (data as any).id;
        kitIdRef.current = kitId;
      }

      setProgress("Завантажуємо сторінки…");
      const paths = await uploadPages(kitId!);
      if (paths.length === 0) throw new Error("Додайте PDF або фото сторінок");

      let audioPath: string | null = null;
      if (audio) {
        setProgress("Завантажуємо аудіо…");
        const ext = audio.name.split(".").pop() || "mp3";
        audioPath = `kits/${kitId}/audio-${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("tutoring-materials").upload(audioPath, audio, { upsert: true });
        if (error) throw error;
      }

      setProgress("ШІ читає текст, слова, пропуски й аудіо…");
      const { data, error } = await supabase.functions.invoke("book-to-lesson-kit", {
        body: { kit_id: kitId, image_paths: paths, level, focus, instructions: notes.slice(0, 1500), audio_path: audioPath },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const { data: fresh } = await supabase.from("lesson_kits").select("*").eq("id", kitId).single();
      setResult(normalizeKit(fresh));
      toast({ title: "Урок готовий", description: `Блоків: ${(data as any)?.blocks ?? 0}` });
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      toast({
        title: "Не вдалося створити урок",
        description: msg.includes("402")
          ? "Закінчились AI-кредити робочого простору."
          : msg.includes("429")
            ? "Забагато запитів до ШІ, спробуйте за хвилину."
            : msg || "Спробуйте ще раз",
        variant: "destructive",
      });
      setStep(2);
    } finally {
      setBusy(false);
      setProgress("");
    }
  };

  const hasMaterial = photos.length > 0 || !!pdf;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                i < step
                  ? "bg-admin-accent text-admin-accent-fg"
                  : i === step
                    ? "bg-admin-primary text-admin-primary-fg"
                    : "bg-admin-fg/10 text-admin-muted"
              }`}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={`text-xs ${i === step ? "text-admin-fg font-medium" : "text-admin-muted"}`}>{label}</span>
            {i < STEP_LABELS.length - 1 && <span className="w-6 h-px bg-admin-border" />}
          </div>
        ))}
      </div>

      {step === 0 && (
        <Card className="p-5 space-y-4">
          <Field label="Книга">
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
            >
              <option value="">Без книги</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Назва уроку">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Lektion 3 — Wohnen"
              className="w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Рівень">
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
              >
                {LEVELS.map((l) => (
                  <option key={l}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Тип">
              <select
                value={focus}
                onChange={(e) => setFocus(e.target.value as any)}
                className="w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
              >
                <option value="kursbuch">Kursbuch — читання/аудіо</option>
                <option value="arbeitsbuch">Arbeitsbuch — граматика</option>
              </select>
            </Field>
          </div>
          <div className="flex justify-between">
            <Btn variant="ghost" onClick={onCancel}>
              Скасувати
            </Btn>
            <Btn onClick={() => setStep(1)}>Далі</Btn>
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="p-5 space-y-4">
          <p className="text-sm text-admin-muted">Додайте PDF книги або просто фото сторінок.</p>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-admin-border p-4 hover:bg-admin-fg/5">
            <FileUp className="w-5 h-5 text-admin-muted" />
            <span className="text-sm text-admin-fg">{pdf ? pdf.name : "Вибрати PDF-файл"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && pickPdf(e.target.files[0])}
            />
          </label>

          {pdf && pdfPages > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Від сторінки (усього ${pdfPages})`}>
                <input
                  type="number"
                  min={1}
                  max={pdfPages}
                  value={from}
                  onChange={(e) => setFrom(Number(e.target.value))}
                  className="w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
                />
              </Field>
              <Field label="До сторінки">
                <input
                  type="number"
                  min={1}
                  max={pdfPages}
                  value={to}
                  onChange={(e) => setTo(Number(e.target.value))}
                  className="w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
                />
              </Field>
            </div>
          )}

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-admin-border p-4 hover:bg-admin-fg/5">
            <ImageIcon className="w-5 h-5 text-admin-muted" />
            <span className="text-sm text-admin-fg">
              {photos.length > 0 ? `Фото: ${photos.length}` : "Або вибрати фото сторінок (до 8)"}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []).slice(0, 8);
                if (list.length) {
                  setPhotos(list);
                  setPdf(null);
                  setPdfPages(0);
                }
              }}
            />
          </label>

          <Field label="Що саме потрібно (необовʼязково)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Наприклад: Genitiv, більше вправ на пропуски"
              className="w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
            />
          </Field>

          <div className="flex justify-between">
            <Btn variant="ghost" onClick={() => setStep(0)}>
              Назад
            </Btn>
            <Btn onClick={() => setStep(2)} disabled={!hasMaterial}>
              Далі
            </Btn>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-5 space-y-4">
          <p className="text-sm text-admin-muted">Якщо аудіо немає — просто пропустіть цей крок.</p>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-admin-border p-4 hover:bg-admin-fg/5">
            <Music className="w-5 h-5 text-admin-muted" />
            <span className="text-sm text-admin-fg">{audio ? audio.name : "Додати аудіофайл (mp3)"}</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
            />
          </label>
          <div className="flex justify-between">
            <Btn variant="ghost" onClick={() => setStep(1)}>
              Назад
            </Btn>
            <div className="flex gap-2">
              {!audio && (
                <Btn variant="ghost" onClick={generate}>
                  Пропустити
                </Btn>
              )}
              <Btn onClick={generate}>
                <span className="inline-flex items-center gap-1.5">
                  <Wand2 className="w-4 h-4" /> Створити урок
                </span>
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card className="p-5 space-y-4">
          {busy && (
            <div className="flex items-center gap-3 text-sm text-admin-fg">
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress || "Працюємо…"}
            </div>
          )}

          {result && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-admin-fg">{result.title}</h3>
                  <p className="text-xs text-admin-muted">{result.blocks.length} блоків готово</p>
                </div>
                <div className="flex gap-2">
                  <AssignButton kit={result} />
                  <Btn onClick={onDone}>Готово</Btn>
                </div>
              </div>
              <div className="rounded-2xl border border-admin-border p-3">
                <StudentBlocks blocks={kitBlocksToLessonBlocks(result.blocks, result.id)} persist={false} showActions={false} />
              </div>
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-admin-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
