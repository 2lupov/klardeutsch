import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Send, RefreshCw, Clock, BookOpen, Lightbulb, ListChecks, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface HomeworkDraft {
  title: string;
  intro: string;
  level: string;
  est_minutes: number;
  blocks: { heading: string; instruction: string; items: string[] }[];
  vocab: { de: string; uk: string }[];
  tips: string[];
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const KINDS: { key: string; label: string }[] = [
  { key: "grammar", label: "📐 Граматика" },
  { key: "vocab", label: "🗂 Лексика" },
  { key: "writing", label: "✍️ Письмо" },
  { key: "reading", label: "📖 Читання" },
  { key: "translate", label: "🔁 Переклад" },
  { key: "speaking", label: "🎙 Мовлення" },
];

export function draftToText(d: HomeworkDraft): string {
  const parts: string[] = [];
  if (d.intro) parts.push(d.intro.trim());
  d.blocks.forEach((b, bi) => {
    const head = `\n${bi + 1}. ${b.heading}`.trimEnd();
    parts.push(head);
    if (b.instruction) parts.push(b.instruction.trim());
    b.items.forEach((it, i) => parts.push(`   ${i + 1}) ${it}`));
  });
  if (d.vocab.length) {
    parts.push("\n🗂 Слова для повторення:");
    d.vocab.forEach((v) => parts.push(`   • ${v.de} — ${v.uk}`));
  }
  if (d.tips.length) {
    parts.push("\n💡 Підказки:");
    d.tips.forEach((x) => parts.push(`   • ${x}`));
  }
  parts.push(`\n⏱ Приблизно ${d.est_minutes} хв · Рівень ${d.level}`);
  return parts.join("\n");
}

interface Props {
  teacherId: string;
  studentId: string;
  defaultLevel?: string | null;
  isKid?: boolean;
  onSent?: () => void;
}

const AIHomeworkBuilder = ({ teacherId, studentId, defaultLevel, isKid, onSent }: Props) => {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState(defaultLevel || "A1");
  const [kinds, setKinds] = useState<string[]>(["grammar", "vocab", "writing"]);
  const [count, setCount] = useState(8);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<HomeworkDraft | null>(null);
  const [dueAt, setDueAt] = useState("");
  const [sending, setSending] = useState(false);
  const [editText, setEditText] = useState<string | null>(null);

  const toggleKind = (k: string) =>
    setKinds((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const generate = async () => {
    if (kinds.length === 0) return toast.error("Оберіть хоча б один тип завдань");
    setLoading(true);
    setEditText(null);
    try {
      const resp = await fetchEdgeFunction("generate-homework", {
        json: { topic, level, kinds, count, isKid },
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || "Помилка генерації");
      setDraft(data as HomeworkDraft);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!draft) return;
    setSending(true);
    try {
      const { data: lesson, error: e1 } = await supabase
        .from("tutoring_lessons")
        .insert({
          teacher_id: teacherId,
          student_id: studentId,
          title: draft.title,
          level: draft.level,
          status: "scheduled",
        })
        .select("id")
        .single();
      if (e1) throw e1;

      const { error: e2 } = await supabase.from("tutoring_homework").insert({
        lesson_id: lesson.id,
        description: editText ?? draftToText(draft),
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
      });
      if (e2) throw e2;

      toast.success("Домашку надіслано учню ✅");
      setDraft(null);
      setEditText(null);
      setDueAt("");
      onSent?.();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/5 to-accent/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="font-display font-bold leading-tight">Готова домашка від AI</h3>
          <p className="text-xs text-muted-foreground">Тема → перегляд → надсилання учню</p>
        </div>
      </div>

      <Textarea
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        rows={2}
        placeholder="Тема або побажання: «Perfekt із haben, побутові дієслова, трохи лексики про дім»"
      />

      <div className="flex flex-wrap gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
              level === l
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card border-border hover:border-primary/40"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => toggleKind(k.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              kinds.includes(k.key)
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-card border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-3 flex-wrap">
        <div className="w-28">
          <label className="text-xs text-muted-foreground block mb-1">Пунктів</label>
          <Input
            type="number"
            min={3}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value) || 8)}
          />
        </div>
        <Button onClick={generate} disabled={loading}>
          {loading ? (
            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Генерую…</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-1" /> {draft ? "Згенерувати ще раз" : "Створити домашку"}</>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl border border-border bg-card overflow-hidden"
          >
            <div className="p-4 border-b border-border flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center shrink-0">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <Input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="font-display font-bold border-0 px-0 h-auto py-0 focus-visible:ring-0 text-base"
                />
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{draft.level}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{draft.est_minutes} хв</span>
                  <span className="flex items-center gap-1"><ListChecks className="w-3 h-3" /> {draft.blocks.length} блоків</span>
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditText(editText === null ? draftToText(draft) : null)}
              >
                <Pencil className="w-4 h-4 mr-1" /> {editText === null ? "Редагувати" : "Перегляд"}
              </Button>
            </div>

            {editText !== null ? (
              <div className="p-4">
                <Textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={16}
                  className="font-mono text-xs leading-relaxed"
                />
              </div>
            ) : (
              <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
                {draft.intro && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{draft.intro}</p>
                )}
                {draft.blocks.map((b, i) => (
                  <div key={i} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <p className="font-bold text-sm">{b.heading}</p>
                    </div>
                    {b.instruction && <p className="text-xs text-muted-foreground">{b.instruction}</p>}
                    <ol className="space-y-1 list-decimal list-inside">
                      {b.items.map((it, j) => (
                        <li key={j} className="text-sm leading-relaxed">{it}</li>
                      ))}
                    </ol>
                  </div>
                ))}
                {draft.vocab.length > 0 && (
                  <div className="rounded-xl bg-muted/40 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Слова</p>
                    <div className="grid sm:grid-cols-2 gap-1">
                      {draft.vocab.map((v, i) => (
                        <p key={i} className="text-sm"><b>{v.de}</b> — <span className="text-muted-foreground">{v.uk}</span></p>
                      ))}
                    </div>
                  </div>
                )}
                {draft.tips.length > 0 && (
                  <div className="rounded-xl bg-accent/10 p-3 space-y-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                      <Lightbulb className="w-3 h-3" /> Підказки
                    </p>
                    {draft.tips.map((x, i) => (
                      <p key={i} className="text-sm">• {x}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="p-4 border-t border-border flex items-end gap-3 flex-wrap">
              <div className="flex-1 min-w-[180px]">
                <label className="text-xs text-muted-foreground block mb-1">Дедлайн (необов'язково)</label>
                <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
              </div>
              <Button variant="outline" onClick={generate} disabled={loading} className="self-end">
                <RefreshCw className="w-4 h-4 mr-1" /> Інший варіант
              </Button>
              <Button onClick={send} disabled={sending} className="self-end">
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" /> Надіслати учню</>}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AIHomeworkBuilder;
