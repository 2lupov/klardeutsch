import { useState, useCallback } from "react";
import { ArrowLeft, Send, RefreshCw, Loader2 } from "lucide-react";
import { Level } from "@/data/lessons";
import { usePlatform } from "@/hooks/usePlatform";
import { useLanguage } from "@/contexts/LanguageContext";
import ReactMarkdown from "react-markdown";

interface WritingExerciseProps {
  level: Level;
  onComplete: () => void;
  onBack: () => void;
}

const TASKS: Record<string, { emoji: string; task_ru: string; task_de: string }[]> = {
  A1: [
    { emoji: "👋", task_ru: "Представься: как тебя зовут, откуда ты, чем занимаешься (3-5 предложений)", task_de: "Stell dich vor: Name, Herkunft, Beruf" },
    { emoji: "🏠", task_ru: "Опиши свою комнату или квартиру (3-5 предложений)", task_de: "Beschreibe dein Zimmer oder deine Wohnung" },
    { emoji: "🍽️", task_ru: "Напиши, что ты ешь на завтрак, обед и ужин (3-5 предложений)", task_de: "Was isst du zum Frühstück, Mittag und Abendessen?" },
    { emoji: "👨‍👩‍👧", task_ru: "Расскажи о своей семье: кто в ней и чем они занимаются (3-5 предложений)", task_de: "Erzähl von deiner Familie" },
    { emoji: "📅", task_ru: "Опиши свой обычный день (3-5 предложений)", task_de: "Beschreibe deinen normalen Tag" },
  ],
  A2: [
    { emoji: "✈️", task_ru: "Напиши о своём последнем путешествии или отпуске (5-7 предложений)", task_de: "Schreibe über deine letzte Reise" },
    { emoji: "🎉", task_ru: "Опиши праздник, который тебе нравится, и как ты его отмечаешь (5-7 предложений)", task_de: "Beschreibe ein Fest, das du magst" },
    { emoji: "📧", task_ru: "Напиши письмо другу с приглашением на вечеринку (5-7 предложений)", task_de: "Schreibe eine Einladung zu einer Party" },
    { emoji: "🛒", task_ru: "Опиши свой поход в магазин: что купил и почему (5-7 предложений)", task_de: "Erzähl vom Einkaufen" },
    { emoji: "🏥", task_ru: "Напиши, что ты делаешь, когда болеешь (5-7 предложений)", task_de: "Was machst du, wenn du krank bist?" },
  ],
  B1: [
    { emoji: "💼", task_ru: "Напиши мотивационное письмо для работы в Германии (8-10 предложений)", task_de: "Schreibe ein Motivationsschreiben" },
    { emoji: "🌍", task_ru: "Какие преимущества и недостатки жизни в большом городе? (8-10 предложений)", task_de: "Vor- und Nachteile des Lebens in der Großstadt" },
    { emoji: "📱", task_ru: "Как социальные сети влияют на нашу жизнь? Выскажи своё мнение (8-10 предложений)", task_de: "Wie beeinflussen soziale Medien unser Leben?" },
    { emoji: "🎓", task_ru: "Опиши систему образования в своей стране и сравни с немецкой (8-10 предложений)", task_de: "Vergleiche das Bildungssystem" },
  ],
  B2: [
    { emoji: "🤖", task_ru: "Должен ли искусственный интеллект заменить учителей? Аргументируй (10-12 предложений)", task_de: "Soll KI Lehrer ersetzen?" },
    { emoji: "🌱", task_ru: "Что каждый из нас может сделать для защиты окружающей среды? (10-12 предложений)", task_de: "Was kann jeder für die Umwelt tun?" },
    { emoji: "📰", task_ru: "Напиши статью для блога о культурных различиях между Германией и твоей страной (10-12 предложений)", task_de: "Kulturelle Unterschiede — ein Blogartikel" },
  ],
  C1: [
    { emoji: "⚖️", task_ru: "Напиши эссе: стоит ли вводить безусловный базовый доход? (12-15 предложений)", task_de: "Essay: Bedingungsloses Grundeinkommen?" },
    { emoji: "🏛️", task_ru: "Проанализируй роль Германии в Европейском союзе (12-15 предложений)", task_de: "Die Rolle Deutschlands in der EU" },
    { emoji: "📝", task_ru: "Напиши рецензию на книгу или фильм на немецком языке (12-15 предложений)", task_de: "Schreibe eine Rezension" },
  ],
};

