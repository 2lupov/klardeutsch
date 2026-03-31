import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Pen } from "lucide-react";
import type { Lang } from "@/i18n/translations";

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: () => void;
  lang: Lang;
}

const WritingTaskLesson = ({ lesson, onComplete, lang }: Props) => {
  const content = lesson.content as any;
  const prompt = content?.prompt ?? "";
  const minWords = content?.min_words ?? 50;
  const maxWords = content?.max_words ?? 300;

  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const isValid = wordCount >= minWords && wordCount <= maxWords;

  const handleSubmit = () => {
    if (!isValid) return;
    setSubmitted(true);
    onComplete();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
      </div>

      {/* Task prompt */}
      <div className="p-4 rounded-xl border border-border/30 bg-card/40">
        <div className="flex items-start gap-2">
          <Pen className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground">{prompt}</p>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {lang === "uk" ? `Від ${minWords} до ${maxWords} слів` : `От ${minWords} до ${maxWords} слов`}
        </p>
      </div>

      {/* Writing area */}
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={lang === "uk" ? "Напиши свій текст тут..." : "Напиши свой текст здесь..."}
        className="min-h-[200px] bg-muted/20 border-border/30"
        disabled={submitted}
      />

      {/* Word count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className={wordCount < minWords ? "text-destructive" : wordCount > maxWords ? "text-destructive" : "text-primary"}>
          {wordCount} {lang === "uk" ? "слів" : "слов"}
        </span>
        <span>{minWords}–{maxWords}</span>
      </div>

      {/* Submit */}
      <div className="flex justify-center">
        {submitted ? (
          <div className="flex items-center gap-2 text-primary text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            {lang === "uk" ? "Відправлено!" : "Отправлено!"}
          </div>
        ) : (
          <Button onClick={handleSubmit} disabled={!isValid} className="font-display font-bold" size="lg">
            {lang === "uk" ? "Відправити на перевірку" : "Отправить на проверку"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default WritingTaskLesson;
