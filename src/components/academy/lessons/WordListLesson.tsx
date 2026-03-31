import { useState, useCallback } from "react";
import { CheckCircle2, Volume2, Star, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Lang } from "@/i18n/translations";

interface Word {
  de: string;
  ru: string;
  uk?: string;
  example_de?: string;
  example_ru?: string;
  audio_url?: string | null;
}

interface WordListContent {
  topic?: string;
  words?: Word[];
}

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: () => void;
  lang: Lang;
}

const WordListLesson = ({ lesson, onComplete, lang }: Props) => {
  const { user } = useAuth();
  const c = (lesson.content as WordListContent) || {};
  const words = c.words ?? [];
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const [flashcardMode, setFlashcardMode] = useState(false);
  const [currentCard, setCurrentCard] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [articleFilter, setArticleFilter] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);

  const toggleSave = useCallback(async (idx: number) => {
    setSaved(prev => {
      const s = new Set(prev);
      s.has(idx) ? s.delete(idx) : s.add(idx);
      return s;
    });
  }, []);

  const filteredWords = articleFilter
    ? words.filter(w => w.de.toLowerCase().startsWith(articleFilter.toLowerCase()))
    : words;

  const articles = ["der", "die", "das"];
  const savedCount = saved.size;
  const threshold = Math.ceil(words.length * 0.5);

  if (flashcardMode) {
    const card = words[currentCard];
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{c.topic || lesson.title}</h2>
          <Button variant="ghost" size="sm" onClick={() => setFlashcardMode(false)} className="text-xs">
            ← {lang === "uk" ? "Список" : "Список"}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">{currentCard + 1}/{words.length}</p>

        <button onClick={() => setFlipped(!flipped)}
          className="w-full min-h-[200px] p-6 rounded-2xl border border-border/30 bg-card/40 flex flex-col items-center justify-center gap-3 transition-all hover:border-primary/30">
          {!flipped ? (
            <>
              <p className="text-2xl font-display font-bold text-foreground">{card?.de}</p>
              <p className="text-xs text-muted-foreground">{lang === "uk" ? "натисніть щоб перевернути" : "нажмите чтобы перевернуть"}</p>
            </>
          ) : (
            <>
              <p className="text-xl text-primary font-semibold">{lang === "uk" ? card?.uk || card?.ru : card?.ru}</p>
              {card?.example_de && <p className="text-xs text-muted-foreground italic">{card.example_de}</p>}
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setCurrentCard(Math.max(0, currentCard - 1)); setFlipped(false); }}
            disabled={currentCard === 0}>←</Button>
          <Button variant="ghost" size="sm" onClick={() => { setCurrentCard(Math.min(words.length - 1, currentCard + 1)); setFlipped(false); }}
            disabled={currentCard === words.length - 1}>→</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">{c.topic || lesson.title}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            {lang === "uk" ? "Додано до словника" : "Добавлено в словарь"}: {savedCount}/{words.length}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setFlashcardMode(true); setCurrentCard(0); setFlipped(false); }}
          className="text-xs gap-1">
          <RotateCcw className="w-3 h-3" />
          {lang === "uk" ? "Картки" : "Карточки"}
        </Button>
      </div>

      {/* Article filter */}
      <div className="flex gap-2">
        <button onClick={() => setArticleFilter(null)}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${!articleFilter ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
          {lang === "uk" ? "Всі" : "Все"}
        </button>
        {articles.map(a => (
          <button key={a} onClick={() => setArticleFilter(articleFilter === a ? null : a)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${articleFilter === a ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:bg-muted/50"}`}>
            {a}
          </button>
        ))}
      </div>

      {/* Word cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {filteredWords.map((word, idx) => {
          const origIdx = words.indexOf(word);
          const isSaved = saved.has(origIdx);
          return (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/40 hover:border-primary/20 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{word.de}</p>
                <p className="text-xs text-muted-foreground truncate">{lang === "uk" ? word.uk || word.ru : word.ru}</p>
                {word.example_de && <p className="text-[10px] text-muted-foreground/60 truncate italic mt-0.5">{word.example_de}</p>}
              </div>
              <button className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0">
                <Volume2 className="w-3.5 h-3.5 text-primary" />
              </button>
              <button onClick={() => toggleSave(origIdx)}
                className={`p-1.5 rounded-full transition-colors shrink-0 ${isSaved ? "bg-primary/20 text-primary" : "bg-muted/30 text-muted-foreground hover:text-primary"}`}>
                <Star className={`w-3.5 h-3.5 ${isSaved ? "fill-current" : ""}`} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Complete */}
      <div className="flex justify-center pt-4">
        {completed ? (
          <div className="flex items-center gap-2 text-primary text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" /> {lang === "uk" ? "Завершено!" : "Завершено!"}
          </div>
        ) : (
          <Button onClick={() => { setCompleted(true); onComplete(); }} className="font-display font-bold" size="lg">
            {savedCount >= threshold
              ? (lang === "uk" ? "Слова вивчено ✓" : "Слова выучены ✓")
              : (lang === "uk" ? "Все вивчив" : "Всё выучил")}
          </Button>
        )}
      </div>
    </div>
  );
};

export default WordListLesson;
