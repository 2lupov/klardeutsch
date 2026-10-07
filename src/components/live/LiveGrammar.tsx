import { useEffect, useState } from "react";
import { Dices, Eye, EyeOff, FolderDown, GraduationCap, Loader2, NotebookPen, Send, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { paragraphsToHtml, plain } from "@/lib/rich-text";
import { createFolder, createItem, fetchFolders, type MaterialFolder } from "@/lib/materials";
import { getLessonTopic, setLessonTopic } from "@/lib/live-class";
import MarkSheet from "@/components/live/MarkSheet";
import { useLiveGrammar, type GrammarLesson } from "@/components/live/useLiveGrammar";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const COUNTS = [5, 10, 20, 30, 50];

const lessonHtml = (l: GrammarLesson) =>
  `${l.reading?.title_de ? `<p><b>${l.reading.title_de}</b></p>` : ""}${paragraphsToHtml(l.reading?.text_de || "")}`;

/**
 * «Граматика» у живому уроці: викладач обирає тему, рівень і кількість прикладів —
 * ШІ створює правила, приклади, практику й текст для читання. Усе спільне для обох.
 */
export default function LiveGrammar({
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
  const { lesson, marks, notes, revealed, remote, push, pushLesson, toggleReveal, onRemote } = useLiveGrammar(classId);
  const [level, setLevel] = useState("A2");
  const [count, setCount] = useState(6);
  const [topic, setTopic] = useState(() => getLessonTopic(classId));
  const [busy, setBusy] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const [hwOpen, setHwOpen] = useState(false);

  const generate = async () => {
    if (!topic.trim()) { toast.error("Напишіть тему, напр. «Perfekt» або «Dativ»"); return; }
    setBusy(true);
    setLessonTopic(classId, topic);
    try {
      const { data, error } = await supabase.functions.invoke("generate-grammar-lesson", {
        body: { level, topic: topic.trim(), examples: count, student_id: studentId, reading_words: level === "A1" ? 70 : 110 },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      const l = (data as any).lesson as GrammarLesson;
      pushLesson(l, lessonHtml(l));
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося створити урок");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cn("grid min-h-0 gap-3 grid-cols-1 xl:grid-cols-[minmax(0,300px)_minmax(0,1fr)_minmax(0,320px)]", className)}>
      {/* Правила й приклади */}
      <aside className="min-h-0 space-y-4 overflow-y-auto rounded-2xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2 text-foreground">
          <span className="grid size-8 place-items-center rounded-xl bg-accent text-accent-foreground"><GraduationCap className="h-4 w-4" /></span>
          <span className="text-xs font-bold uppercase">Граматика</span>
          {lesson?.level && <span className="ml-auto rounded-md bg-accent px-2 py-0.5 text-xs font-black text-accent-foreground">{lesson.level}</span>}
        </div>

        {role === "teacher" && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground">Рівень</p>
            <div className="grid grid-cols-5 gap-1">
              {LEVELS.map((l) => (
                <Button key={l} animated={false} size="sm" variant={l === level ? "default" : "outline"} className="h-8 px-0" onClick={() => setLevel(l)}>{l}</Button>
              ))}
            </div>
            <p className="pt-1 text-[10px] font-bold uppercase text-muted-foreground">Приклади і вправи (до 50)</p>
            <div className="grid grid-cols-5 gap-1">
              {COUNTS.map((c) => (
                <Button key={c} animated={false} size="sm" variant={c === count ? "default" : "outline"} className="h-8 px-0 text-xs" onClick={() => setCount(c)}>{c}</Button>
              ))}
            </div>
            <Input type="number" min={3} max={50} value={count} onChange={(e) => setCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))} className="h-8 text-sm" aria-label="Кількість вправ" />
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Тема: Perfekt, Dativ, Nebensatz…" className="h-8 text-sm" />
            <Button animated={false} className="w-full bg-foreground text-background hover:bg-foreground/90" onClick={generate} disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : lesson ? <Dices /> : <Sparkles />}
              {busy ? "Готуємо урок…" : lesson ? "Ще один урок" : "Створити урок"}
            </Button>
          </div>
        )}

        {lesson ? (
          <div className="space-y-3 text-sm">
            {lesson.title && <h3 className="font-display text-lg font-bold leading-tight text-foreground">{lesson.title}</h3>}
            {lesson.summary_uk && <p className="text-muted-foreground">{lesson.summary_uk}</p>}

            {!!lesson.rules?.length && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Правила</p>
                {lesson.rules.map((r, i) => (
                  <div key={i} className="space-y-1 rounded-xl border-l-4 border-accent bg-muted/40 p-3">
                    {r.title && <p className="font-bold text-foreground">{r.title}</p>}
                    {r.explanation_uk && <p className="text-muted-foreground">{r.explanation_uk}</p>}
                    {!!r.table?.length && (
                      <div className="mt-1 space-y-0.5 font-mono text-xs text-foreground">
                        {r.table.map((row, j) => <p key={j}>{row}</p>)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!!lesson.mistakes?.length && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Типові помилки</p>
                <ul className="list-disc space-y-1 pl-5 text-foreground">
                  {lesson.mistakes.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            )}

            {!!lesson.vocab?.length && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Слова</p>
                  {role === "teacher" && studentId && (
                    <Button animated={false} size="sm" variant="outline" className="h-7 text-xs" onClick={async () => {
                      const rows = (lesson.vocab ?? []).filter((v) => v.term).map((v) => ({ user_id: studentId, german: v.term, russian: v.translation || "", article: v.article || null }));
                      const { data: ex } = await supabase.from("custom_words").select("german").eq("user_id", studentId);
                      const have = new Set((ex || []).map((r: any) => r.german));
                      const fresh = rows.filter((r) => !have.has(r.german));
                      if (!fresh.length) { toast.success("Усі слова вже у словнику учня"); return; }
                      const { error } = await supabase.from("custom_words").insert(fresh);
                      error ? toast.error("Не вдалося додати слова") : toast.success(`Додано учню: ${fresh.length}`);
                    }}>+ У словник учня</Button>
                  )}
                </div>
                {lesson.vocab.map((v, i) => (
                  <p key={i} className="text-foreground">
                    {v.article && <span className={cn("mr-1 font-semibold", v.article === "der" ? "text-sky-500" : v.article === "die" ? "text-pink-500" : v.article === "das" ? "text-emerald-500" : "text-primary")}>{v.article}</span>}
                    <b>{v.term}</b> <span className="text-muted-foreground">— {v.translation}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {role === "teacher" ? "Оберіть тему, рівень і кількість прикладів." : "Викладач зараз підготує урок граматики."}
          </p>
        )}
      </aside>

      {/* Приклади + спільний текст із позначками */}
      <div className="flex min-h-0 flex-col gap-3">
        {!!lesson?.examples?.length && (
          <div className="max-h-[38%] shrink-0 space-y-1.5 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Приклади і вправи (до 50)</p>
            {lesson.examples.map((ex, i) => (
              <div key={i} className="grid grid-cols-[2rem_1fr] gap-2 border-b border-border px-1 py-3 text-sm last:border-0">
                <span className="grid size-7 place-items-center rounded-full bg-accent/20 text-[11px] font-bold text-foreground">{i + 1}</span>
                <div>
                <p className="text-foreground">{highlightFocus(ex.de || "", ex.focus)}</p>
                {ex.uk && <p className="text-xs text-muted-foreground">{ex.uk}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
        <MarkSheet
          className="min-h-[220px] flex-1 rounded-2xl shadow-sm"
          value={marks}
          onChange={(html) => push("marks", html)}
          register={(set) => onRemote("marks", set)}
          placeholder="Тут з'явиться текст із цією граматикою…"
          toolbarExtra={remote === "marks" ? <span className="text-xs text-primary">{role === "teacher" ? "учень працює…" : "викладач працює…"}</span> : null}
        />
        {!!lesson?.reading?.questions?.length && (
          <ul className="shrink-0 list-disc space-y-0.5 rounded-2xl border border-border bg-card p-3 pl-7 text-sm text-foreground">
            {lesson.reading.questions.map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        )}
      </div>

      {/* Практика + нотатки */}
      <div className="flex min-h-0 flex-col gap-3">
        {!!lesson?.practice?.length && (
          <div className="max-h-[45%] shrink-0 space-y-2 overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Практика</p>
            {lesson.practice.map((t, i) => (
              <div key={i} className="space-y-2 border-b border-border py-3 text-sm last:border-0">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}.</span>
                  <p className="flex-1 font-medium text-foreground">{t.prompt}</p>
                  <Button animated={false} size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => toggleReveal(i)}
                    title={revealed.includes(i) ? "Сховати відповідь" : "Показати відповідь"}>
                    {revealed.includes(i) ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {revealed.includes(i) && (
                  <div className="ml-7 rounded-lg border-l-4 border-accent bg-accent/10 px-3 py-2">
                    <p className="font-bold text-foreground">{t.answer}</p>
                    {t.hint_uk && <p className="text-xs text-muted-foreground">{t.hint_uk}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}


        {role === "teacher" && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button animated={false} size="sm" variant="outline" className="flex-1" onClick={() => setSaveOpen(true)} disabled={!lesson}>
              <FolderDown /> У папку
            </Button>
            <Button animated={false} size="sm" className="flex-1" onClick={() => setHwOpen(true)} disabled={!lesson}>
              <Send /> Як ДЗ
            </Button>
          </div>
        )}
      </div>

      {role === "teacher" && lesson && (
        <>
          <SaveGrammarDialog open={saveOpen} onOpenChange={setSaveOpen} lesson={lesson} marksHtml={marks} notesHtml={notes} studentId={studentId} teacherId={teacherId} />
          <AssignGrammarDialog open={hwOpen} onOpenChange={setHwOpen} lesson={lesson} marksHtml={marks} studentId={studentId} teacherId={teacherId} />
        </>
      )}
    </div>
  );
}

/** Підсвічує ключовий фрагмент прикладу. */
function highlightFocus(de: string, focus?: string) {
  if (!focus || !de.includes(focus)) return de;
  const [before, ...rest] = de.split(focus);
  return (
    <>
      {before}
      <b className="rounded bg-primary/20 px-0.5 text-foreground">{focus}</b>
      {rest.join(focus)}
    </>
  );
}

/** Конспект граматики у форматі HTML — для папок і домашки. */
function grammarSummaryHtml(lesson: GrammarLesson, marksHtml: string) {
  const rules = (lesson.rules ?? [])
    .map((r) => `<p><b>${r.title ?? ""}</b><br>${r.explanation_uk ?? ""}${r.table?.length ? `<br>${r.table.join("<br>")}` : ""}</p>`)
    .join("");
  const examples = (lesson.examples ?? []).map((e) => `<p>${e.de ?? ""} — <i>${e.uk ?? ""}</i></p>`).join("");
  const practice = (lesson.practice ?? []).map((t) => `<p>${t.prompt ?? ""} <b>(${t.answer ?? ""})</b></p>`).join("");
  return `<p><b>${lesson.title ?? "Граматика"}</b></p>${lesson.summary_uk ? `<p>${lesson.summary_uk}</p>` : ""}
<p><b>Правила</b></p>${rules}<p><b>Приклади</b></p>${examples}<p><b>Практика</b></p>${practice}
<p><b>Текст</b></p>${marksHtml}`;
}

/** Зберігає урок граматики в папку матеріалів і в папки учня. */
function SaveGrammarDialog({
  open, onOpenChange, lesson, marksHtml, notesHtml, studentId, teacherId,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; lesson: GrammarLesson;
  marksHtml: string; notesHtml: string; studentId?: string; teacherId?: string;
}) {
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const date = new Date().toLocaleDateString("uk-UA");
  const title = `Граматика · ${lesson.title || lesson.topic || date}`;

  useEffect(() => { if (open) fetchFolders().then(setFolders).catch(() => setFolders([])); }, [open]);

  const save = async (folderId?: string) => {
    setBusy(folderId ?? "new");
    try {
      const { data: u } = await supabase.auth.getUser();
      const ownerId = teacherId || u.user!.id;
      let id = folderId;
      if (!id) {
        const existing = folders.find((f) => f.name === "Граматика");
        id = existing?.id ?? (await createFolder({ ownerId, name: "Граматика", category: "theory", level: lesson.level ?? null, description: "Уроки граматики з живих уроків" })).id;
      }
      const html = grammarSummaryHtml(lesson, marksHtml);
      await createItem({
        folderId: id, ownerId, kind: "text", title, level: lesson.level ?? null, tags: ["граматика", date],
        content: { body: plain(html), html, notes_html: notesHtml, lesson, date: new Date().toISOString() },
      });
      if (studentId) {
        await (supabase as any).from("student_notes").insert({
          student_id: studentId, teacher_id: ownerId, folder: "Граматика", title,
          body: `${html}${plain(notesHtml) ? `<hr><p><b>Нотатки</b></p>${notesHtml}` : ""}`,
          level: lesson.level ?? null, source: { kind: "live_grammar", topic: lesson.topic ?? null },
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
        <DialogTitle>Зберегти урок граматики</DialogTitle>
        <p className="text-sm text-muted-foreground">Назва: <b className="text-foreground">{title}</b></p>
        <p className="text-xs text-muted-foreground">Копія з'явиться і в папках учня.</p>
        <Button animated={false} onClick={() => save()} disabled={!!busy}>
          {busy === "new" ? <Loader2 className="animate-spin" /> : <FolderDown />} У папку «Граматика»
        </Button>
        {folders.filter((f) => f.name !== "Граматика").length > 0 && (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Або в іншу папку</p>
            {folders.filter((f) => f.name !== "Граматика").map((f) => (
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

/** Задає повний урок граматики як окреме домашнє завдання. */
function AssignGrammarDialog({
  open, onOpenChange, lesson, marksHtml, studentId, teacherId,
}: {
  open: boolean; onOpenChange: (v: boolean) => void; lesson: GrammarLesson;
  marksHtml: string; studentId?: string; teacherId?: string;
}) {
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);

  const assign = async () => {
    if (!studentId) { toast.error("Немає учня"); return; }
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const html = grammarSummaryHtml(lesson, marksHtml);
      const { error } = await (supabase as any).from("student_assignments").insert({
        teacher_id: teacherId || u.user!.id,
        student_id: studentId,
        type: "grammar",
        title: lesson.title || lesson.topic || "Граматика",
        instructions: lesson.summary_uk || "Повтори правила, зроби практику й познач граматику в тексті.",
        level: lesson.level ?? null,
        due_at: due ? new Date(due).toISOString() : null,
        status: "assigned",
        payload: {
          topic: {
            title_de: lesson.title_de ?? lesson.reading?.title_de ?? null,
            summary_uk: lesson.summary_uk ?? null,
            level: lesson.level ?? null,
            text_de: lesson.reading?.text_de ?? null,
            questions: lesson.reading?.questions ?? [],
            vocab: lesson.vocab ?? [],
            grammar_focus: (lesson.rules ?? []).map((r) => r.title || "").filter(Boolean),
            html,
          },
          grammar: lesson,
        },
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
        <DialogTitle>Задати граматику як домашку</DialogTitle>
        <p className="text-sm text-muted-foreground">{lesson.title || lesson.topic}</p>
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
