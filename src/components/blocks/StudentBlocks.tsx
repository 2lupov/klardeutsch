import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import BlockRenderer, { BLOCK_ICON, blockLabel } from "./BlockRenderer";
import UmlautKeyboard from "./UmlautKeyboard";
import { BLOCK_META, scoreBlock, type BlockType, type LessonBlock } from "./types";

interface Props {
  blocks: LessonBlock[];
  studentId?: string | null;
  /** Показувати нижню панель із перевіркою та здачею. */
  showActions?: boolean;
  readOnly?: boolean;
  /** Викликається після здачі: сумарні бали. */
  onSubmitted?: (score: number, max: number) => void | Promise<void>;
  /** Зберігати відповіді в базу (у превʼю викладача — ні). */
  persist?: boolean;
  editorial?: boolean;
  /** Local draft per assignment and topic; never used for teacher previews. */
  draftKey?: string;
}

/** Екран учня: блоки один за одним + закріплена панель дій. */
export default function StudentBlocks({ blocks, studentId, showActions = true, readOnly, onSubmitted, persist = true, editorial = false, draftKey }: Props) {
  const [values, setValues] = useState<Record<string, any>>(() => {
    if (!draftKey) return {};
    try { return JSON.parse(localStorage.getItem(draftKey) || "{}"); } catch { return {}; }
  });
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const submittingRef = useRef(false);
  const blockIds = blocks.map((b) => b.id).join("\u001f");

  useEffect(() => {
    if (!draftKey || readOnly || submitted) return;
    try { localStorage.setItem(draftKey, JSON.stringify(values)); } catch { /* storage may be unavailable */ }
  }, [draftKey, values, readOnly, submitted]);

  useEffect(() => {
    if (!persist || !studentId || !blockIds) return;
    let live = true;
    (async () => {
      const { data } = await supabase
        .from("tutoring_block_answers")
        .select("block_id, answers, submitted_at")
        .in("block_id", blockIds.split("\u001f"))
        .eq("student_id", studentId);
      if (!live) return;
      const next: Record<string, any> = {};
      (data ?? []).forEach((r: any) => {
        next[r.block_id] = r.answers;
        if (r.submitted_at) setSubmitted(true);
      });
      if (Object.keys(next).length) setValues(next);
    })();
    return () => { live = false; };
  }, [persist, studentId, blockIds]);

  const totals = useMemo(() => {
    let score = 0;
    let max = 0;
    blocks.forEach((b) => {
      const r = scoreBlock(b, values[b.id]);
      score += r.score;
      max += r.max;
    });
    return { score, max };
  }, [blocks, values]);

  const save = async (markSubmitted: boolean): Promise<boolean> => {
    if (!persist || !studentId) return true;
    setSaving(true);
    try {
      const rows = blocks.map((b) => {
        const r = scoreBlock(b, values[b.id]);
        return {
          block_id: b.id,
          student_id: studentId,
          answers: values[b.id] ?? {},
          score: r.score,
          max_score: r.max,
          submitted_at: markSubmitted ? new Date().toISOString() : null,
        };
      });
      const { error } = await supabase.from("tutoring_block_answers").upsert(rows, { onConflict: "block_id,student_id" });
      if (error) throw error;
      return true;
    } catch (e: any) {
      toast({ title: "Не вдалося зберегти відповіді", description: e?.message, variant: "destructive" });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const check = async () => {
    setChecked(true);
    await save(false);
  };

  const submit = async () => {
    if (saving || submitted || submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      if (onSubmitted) {
        // The assignment callback owns submission; only lock this reader on success.
        await onSubmitted(totals.score, totals.max);
      } else if (!(await save(true))) return;
      setChecked(true);
      setSubmitted(true);
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.75 } });
      toast({ title: "Відповіді здано", description: `Результат: ${totals.score} / ${totals.max}` });
    } catch (e: any) {
      toast({ title: "Не вдалося здати відповіді", description: e?.message, variant: "destructive" });
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  };

  if (blocks.length === 0) {
    return <p className="p-6 text-center text-sm text-muted-foreground">Блоків поки немає.</p>;
  }

  return (
    <div className={editorial ? "space-y-0 pb-28" : "space-y-4 pb-28"}>
      {blocks.map((b, i) => {
        const Icon = BLOCK_ICON[b.type as BlockType] ?? CheckCircle2;
        return (
          <motion.section
            key={b.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.05, 0.3) }}
            className={editorial ? "border-b border-border/70 px-1 py-7 last:border-0 sm:px-4" : "rounded-2xl border bg-card p-4 shadow-sm"}
          >
            {b.type !== "topic" && <header className="mb-4 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-semibold leading-tight">{blockLabel(b)}</h3>
                <p className="text-[11px] text-muted-foreground">{BLOCK_META[b.type as BlockType]?.de}</p>
              </div>
            </header>}
            <BlockRenderer
              block={b}
              value={values[b.id]}
              onChange={(v) => setValues((s) => ({ ...s, [b.id]: v }))}
              checked={checked}
              readOnly={readOnly || submitted}
            />
          </motion.section>
        );
      })}

      {showActions && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="text-sm">
              <span className="font-semibold">{totals.score}</span>
              <span className="text-muted-foreground"> / {totals.max} балів</span>
            </div>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={check} disabled={saving || readOnly}>
                {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
                Antworten prüfen
              </Button>
              <Button onClick={submit} disabled={saving || submitted || readOnly}>
                <Send className="mr-1 h-4 w-4" />
                {submitted ? "Здано" : "Здати"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {!readOnly && <UmlautKeyboard />}
    </div>
  );
}
