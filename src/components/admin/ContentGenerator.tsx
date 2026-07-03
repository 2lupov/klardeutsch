import { useState } from "react";
import BulkGenerator from "./BulkGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useTargetLanguage } from "@/contexts/TargetLanguageContext";
import { 
  Sparkles, Loader2, BookOpen, Languages, BookText, Headphones, 
  Save, X, Copy, Check, Upload, FileJson, Wand2, ArrowRight, Zap
} from "lucide-react";
import { toast } from "sonner";

type Level = "A1" | "A2" | "B1" | "B2" | "C1";
type ExerciseType = "vocab" | "grammar" | "reading" | "listening";
type Mode = "prompt" | "import" | "bulk";

interface GeneratedExercises {
  vocab_cards?: Array<{ german: string; russian: string; article?: string; example?: string; topic?: string }>;
  grammar_questions?: Array<{ question: string; options: string[]; correct_index: number; explanation?: string; topic?: string }>;
  reading_text?: { title: string; text: string; topic?: string; questions: Array<{ question: string; options: string[]; correct_index: number; explanation?: string }> };
  listening_text?: { title: string; text: string; topic?: string; questions: Array<{ question: string; options: string[]; correct_index: number; explanation?: string }> };
}

const TYPE_CONFIG: { key: ExerciseType; icon: React.ElementType; label: string; labelDe: string }[] = [
  { key: "vocab", icon: BookOpen, label: "Словник", labelDe: "Wortschatz" },
  { key: "grammar", icon: Languages, label: "Граматика", labelDe: "Grammatik" },
  { key: "reading", icon: BookText, label: "Читання", labelDe: "Lesen" },
  { key: "listening", icon: Headphones, label: "Аудіювання", labelDe: "Hören" },
];

