import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, Loader2, NotebookPen, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MarkSheet from "@/components/live/MarkSheet";
import { countWords, paragraphsToHtml, plain } from "@/lib/rich-text";
import type { ReadingTopic } from "@/components/live/useLiveReading";

interface Task {
  id: string;
  title: string;
  instructions: string | null;
  level: string | null;
  due_at: string | null;
  status: string;
  created_at: string;
  payload: { topic?: ReadingTopic & { html?: string } } | null;
}

/** «Читання» в Академії учня: тексти від викладача з позначками та нотатками. */
export default function StudentReading() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Task | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("student_assignments").select("*")
      .eq("student_id", user.id).eq("type", "reading").order("created_at", { ascending: false });
    setTasks((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  if (open) return <ReadingSheet task={open} onBack={() => { setOpen(null); load(); }} />;
  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const todo = tasks.filter((t) => t.status === "assigned" || t.status === "in_progress");
  const done = tasks.filter((t) => !todo.includes(t));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Читання</h2>
      </div>
      {tasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Поки що текстів немає. Викладач скоро додасть 📖
        </div>
      )}
      {[{ label: "Треба прочитати", list: todo }, { label: "Прочитано", list: done }].map((g) => g.list.length > 0 && (
        <div key={g.label} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{g.label}</p>
          {g.list.map((t) => (
            <button key={t.id} onClick={() => setOpen(t)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">📖</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">{t.payload?.topic?.title_de || t.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[t.level, t.due_at && `до ${new Date(t.due_at).toLocaleDateString("uk-UA")}`].filter(Boolean).join(" · ") || new Date(t.created_at).toLocaleDateString("uk-UA")}
                </span>
              </span>
              {t.status === "graded" ? <span className="text-xs font-semibold text-primary">Перевірено</span>
                : t.status === "submitted" ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function ReadingSheet({ task, onBack }: { task: Task; onBack: () => void }) {
  const topic = task.payload?.topic;
  const marksKey = `klar-reading-marks:${task.id}`;
  const notesKey = `klar-reading-notes:${task.id}`;
  const [textHtml, setTextHtml] = useState(
    () => localStorage.getItem(marksKey) || topic?.html || paragraphsToHtml(topic?.text_de || ""),
  );
  const [notes, setNotes] = useState(() => localStorage.getItem(notesKey) || "");
  const [sending, setSending] = useState(false);
  const locked = task.status === "submitted" || task.status === "graded";

  const onText = (html: string) => { setTextHtml(html); localStorage.setItem(marksKey, html); };
  const onNotes = (html: string) => { setNotes(html); localStorage.setItem(notesKey, html); };

  const submit = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("submit-student-assignment", {
        body: { assignment_id: task.id, text: `${plain(notes) ? plain(notes) : "Прочитано"}`, files: [] },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      const { data: u } = await supabase.auth.getUser();
      if (u.user && plain(notes)) {
        await (supabase as any).from("student_notes").insert({
          student_id: u.user.id, folder: "Читання", level: task.level,
          title: `Нотатки · ${topic?.title_de || task.title}`,
          body: notes, source: { kind: "reading_homework", assignment_id: task.id },
        });
      }
      toast.success("Здано! +10 монет");
      localStorage.removeItem(marksKey);
      onBack();
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося здати");
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button animated={false} size="sm" variant="ghost" onClick={onBack}><ArrowLeft /> Назад</Button>
        <span className="truncate font-display text-lg font-bold">{topic?.title_de || task.title}</span>
        <span className="ml-auto text-xs text-muted-foreground">{countWords(textHtml)} слів</span>
      </div>

      {(topic?.summary_uk || task.instructions) && (
        <p className="rounded-2xl bg-muted/50 p-3 text-sm text-foreground">{topic?.summary_uk || task.instructions}</p>
      )}

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
        <MarkSheet className="min-h-[50vh]" value={textHtml} onChange={onText} readOnly={locked} />
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-primary">
              <NotebookPen className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Мої нотатки</span>
            </div>
            <MarkSheet className="min-h-[220px]" sheetClassName="text-base leading-8" value={notes} onChange={onNotes}
              readOnly={locked} placeholder="Нові слова, правила, приклади…" />
          </div>

          {!!topic?.grammar_focus?.length && (
            <div className="space-y-1.5 rounded-2xl border border-border bg-card p-3 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Граматичні зв'язки</p>
              {topic.grammar_focus.map((g, i) => <p key={i} className="text-foreground">{g}</p>)}
            </div>
          )}
          {!!topic?.vocab?.length && (
            <div className="space-y-1 rounded-2xl border border-border bg-card p-3 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Слова</p>
              {topic.vocab.map((v, i) => (
                <p key={i} className="text-foreground">
                  {v.article && <span className="mr-1 text-primary">{v.article}</span>}<b>{v.term}</b>
                  <span className="text-muted-foreground"> — {v.translation}</span>
                </p>
              ))}
            </div>
          )}
          {!!topic?.questions?.length && (
            <div className="space-y-1 rounded-2xl border border-border bg-card p-3 text-sm">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Питання</p>
              <ul className="list-disc space-y-1 pl-5 text-foreground">{topic.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
            </div>
          )}

          {!locked && (
            <Button animated={false} className="w-full" onClick={submit} disabled={sending}>
              {sending ? <Loader2 className="animate-spin" /> : <Send />} Здати читання
            </Button>
          )}
          {locked && <p className="text-center text-sm text-primary">Здано ✓</p>}
        </div>
      </div>
    </div>
  );
}
