import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Pen, Loader2 } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  lesson: { id: string; title: string; content: any };
  /** Saves the essay; must throw if saving failed. */
  onComplete: (answers: { essay: string; word_count: number; submitted_at: string }) => Promise<void> | void;
  lang: Lang;
}

const draftKey = (id: string) => `klar_essay_draft:${id}`;

const WritingTaskLesson = ({ lesson, onComplete, lang }: Props) => {
  const { user } = useAuth();
  const content = lesson.content as any;
  const prompt = content?.prompt ?? "";
  const minWords = content?.min_words ?? 50;
  const maxWords = content?.max_words ?? 300;

  const [text, setText] = useState(() => localStorage.getItem(draftKey(lesson.id)) ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load a previously submitted essay
  useEffect(() => {
    if (!user) return;
    supabase.from("course_lesson_progress").select("user_answers").eq("user_id", user.id).eq("lesson_id", lesson.id).maybeSingle()
      .then(({ data }) => {
        const essay = (data?.user_answers as any)?.essay;
        if (typeof essay === "string" && essay) { setText(essay); setSubmitted(true); }
      });
  }, [user, lesson.id]);

  useEffect(() => {
    if (!submitted) localStorage.setItem(draftKey(lesson.id), text);
  }, [text, submitted, lesson.id]);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const isValid = wordCount >= minWords && wordCount <= maxWords;

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onComplete({ essay: text.trim(), word_count: wordCount, submitted_at: new Date().toISOString() });
      localStorage.removeItem(draftKey(lesson.id));
      setSubmitted(true);
    } catch (e: any) {
      toast({
        title: lang === "uk" ? "Не вдалося надіслати" : "Не удалось отправить",
        description: lang === "uk" ? "Текст збережено, спробуйте ще раз." : "Текст сохранён, попробуйте ещё раз.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
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
          <Button onClick={handleSubmit} disabled={!isValid || saving} className="font-display font-bold" size="lg">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {lang === "uk" ? "Відправити на перевірку" : "Отправить на проверку"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default WritingTaskLesson;
