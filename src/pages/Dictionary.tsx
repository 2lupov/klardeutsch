import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { Star, StarOff, RotateCcw, Search, BookOpen, Plus, X, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface DictWord {
  id: string;
  source: "saved" | "custom";
  german: string;
  russian: string;
  ukrainian?: string;
  article: string | null;
  example: string | null;
  level: string | null;
  is_difficult: boolean;
}

const Dictionary = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { isMobile } = usePlatform();
  const [words, setWords] = useState<DictWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "difficult">("all");
  const [articleFilter, setArticleFilter] = useState<"all" | "der" | "die" | "das">("all");
  const [search, setSearch] = useState("");
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newGerman, setNewGerman] = useState("");
  const [newRussian, setNewRussian] = useState("");
  const [newArticle, setNewArticle] = useState("");
  const [newExample, setNewExample] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchWords();
  }, [user]);

  const fetchWords = async () => {
    if (!user) return;
    setLoading(true);

    const [savedRes, customRes] = await Promise.all([
      supabase
        .from("saved_words")
        .select("id, vocab_card_id, is_difficult, learned_at, vocab_cards(german, russian, ukrainian, article, example, level)")
        .eq("user_id", user.id)
        .order("learned_at", { ascending: false }),
      supabase
        .from("custom_words")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const saved: DictWord[] = (savedRes.data ?? []).map((w: any) => ({
      id: w.id,
      source: "saved" as const,
      german: w.vocab_cards.german,
      russian: w.vocab_cards.russian,
      ukrainian: w.vocab_cards.ukrainian ?? "",
      article: w.vocab_cards.article,
      example: w.vocab_cards.example,
      level: w.vocab_cards.level,
      is_difficult: w.is_difficult,
    }));

    const custom: DictWord[] = (customRes.data ?? []).map((w: any) => ({
      id: w.id,
      source: "custom" as const,
      german: w.german,
      russian: w.russian,
      article: w.article,
      example: w.example,
      level: null,
      is_difficult: w.is_difficult,
    }));

    setWords([...saved, ...custom]);
    setLoading(false);
  };

  const toggleDifficult = async (word: DictWord) => {
    const table = word.source === "saved" ? "saved_words" : "custom_words";
    await supabase.from(table).update({ is_difficult: !word.is_difficult }).eq("id", word.id);
    setWords((prev) =>
      prev.map((w) => (w.id === word.id ? { ...w, is_difficult: !word.is_difficult } : w))
    );
  };

  const removeWord = async (word: DictWord) => {
    const table = word.source === "saved" ? "saved_words" : "custom_words";
    await supabase.from(table).delete().eq("id", word.id);
    setWords((prev) => prev.filter((w) => w.id !== word.id));
    toast({ title: t("wordRemoved") });
  };

  const addCustomWord = async () => {
    if (!user || !newGerman.trim() || !newRussian.trim()) return;
    setAdding(true);
    const { data, error } = await supabase
      .from("custom_words")
      .insert({
        user_id: user.id,
        german: newGerman.trim(),
        russian: newRussian.trim(),
        article: newArticle.trim() || null,
        example: newExample.trim() || null,
      })
      .select()
      .single();

    if (!error && data) {
      setWords((prev) => [
        {
          id: data.id,
          source: "custom",
          german: data.german,
          russian: data.russian,
          article: data.article,
          example: data.example,
          level: null,
          is_difficult: false,
        },
        ...prev,
      ]);
      setNewGerman("");
      setNewRussian("");
      setNewArticle("");
      setNewExample("");
      setShowAdd(false);
      toast({ title: t("wordAdded") });
    }
    setAdding(false);
  };

  const filtered = words.filter((w) => {
    if (filter === "difficult" && !w.is_difficult) return false;
    if (articleFilter !== "all" && w.article?.toLowerCase() !== articleFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return w.german.toLowerCase().includes(s) || w.russian.toLowerCase().includes(s);
    }
    return true;
  });

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

  // Review mode
  if (reviewMode && difficultWords.length > 0) {
    const card = difficultWords[reviewIndex];
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-6 px-4 ${isMobile ? "max-w-sm" : "max-w-lg"} mx-auto`}>
        <div className="flex items-center justify-between w-full">
          <span className="text-sm text-muted-foreground">
            {reviewIndex + 1} / {difficultWords.length}
          </span>
          <button onClick={() => setReviewMode(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
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
            <div className="absolute inset-0 glass-card glow-yellow flex flex-col items-center justify-center p-8" style={{ backfaceVisibility: "hidden" }}>
              {card?.article && <span className="text-sm font-medium text-primary mb-2">{card.article}</span>}
              <h2 className="text-3xl font-display font-bold text-foreground">{card?.german}</h2>
              <p className="text-sm text-muted-foreground mt-4">{t("tapToFlip")}</p>
            </div>
            <div className="absolute inset-0 glass-card flex flex-col items-center justify-center p-8 [transform:rotateY(180deg)]" style={{ backfaceVisibility: "hidden" }}>
              <h2 className="text-2xl font-display font-bold text-primary">{lang === "uk" && card?.ukrainian ? card.ukrainian : card?.russian}</h2>
              {card?.example && <p className="text-sm text-muted-foreground italic text-center mt-4">"{card.example}"</p>}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setFlipped(false); if (reviewIndex > 0) setTimeout(() => setReviewIndex(reviewIndex - 1), 150); }}
            disabled={reviewIndex === 0}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground disabled:opacity-30"
          >←</button>
          <button
            onClick={() => {
              toggleDifficult(difficultWords[reviewIndex]);
              setFlipped(false);
              if (reviewIndex < difficultWords.length - 1) setTimeout(() => setReviewIndex(reviewIndex + 1), 150);
              else { setReviewMode(false); toast({ title: t("reviewComplete") }); }
            }}
            className="px-6 py-2 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow"
          >{t("iLearned")}</button>
          <button
            onClick={() => { setFlipped(false); if (reviewIndex < difficultWords.length - 1) setTimeout(() => setReviewIndex(reviewIndex + 1), 150); }}
            disabled={reviewIndex >= difficultWords.length - 1}
            className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground disabled:opacity-30"
          >→</button>
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
        <div className="flex gap-2">
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </button>
          {difficultWords.length > 0 && (
            <button
              onClick={startReview}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm glow-yellow"
            >
              <RotateCcw className="w-4 h-4" />
              {!isMobile && t("reviewDifficult")}
            </button>
          )}
        </div>
      </div>

      {/* Add word form */}
      {showAdd && (
        <div className="glass-card p-4 mb-4 flex flex-col gap-3 animate-slide-up">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder={t("german")}
              value={newGerman}
              onChange={(e) => setNewGerman(e.target.value)}
              maxLength={100}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder={t("russian")}
              value={newRussian}
              onChange={(e) => setNewRussian(e.target.value)}
              maxLength={100}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder={`${t("article")} (${t("example")}: der)`}
              value={newArticle}
              onChange={(e) => setNewArticle(e.target.value)}
              maxLength={10}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              placeholder={t("example")}
              value={newExample}
              onChange={(e) => setNewExample(e.target.value)}
              maxLength={200}
              className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            onClick={addCustomWord}
            disabled={!newGerman.trim() || !newRussian.trim() || adding}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 transition-all hover:opacity-90"
          >
            {t("addWord")}
          </button>
        </div>
      )}

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
        <div className="flex gap-1.5">
          {(["all", "der", "die", "das"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setArticleFilter(a)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                articleFilter === a
                  ? a === "der" ? "bg-blue-500/20 border border-blue-500/50 text-blue-400"
                  : a === "die" ? "bg-pink-500/20 border border-pink-500/50 text-pink-400"
                  : a === "das" ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-400"
                  : "bg-primary/10 border border-primary/50 text-primary"
                  : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {a === "all" ? "Alle" : a}
            </button>
          ))}
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
            <div key={word.id} className="glass-card p-3 flex items-center gap-3 group">
              <button onClick={() => toggleDifficult(word)} className="shrink-0 transition-colors">
                {word.is_difficult ? (
                  <Star className="w-5 h-5 text-primary fill-primary" />
                ) : (
                  <StarOff className="w-5 h-5 text-muted-foreground hover:text-primary" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  {word.article && <span className="text-sm text-yellow-400 font-display font-semibold">{word.article}</span>}
                  <span className="font-display font-semibold text-foreground truncate">{word.german.replace(/^(der|die|das)\s+/i, '')}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{lang === "uk" && word.ukrainian ? word.ukrainian : word.russian}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {word.level && <span className="text-[10px] text-muted-foreground/60">{word.level}</span>}
                {word.source === "custom" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">✎</span>
                )}
                <button
                  onClick={() => removeWord(word)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dictionary;
