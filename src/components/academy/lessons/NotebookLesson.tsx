import { useState, useCallback, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Lang } from "@/i18n/translations";

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: () => void;
  lang: Lang;
}

const NotebookLesson = ({ lesson, onComplete, lang }: Props) => {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Load existing notes
  useEffect(() => {
    if (!user) return;
    supabase
      .from("course_notebooks")
      .select("content")
      .eq("user_id", user.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.content) setText(data.content);
      });
  }, [user, lesson.id]);

  // Autosave debounce
  useEffect(() => {
    if (!user || !text) return;
    setSaved(false);
    const t = setTimeout(async () => {
      await supabase.from("course_notebooks").upsert(
        { user_id: user.id, lesson_id: lesson.id, content: text, updated_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" }
      );
      setSaved(true);
    }, 1500);
    return () => clearTimeout(t);
  }, [text, user, lesson.id]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          📓 {lang === "uk" ? "Записуй ключові думки та слова" : "Записывай ключевые мысли и слова"}
        </p>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={lang === "uk" ? "Твої нотатки..." : "Твои заметки..."}
        className="min-h-[300px] bg-muted/20 border-border/30 text-sm"
      />

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground">
          {saved ? (
            <span className="flex items-center gap-1 text-primary">
              <Save className="w-3 h-3" /> {lang === "uk" ? "Збережено" : "Сохранено"}
            </span>
          ) : (
            lang === "uk" ? "Автозбереження..." : "Автосохранение..."
          )}
        </span>

        {!completed ? (
          <Button onClick={() => { setCompleted(true); onComplete(); }} variant="outline" size="sm" className="text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            {lang === "uk" ? "Позначити як завершене" : "Отметить как завершённое"}
          </Button>
        ) : (
          <span className="text-xs text-primary font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> {lang === "uk" ? "Завершено" : "Завершено"}
          </span>
        )}
      </div>
    </div>
  );
};

export default NotebookLesson;
