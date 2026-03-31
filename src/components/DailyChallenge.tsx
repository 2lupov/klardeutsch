import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Check, X } from "lucide-react";

interface WordOfDay {
  german: string;
  russian: string;
  article: string | null;
  example: string | null;
}

interface MiniQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
}

// Simple date-based seed for deterministic daily pick
const dateSeed = () => {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
};

const DailyChallenge = () => {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [word, setWord] = useState<WordOfDay | null>(null);
  const [question, setQuestion] = useState<MiniQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [wordFlipped, setWordFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);

  const todayKey = useMemo(() => `daily_${dateSeed()}`, []);

  useEffect(() => {
    const done = localStorage.getItem(todayKey);
    if (done) setCompleted(true);
    fetchDaily();
  }, []);

  const fetchDaily = async () => {
    setLoading(true);
    const seed = dateSeed();

    // Get user's level
    let userLevel = "A1";
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("recommended_level")
        .eq("user_id", user.id)
        .single();
      if ((profile as any)?.recommended_level) userLevel = (profile as any).recommended_level;
    }

    const [{ data: words }, { data: questions }] = await Promise.all([
      supabase.from("vocab_cards").select("german, russian, ukrainian, article, example").eq("level", userLevel).order("id"),
      supabase.from("grammar_questions").select("question, options, correct_index, explanation").eq("level", userLevel).order("id"),
    ]);

    if (words && words.length > 0) {
      setWord(words[seed % words.length] as WordOfDay);
    }
    if (questions && questions.length > 0) {
      setQuestion(questions[(seed + 7) % questions.length] as MiniQuestion);
    }
    setLoading(false);
  };

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    if (question && idx === question.correct_index) {
      localStorage.setItem(todayKey, "1");
      setTimeout(() => setCompleted(true), 1500);
    }
  };

  if (loading) return null;
  if (completed && !word) return null;

  return (
    <div className="w-full animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="font-display text-sm font-semibold text-foreground">{t("dailyChallenge")}</h2>
      </div>

      <div className="flex flex-col gap-2.5">
        {/* Word of the day */}
        {word && (
          <div
            className="glass-card p-4 cursor-pointer transition-all hover:border-primary/30"
            onClick={() => setWordFlipped(!wordFlipped)}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{t("wordOfDay")}</p>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-1.5">
                  {word.article && (
                    <span className="text-xs text-primary font-medium">{word.article}</span>
                  )}
                  <span className="font-display font-bold text-lg text-foreground">
                    {word.article && word.german.toLowerCase().startsWith(word.article.toLowerCase())
                      ? word.german.slice(word.article.length).trim()
                      : word.german}
                  </span>
                </div>
                {wordFlipped ? (
                  <p className="text-sm text-primary mt-1 animate-slide-up">{(word as any).ukrainian && lang === "uk" ? (word as any).ukrainian : word.russian}</p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">{t("tapToFlip")}</p>
                )}
              </div>
              {wordFlipped && word.example && (
                <p className="text-xs text-muted-foreground italic max-w-[45%] text-right">"{word.example}"</p>
              )}
            </div>
          </div>
        )}

        {/* Mini quiz */}
        {question && !completed && (
          <div className="glass-card p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{t("miniQuiz")}</p>
            <p className="text-sm font-display font-semibold text-foreground mb-3">{question.question}</p>
            <div className="grid grid-cols-2 gap-2">
              {question.options.map((opt, idx) => {
                const isSelected = selectedAnswer === idx;
                const isCorrect = idx === question.correct_index;
                const showResult = selectedAnswer !== null;

                let btnClass = "px-3 py-2 rounded-lg border text-sm text-left transition-all ";
                if (showResult && isCorrect) {
                  btnClass += "border-success/50 bg-success/10 text-foreground";
                } else if (showResult && isSelected && !isCorrect) {
                  btnClass += "border-destructive/50 bg-destructive/10 text-foreground";
                } else if (!showResult) {
                  btnClass += "border-border bg-secondary hover:border-primary/30 hover:bg-primary/5 text-foreground";
                } else {
                  btnClass += "border-border bg-secondary/50 text-muted-foreground";
                }

                return (
                  <button key={idx} onClick={() => handleAnswer(idx)} className={btnClass} disabled={selectedAnswer !== null}>
                    <div className="flex items-center gap-2">
                      {showResult && isCorrect && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
                      {showResult && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                      <span className="truncate">{opt}</span>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedAnswer !== null && question.explanation && (
              <p className="text-xs text-muted-foreground mt-2 animate-slide-up">{question.explanation}</p>
            )}
          </div>
        )}

        {/* Completed state */}
        {completed && (
          <div className="glass-card p-3 flex items-center gap-3 border-primary/20 bg-primary/5">
            <Check className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-foreground font-medium">{t("dailyComplete")}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyChallenge;
