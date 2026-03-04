
import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Save, BookOpen, Sparkles, ChevronLeft, ChevronRight, Plus, Highlighter } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface LessonNotebookProps {
  lessonId: string;
  lang: string;
  theory?: string;
  exercises?: any;
}

const LINES_PER_PAGE = 8;
const LINE_HEIGHT = 28;

const LessonNotebook = ({ lessonId, lang, theory, exercises }: LessonNotebookProps) => {
  const { user } = useAuth();
  const [pages, setPages] = useState<string[]>([""]);
  const [currentPage, setCurrentPage] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [highlighterOn, setHighlighterOn] = useState(false);
  const [showTheoryPicker, setShowTheoryPicker] = useState(false);
  const [showVocabPicker, setShowVocabPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse theory into paragraphs
  const theoryParagraphs = theory
    ? theory.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
    : [];

  // Parse vocab
  const vocab: any[] = exercises?.vocabulary || exercises?.vocab_cards || [];

  useEffect(() => {
    if (!user) return;
    supabase
      .from("course_notes")
      .select("content")
      .eq("user_id", user.id)
      .eq("lesson_id", lessonId)
      .maybeSingle()
      .then(({ data }) => {
        if (data && data.content) {
          // Pages separated by \n---PAGE---\n
          const parsed = data.content.split("\n---PAGE---\n");
          setPages(parsed.length > 0 ? parsed : [""]);
        }
        setLoaded(true);
      });
  }, [user, lessonId]);

  const serializePages = useCallback((p: string[]) => p.join("\n---PAGE---\n"), []);

  const save = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    const content = serializePages(pages);
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
  }, [user, lessonId, pages, lang, serializePages]);

  const handleBlur = () => {
    if (pages.some(p => p.trim())) save();
  };

  const updateCurrentPage = (text: string) => {
    setPages(prev => {
      const updated = [...prev];
      updated[currentPage] = text;
      return updated;
    });
  };

  const addPage = () => {
    setPages(prev => [...prev, ""]);
    setCurrentPage(pages.length);
  };

  const insertToCurrentPage = (text: string) => {
    setPages(prev => {
      const updated = [...prev];
      const current = updated[currentPage] || "";
      updated[currentPage] = current + (current ? "\n\n" : "") + text;
      return updated;
    });
  };

  // Yellow highlighter: wrap selected text with 【】markers
  const applyHighlight = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (start === end) return;
    const currentText = pages[currentPage] || "";
    const selected = currentText.slice(start, end);
    const newText = currentText.slice(0, start) + `【${selected}】` + currentText.slice(end);
    updateCurrentPage(newText);
    setHighlighterOn(false);
  };


  if (!loaded) return null;

  const currentContent = pages[currentPage] || "";
  const totalPages = pages.length;

  return (
    <div className="animate-slide-up">
      <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-card shadow-lg">
        {/* Spine accent */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/60 via-primary/30 to-primary/10" />

        {/* Header */}
        <div className="px-5 pl-6 pt-4 pb-3 border-b border-border/30 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-sm text-foreground">
            {lang === "uk" ? "Мій зошит" : "Моя тетрадь"}
          </h3>
          {/* Highlighter toggle */}
          <button
            onClick={() => {
              if (highlighterOn) {
                applyHighlight();
              } else {
                setHighlighterOn(true);
              }
            }}
            className={cn(
              "ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all",
              highlighterOn
                ? "bg-yellow-400/30 text-yellow-700 dark:text-yellow-300 ring-1 ring-yellow-400/50"
                : "bg-secondary text-secondary-foreground hover:bg-yellow-400/20"
            )}
          >
            <Highlighter className="w-3 h-3" />
            {highlighterOn 
              ? (lang === "uk" ? "Виділити" : "Выделить")
              : (lang === "uk" ? "Маркер" : "Маркер")}
          </button>
          {lastSaved && (
            <span className="text-[10px] text-muted-foreground">
              {lang === "uk" ? "збережено" : "сохранено"} ✓
            </span>
          )}
        </div>

        {/* Quick insert buttons */}
        <div className="px-5 pl-6 pt-3 flex flex-wrap gap-1.5 relative">
          {theoryParagraphs.length > 0 && (
            <button
              onClick={() => { setShowTheoryPicker(!showTheoryPicker); setShowVocabPicker(false); }}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors",
                showTheoryPicker ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Sparkles className="w-3 h-3" />
              {lang === "uk" ? "Теорія" : "Теория"}
            </button>
          )}
          {vocab.length > 0 && (
            <button
              onClick={() => { setShowVocabPicker(!showVocabPicker); setShowTheoryPicker(false); }}
              className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors",
                showVocabPicker ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              <Sparkles className="w-3 h-3" />
              {lang === "uk" ? "Слова" : "Слова"}
            </button>
          )}
        </div>

        {/* Theory picker dropdown */}
        {showTheoryPicker && (
          <div className="mx-5 ml-6 mt-2 rounded-xl border border-border/40 bg-secondary/30 p-2 max-h-[180px] overflow-y-auto space-y-1 animate-slide-up">
            <p className="text-[10px] text-muted-foreground px-1 mb-1">
              {lang === "uk" ? "Оберіть фрагмент:" : "Выберите фрагмент:"}
            </p>
            {theoryParagraphs.map((para, i) => (
              <button
                key={i}
                onClick={() => {
                  insertToCurrentPage(`📖 ${para}`);
                  setShowTheoryPicker(false);
                  toast.success(lang === "uk" ? "Додано ✓" : "Добавлено ✓");
                }}
                className="w-full text-left p-2 rounded-lg text-[11px] text-foreground hover:bg-primary/10 transition-colors leading-relaxed line-clamp-2 flex items-start gap-1.5"
              >
                <Plus className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                <span>{para.length > 120 ? para.slice(0, 120) + "..." : para}</span>
              </button>
            ))}
          </div>
        )}

        {/* Vocab picker dropdown */}
        {showVocabPicker && (
          <div className="mx-5 ml-6 mt-2 rounded-xl border border-border/40 bg-secondary/30 p-2 max-h-[180px] overflow-y-auto space-y-0.5 animate-slide-up">
            <p className="text-[10px] text-muted-foreground px-1 mb-1">
              {lang === "uk" ? "Оберіть слова:" : "Выберите слова:"}
            </p>
            {vocab.map((v: any, i: number) => {
              const de = v.de || v.german || "";
              const tr = lang === "uk" ? (v.ua || v.ukrainian || v.ru || v.russian) : (v.ru || v.russian || "");
              return (
                <button
                  key={i}
                  onClick={() => {
                    insertToCurrentPage(`• ${de} — ${tr}`);
                    toast.success(`${de} ✓`);
                  }}
                  className="w-full text-left p-1.5 rounded-lg text-[11px] text-foreground hover:bg-primary/10 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3 h-3 shrink-0 text-primary" />
                  <span className="font-medium">{de}</span>
                  <span className="text-muted-foreground">— {tr}</span>
                </button>
              );
            })}
            <button
              onClick={() => {
                const allLines = vocab.map((v: any) => {
                  const de = v.de || v.german || "";
                  const tr = lang === "uk" ? (v.ua || v.ukrainian || v.ru || v.russian) : (v.ru || v.russian || "");
                  return `• ${de} — ${tr}`;
                }).join("\n");
                insertToCurrentPage(`📚 ${lang === "uk" ? "Словник" : "Словарь"}:\n${allLines}`);
                setShowVocabPicker(false);
                toast.success(lang === "uk" ? "Всі слова додано ✓" : "Все слова добавлены ✓");
              }}
              className="w-full text-center p-1.5 rounded-lg text-[10px] font-semibold text-primary hover:bg-primary/10 transition-colors mt-1 border-t border-border/20 pt-2"
            >
              {lang === "uk" ? "Додати всі" : "Добавить все"}
            </button>
          </div>
        )}

        {/* Textarea */}
        <div className="px-5 pl-6 pt-2 pb-2">
          <textarea
            ref={textareaRef}
            value={currentContent}
            onChange={e => updateCurrentPage(e.target.value)}
            onBlur={handleBlur}
            placeholder={lang === "uk" ? "Пишіть нотатки тут... ✏️" : "Пишите заметки здесь... ✏️"}
            className={cn(
              "w-full bg-transparent resize-none text-sm text-foreground placeholder:text-muted-foreground/40",
              "focus:outline-none leading-[28px] rounded-lg p-2",
              highlighterOn && "selection:bg-yellow-400/40"
            )}
            style={{
              height: `${LINES_PER_PAGE * LINE_HEIGHT + 16}px`,
              backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, hsl(var(--border) / 0.3) 27px, hsl(var(--border) / 0.3) 28px)",
              backgroundSize: "100% 28px",
            }}
          />
        </div>

        {/* Page navigation + Save */}
        <div className="px-5 pl-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-secondary/80 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-medium text-muted-foreground min-w-[50px] text-center">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center text-foreground disabled:opacity-30 hover:bg-secondary/80 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={addPage}
              className="w-7 h-7 rounded-lg bg-secondary/60 flex items-center justify-center text-primary hover:bg-secondary transition-colors"
              title={lang === "uk" ? "Нова сторінка" : "Новая страница"}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

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
