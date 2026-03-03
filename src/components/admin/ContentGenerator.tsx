import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Sparkles, Loader2, Check, BookOpen, Languages, BookText, Headphones, Save, X, FileText } from "lucide-react";
import { toast } from "sonner";

type Level = "A1" | "A2" | "B1" | "B2" | "C1";
type ExerciseType = "vocab" | "grammar" | "reading" | "listening";

interface GeneratedExercises {
  vocab_cards?: Array<{ german: string; russian: string; article?: string; example?: string; topic?: string }>;
  grammar_questions?: Array<{ question: string; options: string[]; correct_index: number; explanation?: string; topic?: string }>;
  reading_text?: { title: string; text: string; topic?: string; questions: Array<{ question: string; options: string[]; correct_index: number; explanation?: string }> };
  listening_text?: { title: string; text: string; topic?: string; questions: Array<{ question: string; options: string[]; correct_index: number; explanation?: string }> };
}

const TYPE_CONFIG: { key: ExerciseType; icon: React.ElementType; label: string }[] = [
  { key: "vocab", icon: BookOpen, label: "Словарь" },
  { key: "grammar", icon: Languages, label: "Грамматика" },
  { key: "reading", icon: BookText, label: "Чтение" },
  { key: "listening", icon: Headphones, label: "Аудирование" },
];

