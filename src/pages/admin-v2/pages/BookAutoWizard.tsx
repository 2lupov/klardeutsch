import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Check, FileUp, Loader2, Sparkles, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import LibraryBookPicker from "@/components/blocks/LibraryBookPicker";
import { Btn, Card } from "./_ui";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface Topic {
  title: string;
  from: number;
  to: number;
  focus: string;
  plan: string[];
  note: string;
}

interface Outline {
  book_title: string;
  kind: string;
  level: string;
  summary: string;
  questions: Array<{ id: string; question: string; options: string[] }>;
  topics: Topic[];
}

type Phase = "upload" | "reading" | "plan" | "building" | "done";

/** Кинув підручник — ШІ сам розібрався, запитав і зробив уроки по темах. */
export default function BookAutoWizard({
  ownerId,
  books,
  onDone,
  onCancel,
}: {
  ownerId: string;
  books: Array<{ id: string; title: string }>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [progress, setProgress] = useState("");
  const [outline, setOutline] = useState<Outline | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [bookId, setBookId] = useState("");
  const [built, setBuilt] = useState<Array<{ title: string; blocks: number; error?: string }>>([]);

  const analyze = async (f: File, prevAnswers?: Record<string, string>) => {
    setPhase("reading");
    try {
      const doc = await (pdfjsLib as any).getDocument({ data: await f.arrayBuffer() }).promise;
      const total = Math.min(doc.numPages, 200);

      setProgress("Читаємо сторінки підручника…");
      let pages: Array<{ n: number; text: string }> = [];
      for (let n = 1; n <= total; n++) {
        const page = await doc.getPage(n);
        const content = await page.getTextContent();
        const text = content.items.map((it: any) => it.str).join(" ").trim();
        if (text.length > 40) pages.push({ n, text });
        if (n % 20 === 0) setProgress(`Читаємо сторінки… ${n}/${total}`);
      }

      // Скан без текстового шару — ШІ переглядає сторінки очима.
      if (pages.length < Math.max(3, total * 0.2)) {
        pages = [];
        const batch = 6;
        for (let start = 1; start <= total; start += batch) {
          const end = Math.min(start + batch - 1, total);
          setProgress(`ШІ переглядає сторінки… ${end}/${total}`);
          const shots: Array<{ n: number; image: string }> = [];
          for (let n = start; n <= end; n++) shots.push({ n, image: await thumbnail(doc, n) });
          const { data, error } = await supabase.functions.invoke("scan-book-pages", { body: { pages: shots } });
          if (error) throw error;
          if ((data as any)?.error) throw new Error((data as any).error);
          for (const p of (data as any).pages ?? []) {
            const text = [p.heading, p.summary, (p.kinds ?? []).join(", ")].filter(Boolean).join(" · ");
            if (text.trim().length > 5) pages.push({ n: Number(p.n) || start, text });
          }
        }
      }

      if (pages.length === 0) throw new Error("Не вдалося прочитати сторінки цього файлу");

      setProgress("ШІ визначає теми і рівень…");
      const { data, error } = await supabase.functions.invoke("analyze-book-outline", {
        body: { pages, notes: notes.slice(0, 1000), answers: prevAnswers ?? null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const o = data as Outline;
      setOutline(o);
      setPicked(new Set(o.topics.map((_, i) => i)));
      setPhase("plan");
    } catch (e: any) {
      toast({ title: "Не вдалося прочитати підручник", description: String(e?.message ?? ""), variant: "destructive" });
      setPhase("upload");
    } finally {
      setProgress("");
    }
  };

  /** Маленький знімок сторінки для перегляду ШІ. */
  const thumbnail = async (doc: any, n: number): Promise<string> => {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: Math.min(1.4, 900 / base.width) });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const url = canvas.toDataURL("image/jpeg", 0.6);
    canvas.width = 0;
    canvas.height = 0;
    return url;
  };

  const renderPages = async (doc: any, from: number, to: number, kitId: string) => {
    const paths: string[] = [];
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
      const path = `kits/${kitId}/page-${n}.jpg`;
      const { error } = await supabase.storage.from("tutoring-materials").upload(path, blob, { upsert: true });
      if (error) throw error;
      paths.push(path);
      canvas.width = 0;
      canvas.height = 0;
    }
    return paths;
  };

  const build = async () => {
    if (!file || !outline || !ownerId) return;
    const topics = outline.topics.filter((_, i) => picked.has(i));
    if (topics.length === 0) return;
    setPhase("building");
    setBuilt([]);
    const doc = await (pdfjsLib as any).getDocument({ data: await file.arrayBuffer() }).promise;
    const wishes = [
      notes.trim(),
      ...Object.entries(answers).map(([k, v]) => {
        const q = outline.questions.find((x) => x.id === k);
        return q ? `${q.question} → ${v}` : "";
      }),
    ].filter(Boolean);

    for (const [i, t] of topics.entries()) {
      setProgress(`Тема ${i + 1} з ${topics.length}: ${t.title}`);
      try {
        const { data: kit, error: kitError } = await supabase
          .from("lesson_kits")
          .insert({
            owner_id: ownerId,
            title: t.title,
            level: outline.level,
            focus: t.focus,
            book_id: bookId || null,
            source: "pdf",
            notes: t.note || null,
          })
          .select("id")
          .single();
        if (kitError) throw kitError;
        const kitId = (kit as any).id as string;

        const paths = await renderPages(doc, t.from, t.to, kitId);
        const instructions = [
          `Тема уроку: ${t.title}.`,
          t.note ? `Зміст: ${t.note}.` : "",
          t.plan.length ? `Бажані блоки: ${t.plan.join(", ")}.` : "",
          ...wishes,
        ]
          .filter(Boolean)
          .join(" ")
          .slice(0, 1500);

        const { data, error } = await supabase.functions.invoke("book-to-lesson-kit", {
          body: { kit_id: kitId, image_paths: paths, level: outline.level, focus: t.focus, instructions },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setBuilt((s) => [...s, { title: t.title, blocks: (data as any)?.blocks ?? 0 }]);
      } catch (e: any) {
        setBuilt((s) => [...s, { title: t.title, blocks: 0, error: String(e?.message ?? "помилка") }]);
      }
    }
    setProgress("");
    setPhase("done");
  };

  /* ---------- вигляд ---------- */

  if (phase === "upload" || phase === "reading") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold text-admin-fg">Кинути підручник — ШІ розбереться сам</h2>
            <p className="mt-1 text-sm text-admin-muted">
              Завантажте PDF цілком. ШІ прочитає його, визначить рівень і теми, поставить кілька питань — ви лише
              підтверджуєте, а далі він сам зробить інтерактивні уроки по темах.
            </p>
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-admin-border p-5 hover:bg-admin-fg/5">
            <FileUp className="h-5 w-5 text-admin-muted" />
            <span className="text-sm text-admin-fg">{file ? file.name : "Вибрати PDF підручника"}</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={phase === "reading"}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                setFile(f);
                analyze(f);
              }}
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <LibraryBookPicker
              disabled={phase === "reading"}
              label="Взяти з бібліотеки"
              onPick={(f) => {
                setFile(f);
                analyze(f);
              }}
            />
            <span className="text-xs text-admin-muted">книги, які ви вже закинули в бібліотеку</span>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-admin-muted">Побажання (необовʼязково)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Наприклад: тільки граматика, більше вправ на пропуски"
              className="mt-1 w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
            />
          </label>

          {phase === "reading" && (
            <div className="flex items-center gap-3 text-sm text-admin-fg">
              <Loader2 className="h-4 w-4 animate-spin" /> {progress || "Працюємо…"}
            </div>
          )}

          <div className="flex justify-between">
            <Btn variant="ghost" onClick={onCancel}>
              Скасувати
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "plan" && outline) {
    const needAnswers = outline.questions.filter((q) => !answers[q.id]);
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card className="p-5 space-y-3">
          <div className="flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-admin-accent" />
            <div>
              <h2 className="text-base font-semibold text-admin-fg">{outline.book_title || "Підручник"}</h2>
              <p className="text-sm text-admin-muted">
                {outline.summary || "Готовий план уроків"} · рівень {outline.level}
              </p>
            </div>
          </div>
        </Card>

        {outline.questions.length > 0 && (
          <Card className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-admin-fg">Кілька питань — підтвердіть, як робити</h3>
            {outline.questions.map((q) => (
              <div key={q.id}>
                <p className="text-sm text-admin-fg">{q.question}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.options.map((o) => (
                    <button
                      key={o}
                      onClick={() => setAnswers((s) => ({ ...s, [q.id]: o }))}
                      className={`rounded-full border px-3 py-1.5 text-xs ${
                        answers[q.id] === o
                          ? "border-admin-primary bg-admin-primary text-admin-primary-fg"
                          : "border-admin-border text-admin-fg hover:bg-admin-fg/5"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <Btn
              variant="ghost"
              disabled={needAnswers.length > 0 || !file}
              onClick={() => file && analyze(file, answers)}
            >
              Перебудувати план з моїми відповідями
            </Btn>
          </Card>
        )}

        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-admin-fg">Теми ({picked.size} з {outline.topics.length})</h3>
            <button
              className="text-xs text-admin-muted hover:text-admin-fg"
              onClick={() =>
                setPicked((s) => (s.size === outline.topics.length ? new Set() : new Set(outline.topics.map((_, i) => i))))
              }
            >
              {picked.size === outline.topics.length ? "Зняти всі" : "Вибрати всі"}
            </button>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-admin-muted">Прив'язати до книги (необовʼязково)</span>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
            >
              <option value="">Без книги</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>

          <div className="max-h-[45vh] space-y-2 overflow-y-auto">
            {outline.topics.map((t, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3 ${picked.has(i) ? "border-admin-primary/40 bg-admin-primary/5" : "border-admin-border"}`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={picked.has(i)}
                    onChange={(e) =>
                      setPicked((s) => {
                        const next = new Set(s);
                        e.target.checked ? next.add(i) : next.delete(i);
                        return next;
                      })
                    }
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      value={t.title}
                      onChange={(e) =>
                        setOutline((o) =>
                          o ? { ...o, topics: o.topics.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) } : o,
                        )
                      }
                      className="w-full bg-transparent text-sm font-medium text-admin-fg outline-none"
                    />
                    <p className="mt-0.5 text-xs text-admin-muted">
                      стор. {t.from}–{t.to} · {t.focus === "arbeitsbuch" ? "Arbeitsbuch" : "Kursbuch"}
                      {t.plan.length ? ` · ${t.plan.join(", ")}` : ""}
                    </p>
                    {t.note && <p className="mt-1 text-xs text-admin-muted">{t.note}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between">
            <Btn variant="ghost" onClick={onCancel}>
              Скасувати
            </Btn>
            <Btn onClick={build} disabled={picked.size === 0}>
              <span className="inline-flex items-center gap-1.5">
                <Wand2 className="h-4 w-4" /> Апрувити — зробити {picked.size} уроків
              </span>
            </Btn>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card className="p-5 space-y-3">
        {phase === "building" && (
          <div className="flex items-center gap-3 text-sm text-admin-fg">
            <Loader2 className="h-4 w-4 animate-spin" /> {progress || "Робимо уроки…"}
          </div>
        )}
        {phase === "done" && <h3 className="text-sm font-semibold text-admin-fg">Готово 🐼</h3>}

        <div className="space-y-1.5">
          {built.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              {b.error ? (
                <span className="text-admin-danger">✕</span>
              ) : (
                <Check className="h-4 w-4 text-admin-accent" />
              )}
              <span className="text-admin-fg">{b.title}</span>
              <span className="text-xs text-admin-muted">{b.error ? b.error : `${b.blocks} блоків`}</span>
            </div>
          ))}
        </div>

        {phase === "done" && (
          <div className="flex justify-end">
            <Btn onClick={onDone}>До списку уроків</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}
