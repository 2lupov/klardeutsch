import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, PenLine, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { WritingTopic } from "@/components/live/LiveWriting";

interface Task {
  id: string;
  title: string;
  instructions: string | null;
  level: string | null;
  due_at: string | null;
  status: string;
  created_at: string;
  payload: { topic?: WritingTopic } | null;
}

const sheetStyle = {
  backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, hsl(var(--border)) 31px, hsl(var(--border)) 32px)",
  backgroundAttachment: "local" as const,
  backgroundPosition: "0 16px",
};

/** «Письмо» в Академії учня: письмові завдання від викладача з темою та аркушем у лінійку. */
export default function StudentWriting() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Task | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("student_assignments").select("*").eq("student_id", user.id).eq("type", "writing").order("created_at", { ascending: false });
    setTasks((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  if (open) return <WritingSheet task={open} onBack={() => { setOpen(null); load(); }} />;

  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const todo = tasks.filter((t) => t.status === "assigned" || t.status === "in_progress");
  const done = tasks.filter((t) => !todo.includes(t));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <PenLine className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Письмо</h2>
      </div>
      {tasks.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Поки що листів немає. Викладач скоро дасть тему ✉️
        </div>
      )}
      {[{ label: "Треба написати", list: todo }, { label: "Здано", list: done }].map((g) => g.list.length > 0 && (
        <div key={g.label} className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{g.label}</p>
          {g.list.map((t) => (
            <button key={t.id} onClick={() => setOpen(t)}
              className="w-full flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">✉️</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">{t.payload?.topic?.title_de || t.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[t.level, t.due_at && `до ${new Date(t.due_at).toLocaleDateString("uk-UA")}`].filter(Boolean).join(" · ") || new Date(t.created_at).toLocaleDateString("uk-UA")}
                </span>
              </span>
              {t.status === "graded" ? <span className="text-xs font-semibold text-primary">Оцінено</span>
                : t.status === "submitted" ? <CheckCircle2 className="h-5 w-5 text-primary" /> : null}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function WritingSheet({ task, onBack }: { task: Task; onBack: () => void }) {
  const { user } = useAuth();
  const key = `klar-writing-draft:${task.id}`;
  const [text, setText] = useState(() => localStorage.getItem(key) || "");
  const [sending, setSending] = useState(false);
  const [sub, setSub] = useState<{ text: string | null; grade: number | null; teacher_feedback: string | null; ai_feedback: string | null } | null>(null);
  const topic = task.payload?.topic;
  const locked = task.status === "submitted" || task.status === "graded";

  useEffect(() => {
    if (!locked || !user) return;
    supabase.from("student_submissions").select("text, grade, teacher_feedback, ai_feedback").eq("assignment_id", task.id).eq("student_id", user.id)
      .order("submitted_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { setSub(data as any); if ((data as any)?.text) setText((data as any).text); });
  }, [task.id]);

  const onType = (v: string) => { setText(v); localStorage.setItem(key, v); };
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const min = topic?.min_words ?? 0;

  const submit = async () => {
    if (!text.trim()) return toast.error("Спершу напиши лист");
    setSending(true);
    const { data, error } = await supabase.functions.invoke("submit-student-assignment", { body: { assignment_id: task.id, text: text.trim(), files: [] } });
    setSending(false);
    if (error || (data as any)?.error) return toast.error(String((data as any)?.error || error?.message || "Помилка"));
    localStorage.removeItem(key);
    toast.success("Лист здано! +10 монет");
    onBack();
  };

  return (
    <div className="space-y-3">
      <Button animated={false} variant="ghost" size="sm" onClick={onBack}><ArrowLeft /> До листів</Button>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <aside className="space-y-3 rounded-2xl border border-border bg-card p-4 text-sm">
          <div className="flex items-center gap-2 text-primary">
            <PenLine className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Тема</span>
            {task.level && <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold">{task.level}</span>}
          </div>
          <h3 className="font-display text-lg font-bold leading-tight text-foreground">{topic?.title_de || task.title}</h3>
          {topic?.situation_uk && <p className="text-muted-foreground">{topic.situation_uk}</p>}
          {(topic?.task_de || task.instructions) && <p className="rounded-xl bg-muted/50 p-3 font-medium text-foreground">{topic?.task_de || task.instructions}</p>}
          {!!topic?.points?.length && (
            <ul className="space-y-1.5">
              {topic.points.map((p, i) => (
                <li key={i} className="flex gap-2"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span>{p}</li>
              ))}
            </ul>
          )}
          {!!topic?.redemittel?.length && !locked && (
            <div className="flex flex-wrap gap-1.5">
              {topic.redemittel.map((r, i) => (
                <button key={i} onClick={() => onType(`${text}${text && !/\s$/.test(text) ? " " : ""}${r}`)}
                  className="rounded-lg border border-dashed border-border px-2 py-1 text-xs hover:bg-muted">{r}</button>
              ))}
            </div>
          )}
        </aside>
        <section className="flex min-h-[60dvh] flex-col overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex h-11 shrink-0 items-center gap-3 border-b border-border px-4">
            <span className="text-xs font-semibold">Мій лист</span>
            <span className={cn("ml-auto text-xs font-medium", min && words >= min ? "text-primary" : "text-muted-foreground")}>{words}{min ? ` / ${min}` : ""} слів</span>
          </div>
          <textarea value={text} onChange={(e) => onType(e.target.value)} readOnly={locked} spellCheck={false} placeholder="Liebe Anna, …"
            className="min-h-0 w-full flex-1 resize-none bg-transparent px-6 py-4 font-display text-lg leading-8 text-foreground outline-none placeholder:text-muted-foreground/40"
            style={sheetStyle} />
          {sub && (sub.grade != null || sub.teacher_feedback || sub.ai_feedback) && (
            <div className="space-y-1 border-t border-border bg-primary/5 p-4 text-sm">
              {sub.grade != null && <p className="font-bold text-primary">Оцінка: {sub.grade}</p>}
              {sub.teacher_feedback && <p className="whitespace-pre-wrap">{sub.teacher_feedback}</p>}
              {!sub.teacher_feedback && sub.ai_feedback && <p className="whitespace-pre-wrap text-muted-foreground">{sub.ai_feedback}</p>}
            </div>
          )}
          {!locked && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border p-3">
              <span className="mr-auto text-xs text-muted-foreground">Чернетка зберігається сама</span>
              <Button animated={false} onClick={submit} disabled={sending}>{sending ? <Loader2 className="animate-spin" /> : <Send />} Здати лист</Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
