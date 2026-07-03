import { useMemo } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileText, ListChecks, MessageSquare, Pencil, Sparkles } from "lucide-react";
import type { ViewType } from "@/lib/presenter-session";

interface Step {
  key: string;
  label: string;
  icon: any;
  view: ViewType;
}

interface Props {
  view: ViewType;
  words: any[];
  exercises: any[];
  interactive?: boolean;
  onJump?: (v: ViewType) => void;
}

/**
 * Horizontal timeline of a live lesson. Teacher can click to jump between blocks;
 * student receives it as read-only orientation showing where they are.
 */
const LessonTimeline = ({ view, words, exercises, interactive, onJump }: Props) => {
  const steps: Step[] = useMemo(() => {
    const list: Step[] = [
      { key: "welcome", label: "Старт", icon: Sparkles, view: { type: "welcome" } },
      { key: "theory", label: "Теория", icon: FileText, view: { type: "theory" } },
      ...words.map((w, i) => ({
        key: `w-${w.id}`,
        label: w.german?.slice(0, 12) || `Слово ${i + 1}`,
        icon: BookOpen,
        view: { type: "word" as const, wordId: w.id, revealTranslation: false },
      })),
      ...exercises.map((ex, i) => ({
        key: `e-${ex.id}`,
        label: `#${i + 1}`,
        icon: ListChecks,
        view: { type: "exercise" as const, exerciseId: ex.id, revealAnswer: false },
      })),
      { key: "whiteboard", label: "Доска", icon: Pencil, view: { type: "whiteboard" } },
    ];
    return list;
  }, [words, exercises]);

  const isActive = (s: Step) => {
    const v: any = view;
    if (v.type !== s.view.type) return false;
    if (v.type === "word") return v.wordId === (s.view as any).wordId;
    if (v.type === "exercise") return v.exerciseId === (s.view as any).exerciseId;
    return true;
  };

  const currentIdx = steps.findIndex(isActive);
  const progress = currentIdx >= 0 ? ((currentIdx + 1) / steps.length) * 100 : 0;

  return (
    <div className="w-full">
      <div className="relative h-1 rounded-full bg-muted overflow-hidden mb-1.5">
        <motion.div
          className="absolute inset-y-0 left-0 bg-primary"
          animate={{ width: `${progress}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 22 }}
        />
      </div>
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
        {steps.map((s, i) => {
          const active = isActive(s);
          const passed = currentIdx >= 0 && i < currentIdx;
          const Icon = s.icon;
          const base =
            "shrink-0 flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[11px] font-semibold whitespace-nowrap transition";
          const cls = active
            ? "bg-primary text-primary-foreground border-primary shadow-sm"
            : passed
              ? "bg-primary/10 text-primary border-primary/30"
              : "bg-card text-muted-foreground border-border";
          const inner = (
            <>
              <Icon className="w-3 h-3" />
              <span className="max-w-[90px] truncate">{s.label}</span>
            </>
          );
          return interactive ? (
            <button key={s.key} className={`${base} ${cls} hover:border-primary/60`} onClick={() => onJump?.(s.view)}>
              {inner}
            </button>
          ) : (
            <div key={s.key} className={`${base} ${cls}`}>
              {inner}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LessonTimeline;