function buildPrompt(topic: string, level: Level, types: ExerciseType[]): string {
  const parts: string[] = [];

  parts.push(`Ти — експерт з німецької мови (DaF). Створи навчальний контент для рівня ${level} CEFR на тему "${topic}".`);
  parts.push("");
  parts.push("ВАЖЛИВО: Поверни ТІЛЬКИ валідний JSON без markdown-обгорток, без \`\`\`json, просто чистий JSON-об'єкт.");
  parts.push("");
  parts.push("Формат відповіді — JSON-об'єкт з такими полями:");
  parts.push("");

  if (types.includes("vocab")) {
    parts.push(`"vocab_cards": масив із 15-25 слів. Кожен елемент:`);
    parts.push(`  {`);
    parts.push(`    "german": "німецьке слово",`);
    parts.push(`    "russian": "переклад українською",`);
    parts.push(`    "article": "der/die/das (якщо іменник, інакше null)",`);
    parts.push(`    "example": "приклад речення німецькою",`);
    parts.push(`    "topic": "${topic}"`);
    parts.push(`  }`);
    parts.push(`  Вимоги:`);
    parts.push(`  - Слова мають відповідати рівню ${level}`);
    parts.push(`  - Додай іменники, дієслова, прикметники та корисні фрази`);
    parts.push(`  - Приклади речень — прості та практичні`);
    parts.push(`  - Артикль ОБОВ'ЯЗКОВИЙ для іменників`);
    parts.push("");
  }

  if (types.includes("grammar")) {
    parts.push(`"grammar_questions": масив із 8-12 питань. Кожен елемент:`);
    parts.push(`  {`);
    parts.push(`    "question": "питання з пропуском ___ німецькою",`);
    parts.push(`    "options": ["варіант1", "варіант2", "варіант3", "варіант4"],`);
    parts.push(`    "correct_index": 0,  // індекс правильної відповіді (0-3)`);
    parts.push(`    "explanation": "пояснення правила українською",`);
    parts.push(`    "topic": "${topic}"`);
    parts.push(`  }`);
    parts.push(`  Вимоги:`);
    parts.push(`  - Граматика рівня ${level} (${level === "A1" ? "артиклі, дієвідмінювання, порядок слів" : level === "A2" ? "модальні дієслова, Perfekt, прийменники" : level === "B1" ? "Konjunktiv II, пасив, непряма мова" : level === "B2" ? "складні конструкції, Partizip, Nominalisierung" : "стилістика, ідіоми, складний синтаксис"})`);
    parts.push(`  - Завжди 4 варіанти відповіді`);
    parts.push(`  - correct_index — числовий індекс (0, 1, 2 або 3)`);
    parts.push("");
  }

  if (types.includes("reading")) {
    parts.push(`"reading_text": об'єкт із текстом для читання:`);
    parts.push(`  {`);
    parts.push(`    "title": "назва тексту німецькою",`);
    parts.push(`    "text": "текст німецькою (${level === "A1" ? "80-120" : level === "A2" ? "120-180" : level === "B1" ? "180-250" : "250-400"} слів)",`);
    parts.push(`    "topic": "${topic}",`);
    parts.push(`    "questions": [`);
    parts.push(`      {`);
    parts.push(`        "question": "питання за текстом німецькою",`);
    parts.push(`        "options": ["варіант1", "варіант2", "варіант3", "варіант4"],`);
    parts.push(`        "correct_index": 0,`);
    parts.push(`        "explanation": "пояснення українською"`);
    parts.push(`      }`);
    parts.push(`    ]  // 4-6 питань`);
    parts.push(`  }`);
    parts.push(`  Вимоги:`);
    parts.push(`  - Текст має бути природним і цікавим`);
    parts.push(`  - Питання перевіряють розуміння, а не знання слів`);
    parts.push("");
  }

  if (types.includes("listening")) {
    parts.push(`"listening_text": об'єкт для аудіювання (формат ідентичний reading_text):`);
    parts.push(`  {`);
    parts.push(`    "title": "назва",`);
    parts.push(`    "text": "діалог або монолог німецькою (${level === "A1" ? "60-100" : level === "A2" ? "100-150" : level === "B1" ? "150-200" : "200-300"} слів)",`);
    parts.push(`    "topic": "${topic}",`);
    parts.push(`    "questions": [... 4-6 питань, формат як у reading]`);
    parts.push(`  }`);
    parts.push(`  Вимоги:`);
    parts.push(`  - Текст має звучати як розмовна мова / реальний діалог`);
    parts.push(`  - Використовуй побутові ситуації за темою`);
    parts.push("");
  }

  parts.push("Приклад структури JSON:");
  parts.push("{");
  if (types.includes("vocab")) parts.push('  "vocab_cards": [...],');
  if (types.includes("grammar")) parts.push('  "grammar_questions": [...],');
  if (types.includes("reading")) parts.push('  "reading_text": {...},');
  if (types.includes("listening")) parts.push('  "listening_text": {...}');
  parts.push("}");

  return parts.join("\n");
}

const TOPIC_SUGGESTIONS: Record<Level, string[]> = {
  A1: ["Familie und Freunde", "Essen und Trinken", "Einkaufen", "Mein Tag", "Wohnung und Möbel", "Hobbys", "Farben und Kleidung", "Im Restaurant", "Zahlen und Uhrzeit", "Tiere"],
  A2: ["Reisen und Urlaub", "Gesundheit und Körper", "Arbeit und Beruf", "Wetter und Jahreszeiten", "Stadt und Verkehr", "Feste und Feiertage", "Medien und Internet", "Sport und Fitness"],
  B1: ["Umwelt und Natur", "Bildung und Schule", "Kultur und Kunst", "Wohnen in Deutschland", "Beziehungen", "Ernährung und Kochen", "Technologie", "Migration und Integration"],
  B2: ["Politik und Gesellschaft", "Wissenschaft und Forschung", "Wirtschaft und Finanzen", "Psychologie", "Nachhaltigkeit", "Digitalisierung", "Literatur und Philosophie"],
  C1: ["Globalisierung", "Ethik und Moral", "Medienlandschaft", "Arbeitsmarkt der Zukunft", "Kulturelle Identität", "Klimawandel"],
};

