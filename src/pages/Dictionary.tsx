import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { Star, StarOff, RotateCcw, Search, BookOpen } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface SavedWord {
  id: string;
  vocab_card_id: string;
  is_difficult: boolean;
  learned_at: string;
  vocab_cards: {
    german: string;
    russian: string;
    article: string | null;
    example: string | null;
    level: string;
  };
}

const Dictionary = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isMobile } = usePlatform();
  const [words, setWords] = useState<SavedWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "difficult">("all");
  const [search, setSearch] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchWords();
  }, [user]);

  const fetchWords = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("saved_words")
      .select("id, vocab_card_id, is_difficult, learned_at, vocab_cards(german, russian, article, example, level)")
      .eq("user_id", user.id)
      .order("learned_at", { ascending: false });
    setWords((data as unknown as SavedWord[]) ?? []);
    setLoading(false);
  };

  const toggleDifficult = async (wordId: string, current: boolean) => {
    await supabase
      .from("saved_words")
      .update({ is_difficult: !current })
      .eq("id", wordId);
    setWords((prev) =>
      prev.map((w) => (w.id === wordId ? { ...w, is_difficult: !current } : w))
    );
  };

  const removeWord = async (wordId: string) => {
    await supabase.from("saved_words").delete().eq("id", wordId);
    setWords((prev) => prev.filter((w) => w.id !== wordId));
    toast({ title: t("wordRemoved") });
  };

  const filtered = words.filter((w) => {
    if (filter === "difficult" && !w.is_difficult) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        w.vocab_cards.german.toLowerCase().includes(s) ||
        w.vocab_cards.russian.toLowerCase().includes(s)
      );
    }
    return true;
  });

  // Review mode for difficult words
  const difficultWords = words.filter((w) => w.is_difficult);

  const startReview = () => {
    if (difficultWords.length === 0) {
      toast({ title: t("noDifficultWords") });
      return;
    }
    setReviewMode(true);
    setReviewIndex(0);
    setFlipped(false);
  };

  if (reviewMode && difficultWords.length > 0) {
    const card = difficultWords[reviewIndex]?.vocab_cards;
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-6 px-4 ${isMobile ? "max-w-sm" : "max-w-lg"} mx-auto`}>
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-muted-foreground">
            {reviewIndex + 1} / {difficultWords.length}
          </span>
          <button
            onClick={() => setReviewMode(false)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ✕ {t("back")}
          </button>
        </div>

        <div
          className={`w-full cursor-pointer perspective-1000 ${isMobile ? "aspect-[3/4]" : "aspect-[4/3]"}`}
          onClick={() => setFlipped(!flipped)}
        >
          <div
            className={`relative w-full h-full transition-transform duration-500 ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
            style={{ transformStyle: "preserve-3d" }}
          >
            <div
              className="absolute inset-0 glass-card glow-yellow flex flex-col items-center justify-center p-8"
              style={{ backfaceVisibility: "hidden" }}
            >
              {card?.article && (
                <span className="text-sm font-medium text-primary mb-2">{card.article}</span>
              )}
              <h2 className="text-3xl font-display font-bold text-foreground">{card?.german}</h2>
              <p className="text-sm text-muted-foreground mt-4">{t("tapToFlip")}</p>
            </div>
            <div
              className="absolute inset-0 glass-card flex flex-col items-center justify-center p-8 [transform:rotateY(180deg)]"
              style={{ backfaceVisibility: "hidden" }}
            >
              <h2 className="text-2xl font-display font-bold text-primary">{card?.russian}</h2>
              {card?.example && (
                <p className="text-sm text-muted-foreground italic text-center mt-4">"{card.example}"</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              setFlipped(false);
              if (reviewIndex > 0) setTimeout(() => setReviewIndex(reviewIndex - 1), 150);
            }}
            disabled={reviewIndex === 0}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground disabled:opacity-30"
          >
            ←
          </button>
          <button
            onClick={() => {
              toggleDifficult(difficultWords[reviewIndex].id, true);
              setFlipped(false);
              if (reviewIndex < difficultWords.length - 1) {
                setTimeout(() => setReviewIndex(reviewIndex + 1), 150);
              } else {
                setReviewMode(false);
                toast({ title: t("reviewComplete") });
              }
            }}
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow"
          >
            {t("iLearned")}
          </button>
          <button
            onClick={() => {
              setFlipped(false);
              if (reviewIndex < difficultWords.length - 1)
                setTimeout(() => setReviewIndex(reviewIndex + 1), 150);
            }}
            disabled={reviewIndex >= difficultWords.length - 1}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isMobile ? "px-4 py-4" : "px-8 py-8 max-w-3xl mx-auto"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-display font-bold">{t("dictionaryTitle")}</h1>
          <p className="text-sm text-muted-foreground">
            {words.length} {t("wordsTotal")} · {difficultWords.length} {t("wordsDifficult")}
          </p>
        </div>
        {difficultWords.length > 0 && (
          <button
            onClick={startReview}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm glow-yellow"
          >
            <RotateCcw className="w-4 h-4" />
            {t("reviewDifficult")}
          </button>
        )}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("searchWords")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setFilter(filter === "all" ? "difficult" : "all")}
          className={`px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
            filter === "difficult"
              ? "bg-primary/10 border-primary/50 text-primary"
              : "bg-secondary border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Star className="w-4 h-4" />
        </button>
      </div>

      {/* Word list */}
      <div className="flex-1 overflow-y-auto overscroll-none space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">{t("loading")}</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
            <BookOpen className="w-10 h-10 opacity-40" />
            <p className="text-sm">{t("dictionaryEmpty")}</p>
          </div>
        ) : (
          filtered.map((word) => (
            <div
              key={word.id}
              className="glass-card p-3 flex items-center gap-3 group"
            >
              <button
                onClick={() => toggleDifficult(word.id, word.is_difficult)}
                className="shrink-0 transition-colors"
              >
                {word.is_difficult ? (
                  <Star className="w-5 h-5 text-primary fill-primary" />
                ) : (
                  <StarOff className="w-5 h-5 text-muted-foreground hover:text-primary" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  {word.vocab_cards.article && (
                    <span className="text-xs text-primary font-medium">{word.vocab_cards.article}</span>
                  )}
                  <span className="font-display font-semibold text-foreground truncate">
                    {word.vocab_cards.german}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{word.vocab_cards.russian}</p>
              </div>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">{word.vocab_cards.level}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dictionary;
