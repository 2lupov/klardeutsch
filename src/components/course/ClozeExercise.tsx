import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const ClozeExercise = ({ ex, lang, onComplete }: { ex: any; lang: string; onComplete?: () => void }) => {
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const isCorrect = answer.trim().toLowerCase() === ex.answer.toLowerCase();
  const hint = lang === "uk" ? ex.hint?.ua : ex.hint?.ru;
  const explanation = lang === "uk" ? ex.explanation?.ua : ex.explanation?.ru;

  const handleSubmit = () => {
    if (!answer.trim() || submitted) return;
    setSubmitted(true);
    if (answer.trim().toLowerCase() === ex.answer.toLowerCase()) {
      onComplete?.();
    }
  };

  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      submitted
        ? isCorrect
          ? "bg-green-500/5 border-green-500/20"
          : "bg-destructive/5 border-destructive/20"
        : "bg-secondary/30 border-border/20"
    )}>
      <p className="text-sm font-medium text-foreground mb-2">{ex.text_de}</p>
      {hint && !submitted && (
        <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">💡 {hint}</p>
      )}
      <div className="flex gap-2">
        <input
          value={answer}
          onChange={(e) => { setAnswer(e.target.value); if (submitted) setSubmitted(false); }}
          placeholder="..."
          className="flex-1 px-3 py-2 rounded-xl bg-card text-foreground border border-border text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <button
          onClick={handleSubmit}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all",
            submitted
              ? isCorrect
                ? "bg-green-500/20 text-green-500"
                : "bg-destructive/20 text-destructive"
              : "bg-primary text-primary-foreground hover:brightness-110 active:scale-95"
          )}
        >
          {submitted ? (isCorrect ? "✓" : "✗") : "→"}
        </button>
      </div>
      {submitted && (
        <div className={cn(
          "mt-3 flex items-start gap-2 text-xs animate-slide-up",
          isCorrect ? "text-green-500" : "text-destructive"
        )}>
          {isCorrect
            ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
            : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          }
          <div>
            {isCorrect
              ? (lang === "uk" ? "Правильно! 🎉" : "Правильно! 🎉")
              : <span>{lang === "uk" ? "Відповідь" : "Ответ"}: <strong>{ex.answer}</strong></span>
            }
            {explanation && <p className="text-muted-foreground mt-0.5">{explanation}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClozeExercise;