const WritingExercise = ({ level, onComplete, onBack }: WritingExerciseProps) => {
  const { isMobile } = usePlatform();
  const { lang } = useLanguage();
  const tasks = TASKS[level] || TASKS["A1"];

  const [taskIndex, setTaskIndex] = useState(() => Math.floor(Math.random() * tasks.length));
  const [text, setText] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  const currentTask = tasks[taskIndex];

  const shuffleTask = () => {
    let next: number;
    do { next = Math.floor(Math.random() * tasks.length); } while (next === taskIndex && tasks.length > 1);
    setTaskIndex(next);
    setText("");
    setFeedback("");
    setChecked(false);
  };

  const handleSubmit = useCallback(async () => {
    if (!text.trim() || isChecking) return;
    setIsChecking(true);
    setFeedback("");

    try {
      const { fetchEdgeFunction } = await import("@/lib/auth-fetch");
      const resp = await fetchEdgeFunction("check-writing", {
        json: {
            text: text.trim(),
            task: `${currentTask.task_de} — ${currentTask.task_ru}`,
            level,
            lang,
        },
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Unknown error" }));
        setFeedback(`❌ Ошибка: ${err.error || resp.statusText}`);
        setIsChecking(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              result += content;
              setFeedback(result);
            }
          } catch { /* partial */ }
        }
      }

      setChecked(true);
    } catch (e) {
      console.error("check-writing error:", e);
      setFeedback("❌ Не удалось проверить текст. Попробуйте ещё раз.");
    } finally {
      setIsChecking(false);
    }
  }, [text, currentTask, level, isChecking]);

  const minLength = level === "A1" || level === "A2" ? 20 : 40;

  return (
    <div className={`w-full mx-auto px-4 py-6 flex flex-col gap-4 animate-slide-up ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад
      </button>

      {/* Task card */}
      <div className="glass-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{currentTask.emoji}</span>
              <span className="text-xs font-display font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Schreiben · {level}
              </span>
            </div>
            <p className="font-display font-bold text-sm text-foreground">{currentTask.task_de}</p>
            <p className="text-xs text-muted-foreground mt-1">{currentTask.task_ru}</p>
          </div>
          <button
            onClick={shuffleTask}
            className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            title="Другое задание"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Text input */}
      <div className="glass-card p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Schreibe hier deinen Text auf Deutsch..."
          className="w-full bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted-foreground/50 font-body text-sm min-h-[150px]"
          disabled={isChecking}
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
          <span className={`text-[11px] ${text.trim().length >= minLength ? "text-primary" : "text-muted-foreground"}`}>
            {text.trim().length} символов {text.trim().length < minLength && `(мин. ${minLength})`}
          </span>
          <button
            onClick={handleSubmit}
            disabled={text.trim().length < minLength || isChecking}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Проверяю...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Проверить
              </>
            )}
          </button>
        </div>
      </div>

      {/* AI Feedback */}
      {feedback && (
        <div className="glass-card p-5 animate-slide-up">
          <div className="prose prose-invert prose-sm max-w-none [&_h2]:text-primary [&_h2]:font-display [&_h2]:text-base [&_strong]:text-foreground [&_li]:text-sm">
            <ReactMarkdown>{feedback}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Done button */}
      {checked && (
        <div className="flex gap-3 animate-slide-up">
          <button
            onClick={shuffleTask}
            className="flex-1 py-3 rounded-xl border border-border text-foreground font-display font-bold text-sm hover:bg-muted/50 transition-colors"
          >
            🔄 Новое задание
          </button>
          <button
            onClick={onComplete}
            className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors"
          >
            ✅ Готово
          </button>
        </div>
      )}
    </div>
  );
};

export default WritingExercise;
