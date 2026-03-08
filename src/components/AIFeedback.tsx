import { useState, useCallback } from "react";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import { Brain, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/contexts/LanguageContext";

export interface MistakeData {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  explanation?: string;
}

interface AIFeedbackProps {
  mistakes: MistakeData[];
  level: string;
  category: string;
  onClose: () => void;
}

const AIFeedback = ({ mistakes, level, category, onClose }: AIFeedbackProps) => {
  const { t, lang } = useLanguage();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    setStarted(true);
    setLoading(true);
    setError(null);
    setContent("");

    try {
      const resp = await fetchEdgeFunction("analyze-mistakes", {
        json: { mistakes, level, category, lang },
      });

      if (!resp.ok || !resp.body) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || "AI request failed");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              result += delta;
              setContent(result);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [mistakes, level, category]);

  if (mistakes.length === 0) return null;

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-display font-bold text-sm">{t("aiAnalysis")}</h3>
        </div>
        <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {!started ? (
        <button
          onClick={analyze}
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm transition-all hover:opacity-90"
        >
          <Sparkles className="w-4 h-4" />
          {t("analyzeMyMistakes")} ({mistakes.length})
        </button>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="prose prose-invert prose-sm max-w-none [&_h2]:text-primary [&_h3]:text-primary [&_strong]:text-foreground [&_li]:text-foreground/90">
          <ReactMarkdown>{content || (loading ? "..." : "")}</ReactMarkdown>
          {loading && <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />}
        </div>
      )}
    </div>
  );
};

export default AIFeedback;
