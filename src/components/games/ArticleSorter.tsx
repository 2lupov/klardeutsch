import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, RotateCcw, Recycle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatform } from "@/hooks/usePlatform";

interface WordItem {
  german: string;
  russian: string;
  article: string | null;
}

const BINS = ["Der", "Die", "Das"] as const;
type Bin = (typeof BINS)[number];

const BIN_COLORS: Record<Bin, string> = {
  Der: "from-blue-500/20 to-blue-600/20 border-blue-500/40",
  Die: "from-pink-500/20 to-pink-600/20 border-pink-500/40",
  Das: "from-emerald-500/20 to-emerald-600/20 border-emerald-500/40",
};

const BIN_ACTIVE: Record<Bin, string> = {
  Der: "from-blue-500/40 to-blue-600/40 border-blue-400 shadow-[0_0_20px_hsl(220,80%,55%,0.3)]",
  Die: "from-pink-500/40 to-pink-600/40 border-pink-400 shadow-[0_0_20px_hsl(330,80%,55%,0.3)]",
  Das: "from-emerald-500/40 to-emerald-600/40 border-emerald-400 shadow-[0_0_20px_hsl(150,80%,45%,0.3)]",
};

const BIN_ICONS: Record<Bin, string> = {
  Der: "🔵",
  Die: "🔴",
  Das: "🟢",
};

const NEIGHBOR_PHRASES = [
  "Ordnung muss sein! 🧐",
  "Nein, nein, nein! 😤",
  "Das stimmt nicht! 🙅",
  "Falsch sortiert! 😠",
  "So geht das nicht! 🤨",
];

const SUCCESS_PHRASES = [
  "Richtig! ✨",
  "Sehr gut! 👏",
  "Perfekt! 🎯",
  "Genau! 💪",
  "Wunderbar! ⭐",
];