const ContentGenerator = ({ level }: { level: Level }) => {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [types, setTypes] = useState<ExerciseType[]>(["vocab", "grammar", "reading", "listening"]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GeneratedExercises | null>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
      const text = await file.text();
      setContent(text);
    } else {
      // For other formats, read as text and hope for the best
      try {
        const text = await file.text();
        setContent(text);
      } catch {
        toast.error("Не удалось прочитать файл. Используйте .txt формат.");
      }
    }
  };

  const toggleType = (t: ExerciseType) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const generate = async () => {
    if (!content.trim()) {
      toast.error("Загрузите файл или вставьте текст");
      return;
    }
    if (types.length === 0) {
      toast.error("Выберите хотя бы один тип заданий");
      return;
    }

    setGenerating(true);
    setResult(null);

    const { data, error } = await supabase.functions.invoke("generate-exercises", {
      body: { content: content.trim(), level, types },
    });

    if (error) {
      toast.error("Ошибка: " + error.message);
    } else if (data?.error) {
      toast.error(data.error);
    } else if (data?.exercises) {
      setResult(data.exercises);
      toast.success("Задания сгенерированы! Проверьте и сохраните.");
    }
    setGenerating(false);
  };

  const saveAll = async () => {
    if (!result) return;
    setSaving(true);
    let saved = 0;

    try {
      // Save vocab cards
      if (result.vocab_cards?.length) {
        const cards = result.vocab_cards.map((c, i) => ({
          german: c.german,
          russian: c.russian,
          article: c.article || null,
          example: c.example || null,
          topic: c.topic || "Allgemein",
          level,
          sort_order: i,
        }));
        const { error } = await supabase.from("vocab_cards").insert(cards);
        if (error) throw error;
        saved += cards.length;
      }

      // Save grammar questions
      if (result.grammar_questions?.length) {
        const qs = result.grammar_questions.map((q, i) => ({
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation || null,
          topic: q.topic || "Allgemein",
          level,
          sort_order: i,
        }));
        const { error } = await supabase.from("grammar_questions").insert(qs);
        if (error) throw error;
        saved += qs.length;
      }

      // Save reading text + questions
      if (result.reading_text) {
        const rt = result.reading_text;
        const { data: textData, error: textErr } = await supabase.from("reading_texts").insert({
          title: rt.title,
          text: rt.text,
          topic: rt.topic || "Allgemein",
          level,
        }).select("id").single();
        if (textErr) throw textErr;

        if (rt.questions?.length && textData) {
          const rqs = rt.questions.map((q, i) => ({
            reading_id: textData.id,
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation || null,
            sort_order: i,
          }));
          const { error } = await supabase.from("reading_questions").insert(rqs);
          if (error) throw error;
        }
        saved += 1 + (rt.questions?.length || 0);
      }

      // Save listening text + questions
      if (result.listening_text) {
        const lt = result.listening_text;
        const { data: textData, error: textErr } = await supabase.from("listening_texts").insert({
          title: lt.title,
          text: lt.text,
          topic: lt.topic || "Allgemein",
          level,
        }).select("id").single();
        if (textErr) throw textErr;

        if (lt.questions?.length && textData) {
          const lqs = lt.questions.map((q, i) => ({
            listening_id: textData.id,
            question: q.question,
            options: q.options,
            correct_index: q.correct_index,
            explanation: q.explanation || null,
            sort_order: i,
          }));
          const { error } = await supabase.from("listening_questions").insert(lqs);
          if (error) throw error;
        }
        saved += 1 + (lt.questions?.length || 0);
      }

      toast.success(`Сохранено ${saved} элементов в базу данных!`);
      setResult(null);
      setContent("");
      setFileName("");
    } catch (err: any) {
      toast.error("Ошибка сохранения: " + err.message);
    }
    setSaving(false);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* File upload */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          ИИ-генератор заданий ({level})
        </h3>

        <div className="flex flex-col gap-2">
          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all cursor-pointer">
            <Upload className="w-4 h-4" />
            {fileName || "Загрузить файл (.txt, .md, .csv)"}
            <input type="file" className="hidden" accept=".txt,.md,.csv,.text" onChange={handleFile} />
          </label>

          <div className="relative">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Или вставьте текст сюда..."
              rows={6}
              className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y"
            />
            {content && (
              <button onClick={() => { setContent(""); setFileName(""); }} className="absolute top-2 right-2 p-1 rounded bg-secondary hover:bg-muted transition-colors">
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {content && (
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {content.length.toLocaleString()} символов
            </p>
          )}
        </div>

        {/* Type selector */}
        <div className="flex gap-2 flex-wrap">
          {TYPE_CONFIG.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => toggleType(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                types.includes(key)
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "bg-secondary text-muted-foreground border border-border hover:border-primary/20"
              }`}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={generate}
          disabled={generating || !content.trim() || types.length === 0}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all disabled:opacity-40"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Генерация... (может занять 30 сек)
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Сгенерировать задания
            </>
          )}
        </button>
      </div>

      {/* Results preview */}
      {result && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-display font-semibold text-foreground">📋 Предпросмотр</h3>

          {/* Vocab preview */}
          {result.vocab_cards && result.vocab_cards.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3 h-3" /> Словарь ({result.vocab_cards.length} слов)
              </p>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                {result.vocab_cards.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1 border-b border-border/50 last:border-0">
                    {c.article && <span className="text-primary text-xs font-medium">{c.article}</span>}
                    <span className="font-semibold text-foreground">{c.german}</span>
                    <span className="text-muted-foreground">—</span>
                    <span className="text-foreground">{c.russian}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Grammar preview */}
          {result.grammar_questions && result.grammar_questions.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Languages className="w-3 h-3" /> Грамматика ({result.grammar_questions.length} вопросов)
              </p>
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
                {result.grammar_questions.map((q, i) => (
                  <div key={i} className="text-sm py-1 border-b border-border/50 last:border-0">
                    <p className="font-medium text-foreground">{i + 1}. {q.question}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {q.options.map((o, j) => (
                        <span key={j} className={`px-2 py-0.5 rounded text-xs ${j === q.correct_index ? "bg-primary/15 text-primary font-semibold" : "bg-secondary text-muted-foreground"}`}>
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reading preview */}
          {result.reading_text && (
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <BookText className="w-3 h-3" /> Чтение
              </p>
              <p className="font-semibold text-foreground text-sm">{result.reading_text.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{result.reading_text.text}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{result.reading_text.questions?.length || 0} вопросов</p>
            </div>
          )}

          {/* Listening preview */}
          {result.listening_text && (
            <div className="glass-card p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Headphones className="w-3 h-3" /> Аудирование
              </p>
              <p className="font-semibold text-foreground text-sm">{result.listening_text.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{result.listening_text.text}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{result.listening_text.questions?.length || 0} вопросов</p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={saveAll}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all disabled:opacity-40"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Сохранение...</>
            ) : (
              <><Save className="w-4 h-4" /> Сохранить всё в базу</>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ContentGenerator;
