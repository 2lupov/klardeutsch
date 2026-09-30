import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, BookOpenText, Check, CheckCircle2, ChevronRight, GraduationCap,
  Lightbulb, Loader2, NotebookPen, Send, Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import MarkSheet from "@/components/live/MarkSheet";
import { paragraphsToHtml, plain } from "@/lib/rich-text";
import type { GrammarLesson } from "@/components/live/useLiveGrammar";

interface GrammarTask {
  id: string;
  title: string;
  instructions: string | null;
  level: string | null;
  due_at: string | null;
  status: string;
  created_at: string;
  payload: { grammar?: GrammarLesson } | null;
}

const stages = [
  { key: "rules", label: "Правила", icon: Lightbulb },
  { key: "examples", label: "Приклади", icon: Sparkles },
  { key: "practice", label: "Практика", icon: CheckCircle2 },
  { key: "reading", label: "Текст", icon: BookOpenText },
  { key: "notes", label: "Нотатки", icon: NotebookPen },
] as const;
type Stage = (typeof stages)[number]["key"];

export default function StudentGrammar() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<GrammarTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<GrammarTask | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("student_assignments").select("*")
      .eq("student_id", user.id).eq("type", "grammar").order("created_at", { ascending: false });
    setTasks((data as GrammarTask[]) || []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user?.id]);

  if (open) return <GrammarWorkbook task={open} onBack={() => { setOpen(null); void load(); }} />;
  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  const todo = tasks.filter((task) => ["assigned", "in_progress"].includes(task.status));
  const done = tasks.filter((task) => !todo.includes(task));

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-md bg-accent text-accent-foreground"><GraduationCap className="size-5" /></span>
        <div><h2 className="font-display text-xl font-bold">Граматика</h2><p className="text-sm text-muted-foreground">Правила, практика й читання в одному уроці</p></div>
      </div>
      {tasks.length === 0 && <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Граматичних уроків поки немає.</div>}
      {[{ label: "Треба виконати", list: todo }, { label: "Завершено", list: done }].map((group) => group.list.length > 0 && (
        <div key={group.label} className="space-y-2">
          <p className="text-[11px] font-bold uppercase text-muted-foreground">{group.label}</p>
          {group.list.map((task) => (
            <Button key={task.id} animated={false} variant="outline" onClick={() => setOpen(task)} className="h-auto w-full justify-start gap-3 p-4 text-left whitespace-normal">
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground"><GraduationCap className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate font-display font-bold">{task.title}</span><span className="block text-xs text-muted-foreground">{task.level || "Deutsch"}{task.due_at ? ` · до ${new Date(task.due_at).toLocaleDateString("uk-UA")}` : ""}</span></span>
              {task.status === "submitted" || task.status === "graded" ? <CheckCircle2 className="size-5 text-success" /> : <ChevronRight className="size-5 text-muted-foreground" />}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}

function GrammarWorkbook({ task, onBack }: { task: GrammarTask; onBack: () => void }) {
  const lesson = task.payload?.grammar ?? {};
  const available = useMemo(() => stages.filter(({ key }) => key === "notes" || (key === "rules" && lesson.rules?.length) || (key === "examples" && lesson.examples?.length) || (key === "practice" && lesson.practice?.length) || (key === "reading" && lesson.reading?.text_de)), [lesson]);
  const [stage, setStage] = useState<Stage>(available[0]?.key ?? "notes");
  const [answers, setAnswers] = useState<string[]>(() => JSON.parse(localStorage.getItem(`klar-grammar-answers:${task.id}`) || "[]"));
  const [notes, setNotes] = useState(() => localStorage.getItem(`klar-grammar-notes:${task.id}`) || "");
  const [reading, setReading] = useState(() => localStorage.getItem(`klar-grammar-reading:${task.id}`) || paragraphsToHtml(lesson.reading?.text_de || ""));
  const [sending, setSending] = useState(false);
  const locked = task.status === "submitted" || task.status === "graded";
  const completed = (key: Stage) => key === "practice" ? (lesson.practice ?? []).every((_, i) => answers[i]?.trim()) : key === "notes" ? Boolean(plain(notes)) : key !== stage;

  const updateAnswer = (index: number, value: string) => setAnswers((current) => { const next = [...current]; next[index] = value; localStorage.setItem(`klar-grammar-answers:${task.id}`, JSON.stringify(next)); return next; });
  const submit = async () => {
    const practice = lesson.practice ?? [];
    if (practice.some((_, index) => !answers[index]?.trim())) return toast.error("Виконайте всі практичні завдання");
    setSending(true);
    const practiceText = practice.map((item, index) => `${index + 1}. ${item.prompt}\n→ ${answers[index]}`).join("\n\n");
    const text = [`Практика:\n${practiceText}`, plain(notes) && `Нотатки:\n${plain(notes)}`].filter(Boolean).join("\n\n");
    const { data, error } = await supabase.functions.invoke("submit-student-assignment", { body: { assignment_id: task.id, text, answers, files: [] } });
    setSending(false);
    if (error || (data as { error?: string } | null)?.error) return toast.error((data as { error?: string } | null)?.error || error?.message || "Не вдалося здати");
    toast.success("Граматику здано!"); onBack();
  };

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card shadow-xl">
      <div className="flex items-center gap-3 border-b border-border px-3 py-3 sm:px-5">
        <Button animated={false} size="icon" variant="ghost" onClick={onBack} title="Назад"><ArrowLeft /></Button>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase text-primary">Grammatik · {lesson.level || task.level}</p><h2 className="truncate font-display text-lg font-black sm:text-xl">{lesson.title || task.title}</h2></div>
        {locked && <span className="inline-flex items-center gap-1 text-xs font-bold text-success"><CheckCircle2 className="size-4" /> Здано</span>}
      </div>
      <div className="flex min-h-[620px] flex-col md:flex-row">
        <aside className="w-full border-b border-border bg-muted/40 p-3 md:w-56 md:border-b-0 md:border-r md:p-5">
          <p className="mb-3 hidden text-[10px] font-bold uppercase text-muted-foreground md:block">Маршрут уроку</p>
          <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {available.map(({ key, label, icon: Icon }, index) => (
              <Button key={key} animated={false} variant="ghost" onClick={() => setStage(key)} className={`h-10 shrink-0 justify-start px-3 ${stage === key ? "bg-accent text-accent-foreground hover:bg-accent/90" : "text-muted-foreground"}`}>
                <span className={`grid size-5 place-items-center rounded-full border text-[10px] ${completed(key) ? "border-success bg-success text-success-foreground" : "border-border"}`}>{completed(key) ? <Check className="size-3" /> : index + 1}</span><Icon className="size-4" /><span>{label}</span>
              </Button>
            ))}
          </div>
          {lesson.summary_uk && <div className="mt-5 hidden rounded-md border border-accent/40 bg-accent/10 p-3 text-xs leading-relaxed md:block"><p className="mb-1 font-bold text-accent-foreground">MERKE!</p>{lesson.summary_uk}</div>}
        </aside>
        <main className="min-w-0 flex-1 p-4 sm:p-7 md:p-9">
          <AnimatePresence mode="wait"><motion.section key={stage} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
            {stage === "rules" && <WorkbookSection eyebrow="01 · Theorie" title="Правила"><div className="space-y-6">{lesson.rules?.map((rule, i) => <article key={i} className="border-l-4 border-accent pl-4"><h3 className="font-display text-lg font-bold">{rule.title}</h3><p className="mt-2 leading-7 text-muted-foreground">{rule.explanation_uk}</p>{rule.table?.length ? <div className="mt-4 overflow-hidden rounded-md border border-border bg-muted/30 font-mono text-sm">{rule.table.map((row, j) => <div key={j} className="border-b border-border px-4 py-2 last:border-0">{row}</div>)}</div> : null}</article>)}</div></WorkbookSection>}
            {stage === "examples" && <WorkbookSection eyebrow="02 · Beispiele" title="Приклади"><div className="divide-y divide-border">{lesson.examples?.map((example, i) => <div key={i} className="grid gap-2 py-4 sm:grid-cols-[2rem_1fr] sm:gap-4"><span className="font-mono text-sm text-muted-foreground">{String(i + 1).padStart(2, "0")}.</span><div><p className="text-lg font-medium leading-8">{example.de}</p><p className="text-sm text-muted-foreground">{example.uk}</p></div></div>)}</div></WorkbookSection>}
            {stage === "practice" && <WorkbookSection eyebrow="03 · Übungen" title="Практика"><div className="space-y-7">{lesson.practice?.map((item, i) => <label key={i} className="block"><span className="flex gap-3 text-base font-medium"><b className="font-mono text-muted-foreground">{String(i + 1).padStart(2, "0")}.</b>{item.prompt}</span><input disabled={locked} value={answers[i] || ""} onChange={(e) => updateAnswer(i, e.target.value)} className="ml-0 mt-3 w-full border-0 border-b-2 border-input bg-transparent px-1 py-2 text-lg font-semibold text-foreground outline-none focus:border-accent sm:ml-10 sm:w-[calc(100%-2.5rem)]" placeholder="Ваша відповідь…" />{item.hint_uk && <span className="ml-0 mt-1 block text-xs text-muted-foreground sm:ml-10">{item.hint_uk}</span>}</label>)}</div></WorkbookSection>}
            {stage === "reading" && <WorkbookSection eyebrow="04 · Lesetext" title={lesson.reading?.title_de || "Текст для читання"}><MarkSheet className="min-h-[420px]" value={reading} onChange={(html) => { setReading(html); localStorage.setItem(`klar-grammar-reading:${task.id}`, html); }} readOnly={locked} highlightOnly noLines sheetClassName="w-full px-1 py-3 font-display text-lg leading-9 [&_p]:mb-5" /></WorkbookSection>}
            {stage === "notes" && <WorkbookSection eyebrow="05 · Mein Heft" title="Мої нотатки"><MarkSheet className="min-h-[420px]" value={notes} onChange={(html) => { setNotes(html); localStorage.setItem(`klar-grammar-notes:${task.id}`, html); }} readOnly={locked} noLines placeholder="Запишіть правило своїми словами, додайте власні приклади…" sheetClassName="text-base leading-8" /></WorkbookSection>}
          </motion.section></AnimatePresence>
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">{available.findIndex((item) => item.key === stage) + 1} / {available.length}</p>
            {!locked && <Button animated={false} onClick={submit} disabled={sending} className="bg-foreground text-background hover:bg-foreground/90">{sending ? <Loader2 className="animate-spin" /> : <Send />} Здати граматику</Button>}
          </div>
        </main>
      </div>
    </div>
  );
}

function WorkbookSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <div><p className="text-[10px] font-bold uppercase text-primary">{eyebrow}</p><h1 className="mt-2 font-display text-2xl font-black sm:text-3xl">{title}</h1><div className="mt-7">{children}</div></div>;
}