const ArticleSorter = ({ onBack }: { onBack: () => void }) => {
  const { isMobile } = usePlatform();
  const [allWords, setAllWords] = useState<WordItem[]>([]);
  const [gameWords, setGameWords] = useState<WordItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string; correct?: string } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeBin, setActiveBin] = useState<Bin | null>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);

  const ROUND_SIZE = 15;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("vocab_cards")
        .select("german, russian, article")
        .not("article", "is", null)
        .neq("article", "");
      if (data) {
        setAllWords(data as WordItem[]);
        startNewRound(data as WordItem[]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const startNewRound = (words: WordItem[]) => {
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, ROUND_SIZE);
    setGameWords(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setMistakes(0);
    setGameOver(false);
    setFeedback(null);
  };

  const currentWord = gameWords[currentIndex];

  const normalizeArticle = (a: string | null): Bin | null => {
    if (!a) return null;
    const lower = a.toLowerCase().trim();
    if (lower === "der") return "Der";
    if (lower === "die") return "Die";
    if (lower === "das") return "Das";
    return null;
  };

  const handleDrop = useCallback(
    (bin: Bin) => {
      if (!currentWord || feedback || gameOver) return;

      const correct = normalizeArticle(currentWord.article);
      if (!correct) {
        setCurrentIndex((i) => i + 1);
        return;
      }

      if (bin === correct) {
        setScore((s) => s + 1);
        setFeedback({
          type: "success",
          text: SUCCESS_PHRASES[Math.floor(Math.random() * SUCCESS_PHRASES.length)],
        });
        // Haptic
        try {
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("light");
        } catch {}
        if (navigator.vibrate) navigator.vibrate(30);
      } else {
        setMistakes((m) => m + 1);
        setFeedback({
          type: "error",
          text: NEIGHBOR_PHRASES[Math.floor(Math.random() * NEIGHBOR_PHRASES.length)],
          correct: `${correct} ${currentWord.german}`,
        });
        // Haptic error
        try {
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.HapticFeedback) tg.HapticFeedback.impactOccurred("heavy");
        } catch {}
        if (navigator.vibrate) navigator.vibrate([80, 40, 80]);
      }

      setTimeout(() => {
        setFeedback(null);
        if (currentIndex + 1 >= gameWords.length) {
          setGameOver(true);
        } else {
          setCurrentIndex((i) => i + 1);
        }
      }, 1200);
    },
    [currentWord, feedback, gameOver, currentIndex, gameWords.length]
  );

  // Swipe handling for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const dx = e.changedTouches[0].clientX - touchStart.x;
    const dy = e.changedTouches[0].clientY - touchStart.y;

    // Needs at least 50px of movement
    if (Math.abs(dx) < 50 && Math.abs(dy) < 50) {
      setTouchStart(null);
      return;
    }

    // Determine direction: left = Der, down = Die, right = Das
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) handleDrop("Der");
      else handleDrop("Das");
    } else {
      handleDrop("Die");
    }
    setTouchStart(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-muted-foreground animate-pulse">Загрузка...</span>
      </div>
    );
  }

  if (gameOver) {
    const pct = Math.round((score / gameWords.length) * 100);
    return (
      <div className={`w-full mx-auto px-4 py-6 flex flex-col items-center gap-6 ${isMobile ? "max-w-md" : "max-w-lg"}`}>
        <div className="text-center">
          <div className="text-6xl mb-4">{pct >= 80 ? "🏆" : pct >= 50 ? "👍" : "📚"}</div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">Раунд окончен!</h2>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div className="text-center">
              <span className="text-2xl font-display font-bold text-primary">{score}</span>
              <p className="text-muted-foreground text-xs">Верно</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-display font-bold text-destructive">{mistakes}</span>
              <p className="text-muted-foreground text-xs">Ошибок</p>
            </div>
            <div className="text-center">
              <span className="text-2xl font-display font-bold text-foreground">{pct}%</span>
              <p className="text-muted-foreground text-xs">Точность</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => startNewRound(allWords)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-4 h-4" />
            Ещё раунд
          </button>
          <button
            onClick={onBack}
            className="px-4 py-3 rounded-xl border border-border text-muted-foreground font-display text-sm hover:text-foreground transition-colors"
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full mx-auto px-4 py-4 flex flex-col h-full ${isMobile ? "max-w-md" : "max-w-lg"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Recycle className="w-4 h-4 text-primary" />
          <span className="font-display text-sm font-bold text-foreground">♻️ Der/Die/Das</span>
        </div>
        <div className="text-xs text-muted-foreground font-display">
          {currentIndex + 1}/{gameWords.length}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 rounded-full bg-muted/40 mb-6 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-yellow-glow transition-all duration-500"
          style={{ width: `${((currentIndex) / gameWords.length) * 100}%` }}
        />
      </div>

      {/* Score */}
      <div className="flex items-center justify-center gap-6 mb-6 text-xs font-display">
        <span className="text-primary font-semibold">✓ {score}</span>
        <span className="text-destructive font-semibold">✗ {mistakes}</span>
      </div>

      {/* Word card */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        {currentWord && (
          <div
            className={`glass-card p-8 text-center relative transition-all duration-300 select-none ${
              feedback?.type === "error" ? "animate-shake border-destructive/50" : ""
            } ${feedback?.type === "success" ? "border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.2)]" : ""}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <h2 className="text-3xl font-display font-bold text-foreground mb-2">{currentWord.german}</h2>
            <p className="text-sm text-muted-foreground">{currentWord.russian}</p>

            {isMobile && !feedback && (
              <p className="text-[10px] text-muted-foreground/50 mt-3 font-display">
                ← Der · ↓ Die · Das →
              </p>
            )}
          </div>
        )}

        {/* Feedback */}
        {feedback && (
          <div
            className={`text-center py-2 px-4 rounded-xl text-sm font-display font-semibold animate-scale-in ${
              feedback.type === "success"
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            <p>{feedback.text}</p>
            {feedback.correct && (
              <p className="text-xs mt-1 font-normal text-muted-foreground">
                Правильно: <span className="text-foreground font-medium">{feedback.correct}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bins */}
      <div className="grid grid-cols-3 gap-3 mt-6 pb-2">
        {BINS.map((bin) => (
          <button
            key={bin}
            onClick={() => handleDrop(bin)}
            onMouseEnter={() => setActiveBin(bin)}
            onMouseLeave={() => setActiveBin(null)}
            disabled={!!feedback || gameOver}
            className={`flex flex-col items-center gap-1.5 py-5 rounded-2xl border-2 transition-all duration-200 bg-gradient-to-b ${
              activeBin === bin ? BIN_ACTIVE[bin] : BIN_COLORS[bin]
            } ${feedback || gameOver ? "opacity-50" : "hover:scale-[1.03] active:scale-95"}`}
          >
            <span className="text-2xl">{BIN_ICONS[bin]}</span>
            <span className="font-display text-lg font-bold text-foreground">{bin}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ArticleSorter;