const ContentGenerator = ({ level }: { level: Level }) => {
  const { targetLang } = useTargetLanguage();
  const [mode, setMode] = useState<Mode>("prompt");
  const [topic, setTopic] = useState("");
  const [types, setTypes] = useState<ExerciseType[]>(["vocab", "grammar", "reading", "listening"]);
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Import mode
  const [jsonInput, setJsonInput] = useState("");
  const [fileName, setFileName] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GeneratedExercises | null>(null);

  const toggleType = (t: ExerciseType) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const generatePrompt = () => {
    if (!topic.trim()) {
      toast.error("Введіть тему");
      return;
    }
    if (types.length === 0) {
      toast.error("Оберіть хоча б один тип завдань");
      return;
    }
    const prompt = buildPrompt(topic.trim(), level, types);
    setGeneratedPrompt(prompt);
    toast.success("Промпт створено! Скопіюйте та вставте в Claude.");
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success("Промпт скопійовано!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      setJsonInput(text);
    } catch {
      toast.error("Не вдалося прочитати файл");
    }
  };

  const parseAndPreview = () => {
    if (!jsonInput.trim()) {
      toast.error("Вставте JSON або завантажте файл");
      return;
    }
    try {
      // Clean up potential markdown wrappers
      let clean = jsonInput.trim();
      if (clean.startsWith("```json")) clean = clean.slice(7);
      if (clean.startsWith("```")) clean = clean.slice(3);
      if (clean.endsWith("```")) clean = clean.slice(0, -3);
      clean = clean.trim();
      
      const parsed = JSON.parse(clean) as GeneratedExercises;
      
      // Validate structure
      const hasContent = parsed.vocab_cards?.length || parsed.grammar_questions?.length || parsed.reading_text || parsed.listening_text;
      if (!hasContent) {
        toast.error("JSON не містить завдань. Перевірте формат.");
        return;
      }
      
      setResult(parsed);
      toast.success("JSON розпізнано! Перевірте та збережіть.");
    } catch (err: any) {
      toast.error("Невалідний JSON: " + err.message);
    }
  };

  const saveAll = async () => {
    if (!result) return;
    setSaving(true);
    let saved = 0;

    try {
      if (result.vocab_cards?.length) {
        const cards = result.vocab_cards.map((c, i) => ({
          german: c.german,
          russian: c.russian,
          article: c.article || null,
          example: c.example || null,
          topic: c.topic || topic || "Allgemein",
          level,
          target_language: targetLang,
          sort_order: i,
        }));
        const { error } = await supabase.from("vocab_cards").insert(cards);
        if (error) throw error;
        saved += cards.length;
      }

      if (result.grammar_questions?.length) {
        const qs = result.grammar_questions.map((q, i) => ({
          question: q.question,
          options: q.options,
          correct_index: q.correct_index,
          explanation: q.explanation || null,
          topic: q.topic || topic || "Allgemein",
          level,
          target_language: targetLang,
          sort_order: i,
        }));
        const { error } = await supabase.from("grammar_questions").insert(qs);
        if (error) throw error;
        saved += qs.length;
      }

      if (result.reading_text) {
        const rt = result.reading_text;
        const { data: textData, error: textErr } = await supabase.from("reading_texts").insert({
          title: rt.title,
          text: rt.text,
          topic: rt.topic || topic || "Allgemein",
          level,
          target_language: targetLang,
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

      if (result.listening_text) {
        const lt = result.listening_text;
        const { data: textData, error: textErr } = await supabase.from("listening_texts").insert({
          title: lt.title,
          text: lt.text,
          topic: lt.topic || topic || "Allgemein",
          level,
          target_language: targetLang,
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

      toast.success(`✅ Збережено ${saved} елементів у базу!`);
      setResult(null);
      setJsonInput("");
      setFileName("");
    } catch (err: any) {
      toast.error("Помилка збереження: " + err.message);
    }
    setSaving(false);
  };

  const suggestions = TOPIC_SUGGESTIONS[level] || [];

  return (
    <div className="flex flex-col gap-4">
      {/* Mode tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("prompt")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-display font-bold transition-all ${
            mode === "prompt"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-secondary text-muted-foreground border border-border hover:text-foreground"
          }`}
        >
          <Wand2 className="w-4 h-4" />
          Промпт
        </button>
        <button
          onClick={() => setMode("import")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-display font-bold transition-all ${
            mode === "import"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-secondary text-muted-foreground border border-border hover:text-foreground"
          }`}
        >
          <FileJson className="w-4 h-4" />
          Імпорт
        </button>
        <button
          onClick={() => setMode("bulk")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-display font-bold transition-all ${
            mode === "bulk"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-secondary text-muted-foreground border border-border hover:text-foreground"
          }`}
        >
          <Zap className="w-4 h-4" />
          Масова
        </button>
      </div>

      {mode === "prompt" && (
        <div className="flex flex-col gap-4">
          {/* Topic input */}
          <div className="glass-card p-4 flex flex-col gap-3">
            <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Генератор промпта ({level})
            </h3>

            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Введіть тему, наприклад: Essen und Trinken"
              className="w-full px-3 py-2.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none placeholder:text-muted-foreground"
            />

            {/* Topic suggestions */}
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setTopic(s)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    topic === s
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "bg-secondary/80 text-muted-foreground border border-transparent hover:text-foreground hover:border-border"
                  }`}
                >
                  {s}
                </button>
              ))}
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
              onClick={generatePrompt}
              disabled={!topic.trim() || types.length === 0}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all disabled:opacity-40"
            >
              <Wand2 className="w-4 h-4" />
              Створити промпт для Claude
            </button>
          </div>

          {/* Generated prompt */}
          {generatedPrompt && (
            <div className="glass-card p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-display font-semibold text-foreground">📝 Промпт готовий</h3>
                <button
                  onClick={copyPrompt}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/15 text-primary text-xs font-bold hover:bg-primary/25 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Скопійовано!" : "Копіювати"}
                </button>
              </div>

              <div className="relative">
                <pre className="w-full px-3 py-2.5 rounded-lg bg-secondary/80 text-foreground border border-border text-[11px] leading-relaxed overflow-x-auto max-h-64 overflow-y-auto whitespace-pre-wrap font-mono">
                  {generatedPrompt}
                </pre>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <ArrowRight className="w-4 h-4 text-primary flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-semibold">Наступний крок:</span> Скопіюйте промпт → вставте в Claude → скопіюйте JSON-відповідь → перейдіть на вкладку «Імпорт JSON»
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === "import" && (
        <div className="flex flex-col gap-4">
          <div className="glass-card p-4 flex flex-col gap-3">
            <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <FileJson className="w-4 h-4 text-primary" />
              Імпорт JSON від Claude ({level})
            </h3>

            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all cursor-pointer">
              <Upload className="w-4 h-4" />
              {fileName || "Завантажити .json файл"}
              <input type="file" className="hidden" accept=".json,.txt" onChange={handleJsonFile} />
            </label>

            <div className="relative">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Або вставте JSON від Claude сюди..."
                rows={8}
                className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-xs font-mono focus:border-primary focus:outline-none resize-y"
              />
              {jsonInput && (
                <button onClick={() => { setJsonInput(""); setFileName(""); setResult(null); }} className="absolute top-2 right-2 p-1 rounded bg-secondary hover:bg-muted transition-colors">
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>

            <button
              onClick={parseAndPreview}
              disabled={!jsonInput.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              Розпізнати та переглянути
            </button>
          </div>

          {/* Results preview */}
          {result && (
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-display font-semibold text-foreground">📋 Попередній перегляд</h3>

              {result.vocab_cards && result.vocab_cards.length > 0 && (
                <div className="glass-card p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3 h-3" /> Словник ({result.vocab_cards.length} слів)
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

              {result.grammar_questions && result.grammar_questions.length > 0 && (
                <div className="glass-card p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Languages className="w-3 h-3" /> Граматика ({result.grammar_questions.length} питань)
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

              {result.reading_text && (
                <div className="glass-card p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <BookText className="w-3 h-3" /> Читання
                  </p>
                  <p className="font-semibold text-foreground text-sm">{result.reading_text.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{result.reading_text.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{result.reading_text.questions?.length || 0} питань</p>
                </div>
              )}

              {result.listening_text && (
                <div className="glass-card p-4">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Headphones className="w-3 h-3" /> Аудіювання
                  </p>
                  <p className="font-semibold text-foreground text-sm">{result.listening_text.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{result.listening_text.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{result.listening_text.questions?.length || 0} питань</p>
                </div>
              )}

              <button
                onClick={saveAll}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all disabled:opacity-40"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Збереження...</>
                ) : (
                  <><Save className="w-4 h-4" /> Зберегти все в базу</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "bulk" && <BulkGenerator />}
    </div>
  );
};

export default ContentGenerator;
