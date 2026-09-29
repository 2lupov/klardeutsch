import { useEffect, useState } from "react";
import { BookOpen, Dices, FolderDown, Loader2, NotebookPen, Send, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { countWords, paragraphsToHtml, plain } from "@/lib/rich-text";
import { createFolder, createItem, fetchFolders, type MaterialFolder } from "@/lib/materials";
import MarkSheet from "@/components/live/MarkSheet";
import { useLiveReading, type ReadingTopic } from "@/components/live/useLiveReading";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const SIZES = [50, 100, 150, 200, 300];

/**
 * «Читання» у живому уроці: спільний текст, який обоє можуть підкреслювати й виділяти,
 * та спільні нотатки збоку. Викладач генерує текст за рівнем і кількістю слів.
 */
export default function LiveReading({
  classId,
  role,
  studentId,
  teacherId,
  className,
}: {
  classId: string;
  role: "teacher" | "student";
  studentId?: string;
  teacherId?: string;
  className?: string;
}) {
  const { text, notes, topic, remote, push, pushTopic, onRemote } = useLiveReading(classId);
  const [level, setLevel] = useState("A2");
  const [words, setWords] = useState(120);
  const [theme, setTheme] = useState("");
  const [busy, setBusy] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [hwOpen, setHwOpen] = useState(false);

  const generate = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-reading-text", {
        body: { level, words, theme, avoid: topic?.title_de ?? "" },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      const t = (data as any).topic as ReadingTopic;
      pushTopic(t, paragraphsToHtml(t.text_de || ""));
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося створити текст");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("grid min-h-0 gap-3 grid-cols-1 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,300px)]", className)}>
      {/* Параметри й розбір */}
      <aside className="min-h-0 space-y-3 overflow-y-auto rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-primary">
          <BookOpen className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Текст для читання</span>
          {topic?.level && <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold">{topic.level}</span>}
        </div>

        {role === "teacher" && (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-1">
              {LEVELS.map((l) => (
                <Button key={l} animated={false} size="sm" variant={l === level ? "default" : "outline"} className="h-8 px-0" onClick={() => setLevel(l)}>{l}</Button>
              ))}
            </div>
            <div className="grid grid-cols-5 gap-1">
              {SIZES.map((w) => (
                <Button key={w} animated={false} size="sm" variant={w === words ? "default" : "outline"} className="h-8 px-0 text-xs" onClick={() => setWords(w)}>{w}</Button>
              ))}
            </div>
            <Input value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Тема (необов'язково)" className="h-8 text-sm" />
            <Button animated={false} className="w-full" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : topic ? <Dices /> : <Sparkles />}
              {busy ? "Створюємо…" : topic ? "Інший текст" : "Створити текст"}
            </Button>
          </div>
        )}

        {topic ? (
          <div className="space-y-3 text-sm">
            {topic.title_de && <h3 className="font-display text-lg font-bold leading-tight text-foreground">{topic.title_de}</h3>}
            {topic.summary_uk && <p className="text-muted-foreground">{topic.summary_uk}</p>}
            {!!topic.grammar_focus?.length && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Граматичні зв'язки</p>
                <ul className="space-y-1">
                  {topic.grammar_focus.map((g, i) => (
                    <li key={i} className="rounded-xl bg-muted/50 p-2 text-foreground">{g}</li>
                  ))}
                </ul>
              </div>
            )}
            {!!topic.vocab?.length && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Слова</p>
                <div className="space-y-1">
                  {topic.vocab.map((v, i) => (
                    <p key={i} className="text-foreground">
                      {v.article && <span className="mr-1 text-primary">{v.article}</span>}
                      <b>{v.term}</b> <span className="text-muted-foreground">— {v.translation}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
            {!!topic.questions?.length && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Питання</p>
                <ul className="list-disc space-y-1 pl-5 text-foreground">
                  {topic.questions.map((q, i) => <li key={i}>{q}</li>)}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {role === "teacher" ? "Оберіть рівень і кількість слів — і створіть текст." : "Викладач зараз підготує текст."}
          </p>
        )}
      </aside>

      {/* Спільний текст */}
      <MarkSheet
        className="min-h-[280px]"
        value={text}
        onChange={(html) => push("text", html)}
        register={(set) => onRemote("text", set)}
        highlightOnly
        placeholder="Тут з'явиться текст для читання…"
        toolbarExtra={
          <>
            <span className="text-xs text-muted-foreground">{countWords(text)} слів</span>
            {remote === "text" && <span className="text-xs text-primary">{role === "teacher" ? "учень працює…" : "викладач працює…"}</span>}
          </>
        }
      />

      {/* Спільні нотатки */}
      <div className="flex min-h-0 flex-col gap-2">
        <div className="flex items-center gap-2 px-1 text-primary">
          <NotebookPen className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Нотатки</span>
          {remote === "notes" && <span className="ml-auto text-xs">пишуть…</span>}
        </div>
        <MarkSheet
          className="min-h-[200px] flex-1"
          sheetClassName="text-base leading-8"
          value={notes}
          onChange={(html) => push("notes", html)}
          register={(set) => onRemote("notes", set)}
          placeholder="Правила, переклади, приклади…"
        />
        {role === "teacher" && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button animated={false} size="sm" variant="outline" className="flex-1" onClick={() => setSaveOpen(true)} disabled={!plain(text) && !plain(notes)}>
              <FolderDown /> У папку
            </Button>
            <Button animated={false} size="sm" className="flex-1" onClick={() => setHwOpen(true)} disabled={!plain(text)}>
              <Send /> Як ДЗ
            </Button>
          </div>
        )}
      </div>

      {role === "teacher" && (
        <>
          <SaveReadingDialog open={saveOpen} onOpenChange={setSaveOpen} textHtml={text} notesHtml={notes} topic={topic} studentId={studentId} teacherId={teacherId} />
          <AssignReadingDialog open={hwOpen} onOpenChange={setHwOpen} textHtml={text} topic={topic} studentId={studentId} teacherId={teacherId} />
        </>
      )}
    </div>
  );
}

/** Зберігає текст і нотатки в папку матеріалів, а нотатки — ще й у папки учня. */
function SaveReadingDialog({
  open, onOpenChange, textHtml, notesHtml, topic, studentId, teacherId,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; textHtml: string; notesHtml: string;
  topic: ReadingTopic | null; studentId?: string; teacherId?: string;
}) {
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const date = new Date().toLocaleDateString("uk-UA");
  const title = `Читання · ${date}${topic?.title_de ? ` · ${topic.title_de}` : ""}`;

  useEffect(() => { if (open) fetchFolders().then(setFolders).catch(() => setFolders([])); }, [open]);


  const save = async (folderId?: string) => {
    setBusy(folderId ?? "new");
    try {
      const { data: u } = await supabase.auth.getUser();
      const ownerId = teacherId || u.user!.id;
      let id = folderId;
      if (!id) {
        const existing = folders.find((f) => f.name === "Читання");
        id = existing?.id ?? (await createFolder({ ownerId, name: "Читання", category: "reading", level: topic?.level ?? null, description: "Тексти з живих уроків" })).id;
      }
      await createItem({
        folderId: id, ownerId, kind: "text", title, level: topic?.level ?? null, tags: ["читання", date],
        content: { body: plain(textHtml), html: textHtml, notes_html: notesHtml, topic, date: new Date().toISOString() },
      });
      if (studentId) {
        await (supabase as any).from("student_notes").insert({
          student_id: studentId, teacher_id: ownerId, folder: "Читання",
          title, body: `${textHtml}${plain(notesHtml) ? `<hr><p><b>Нотатки</b></p>${notesHtml}` : ""}`,
          level: topic?.level ?? null, source: { kind: "live_reading", topic: topic?.title_de ?? null },
        });
      }
      toast.success(`Збережено: ${title}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося зберегти");
    } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Зберегти читання в папку</DialogTitle>
        <p className="text-sm text-muted-foreground">Назва: <b className="text-foreground">{title}</b></p>
        <p className="text-xs text-muted-foreground">Копія з'явиться і в папках учня.</p>
        <Button animated={false} onClick={() => save()} disabled={!!busy}>
          {busy === "new" ? <Loader2 className="animate-spin" /> : <FolderDown />} У папку «Читання»
        </Button>
        {folders.filter((f) => f.name !== "Читання").length > 0 && (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Або в іншу папку</p>
            {folders.filter((f) => f.name !== "Читання").map((f) => (
              <Button key={f.id} animated={false} variant="outline" className="w-full justify-start" onClick={() => save(f.id)} disabled={!!busy}>
                {busy === f.id && <Loader2 className="animate-spin" />} {f.name}{f.level ? ` · ${f.level}` : ""}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Задає цей текст учневі як домашнє завдання. */
function AssignReadingDialog({
  open, onOpenChange, textHtml, topic, studentId, teacherId,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; textHtml: string;
  topic: ReadingTopic | null; studentId?: string; teacherId?: string;
}) {
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const assign = async () => {
    if (!studentId) { toast.error("Немає учня"); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from("student_assignments").insert({
        teacher_id: teacherId || u.user!.id,
        student_id: studentId,
        type: "reading",
        title: topic?.title_de || "Текст для читання",
        instructions: topic?.summary_uk || "Прочитай текст, познач незнайомі слова й запиши нотатки.",
        level: topic?.level ?? null,
        due_at: due ? new Date(due).toISOString() : null,
        status: "assigned",
        payload: { topic: { ...(topic ?? {}), html: textHtml } },
      });
      if (error) throw error;
      toast.success("Задано як домашнє завдання");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося задати");
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Задати читання як домашку</DialogTitle>
        <p className="text-sm text-muted-foreground">{topic?.title_de || "Текст для читання"}</p>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Термін (необов'язково)</span>
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </label>
        <Button animated={false} onClick={assign} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <Send />} Задати учню
        </Button>
      </DialogContent>
    </Dialog>
  );
}
