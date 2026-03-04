import { useState } from "react";
import { Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";

const MCExercise = ({ ex, lang, onComplete }: { ex: any; lang: string; onComplete?: () => void }) => {
  const [selected, setSelected] = useState<number | null>(null);
  const question = lang === "uk" ? ex.question?.ua : ex.question?.ru;
  const explanation = lang === "uk" ? ex.explanation?.ua : ex.explanation?.ru;

  const handleSelect = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === ex.correct_index) {
      onComplete?.();
    }
  };

  return (
    <div className="p-4 rounded-xl bg-secondary/30 border border-border/20">
      <p className="text-sm font-medium text-foreground mb-3">{question}</p>
      <div className="grid gap-2">
        {ex.options?.map((opt: any, i: number) => {
          const label = typeof opt === "string" ? opt : opt.text || opt.de;
          const isCorrect = i === ex.correct_index;
          const isSelected = selected === i;
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={selected !== null}
              className={cn(
                "text-left px-4 py-2.5 rounded-xl text-xs font-medium border transition-all duration-200",
                selected === null
                  ? "bg-card border-border/30 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
                  : isCorrect
                  ? "bg-green-500/10 border-green-500/30 text-green-400 animate-answer-correct"
                  : isSelected
                  ? "bg-destructive/10 border-destructive/30 text-destructive animate-answer-shake"
                  : "bg-card border-border/20 opacity-40"
              )}
            >
              <span className="flex items-center gap-2">
                <span className={cn(
                  "w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold shrink-0",
                  selected === null
                    ? "border-border text-muted-foreground"
                    : isCorrect
                    ? "border-green-500/50 bg-green-500/20 text-green-400"
                    : isSelected
                    ? "border-destructive/50 bg-destructive/20 text-destructive"
                    : "border-border text-muted-foreground"
                )}>
                  {String.fromCharCode(65 + i)}
                </span>
                {label}
              </span>
            </button>
          );
        })}
      </div>
      {selected !== null && explanation && (
        <p className="text-[11px] text-muted-foreground mt-3 flex items-start gap-1.5 animate-slide-up">
          <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
          {explanation}
        </p>
      )}
    </div>
  );
};

export default MCExercise;
