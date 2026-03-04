
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Save, BookOpen, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LessonNotebookProps {
  lessonId: string;
  lang: string;
  theory?: string;
  exercises?: any;
}

const LessonNotebook = ({ lessonId, lang, theory, exercises }: LessonNotebookProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("course_notes")
      .select("content")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setContent(data.content);
        setLoaded(true);
      });
  }, [user, lessonId]);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("course_notes")
      .upsert({ user_id: user.id, lesson_id: lessonId, content, updated_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
    setSaving(false);
    if (error) {
      toast.error(lang === "uk" ? "Помилка збереження" : "Ошибка сохранения");
    } else {
      setLastSaved(new Date());
      toast.success(lang === "uk" ? "Збережено ✓" : "Сохранено ✓");
    }
  }, [user, lessonId, content, lang]);

  // Auto-save on blur
  const handleBlur = () => {
    if (content.trim()) save();
  };

  const insertSnippet = (text: string) => {
    setContent(prev => prev + (prev ? "\n\n" : "") + text);
  };

  const addTheorySnippet = () => {
    if (theory) {
      const snippet = theory.length > 300 ? theory.slice(0, 300) + "..." : theory;
      insertSnippet(`📖 ${lang === "uk" ? "Теорія" : "Теория"}:\n${snippet}`);
    }
  };

  const addVocabSnippet = () => {
    const vocab = exercises?.vocabulary || exercises?.vocab_cards || [];
    if (vocab.length > 0) {
      const lines = vocab.slice(0, 10).map((v: any) => {
        const de = v.de || v.german || "";
        const tr = lang === "uk" ? (v.ua || v.ukrainian || v.ru || v.russian) : (v.ru || v.russian || "");
        return `• ${de} — ${tr}`;
      }).join("\n");
      insertSnippet(`📚 ${lang === "uk" ? "Словник" : "Словарь"}:\n${lines}`);
    }
  };

  if (!loaded) return null;

  return (
    <div className="animate-slide-up">
      {/* Notebook paper effect */}
      <div className="relative rounded-2xl overflow-hidden border border-primary/20 bg-gradient-to-b from-amber-50/80 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 shadow-lg">
        {/* Spiral binding dots */}
        <div className="absolute left-3 top-0 bottom-0 flex flex-col justify-start pt-14 gap-[18px] z-10">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-primary/20 border border-primary/30" />
          ))}
        </div>

        {/* Header */}
        <div className="px-5 pl-10 pt-4 pb-3 border-b border-primary/10 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-sm text-foreground">
            {lang === "uk" ? "Мій зошит" : "Моя тетрадь"}
          </h3>
          {lastSaved && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {lang === "uk" ? "збережено" : "сохранено"} ✓
            </span>
          )}
        </div>

        {/* Quick insert buttons */}
        <div className="px-5 pl-10 pt-3 flex flex-wrap gap-1.5">
          {theory && (
            <button
              onClick={addTheorySnippet}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              {lang === "uk" ? "Додати теорію" : "Добавить теорию"}
            </button>
          )}
          {((exercises?.vocabulary || exercises?.vocab_cards || []).length > 0) && (
            <button
              onClick={addVocabSnippet}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Sparkles className="w-3 h-3" />
              {lang === "uk" ? "Додати слова" : "Добавить слова"}
            </button>
          )}
        </div>

        {/* Textarea with ruled lines */}
        <div className="px-5 pl-10 pt-2 pb-4 relative">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onBlur={handleBlur}
            placeholder={lang === "uk" ? "Пишіть нотатки тут... ✏️" : "Пишите заметки здесь... ✏️"}
            className={cn(
              "w-full min-h-[200px] bg-transparent resize-y text-sm text-foreground placeholder:text-muted-foreground/50",
              "focus:outline-none leading-[28px]",
              "notebook-lines"
            )}
            style={{
              backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, hsl(var(--primary) / 0.08) 27px, hsl(var(--primary) / 0.08) 28px)",
              backgroundSize: "100% 28px",
              backgroundPositionY: "0px",
            }}
          />
        </div>

        {/* Save button */}
        <div className="px-5 pl-10 pb-4 flex justify-end">
          <button
            onClick={save}
            disabled={saving}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all",
              "bg-primary text-primary-foreground hover:brightness-110 active:scale-95",
              saving && "opacity-60 pointer-events-none"
            )}
          >
            <Save className="w-3.5 h-3.5" />
            {saving
              ? (lang === "uk" ? "Зберігаю..." : "Сохраняю...")
              : (lang === "uk" ? "Зберегти" : "Сохранить")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LessonNotebook;
