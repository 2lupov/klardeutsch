import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { Star, StarOff, RotateCcw, Search, BookOpen, Plus, X, Trash2, ChevronLeft, ChevronRight, Sparkles, BookMarked, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

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

const ARTICLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  der: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" },
  die: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30", dot: "bg-pink-400" },
  das: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" },
};

type WordType = "nomen" | "verb" | "adjektiv" | "andere";

const WORD_TYPE_META: Record<WordType, { label: string; labelUk: string; emoji: string; bg: string; text: string; border: string }> = {
  nomen:    { label: "Существительные", labelUk: "Іменники",    emoji: "📦", bg: "bg-sky-500/10",    text: "text-sky-400",    border: "border-sky-500/20" },
  verb:     { label: "Глаголы",         labelUk: "Дієслова",    emoji: "⚡", bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/20" },
  adjektiv: { label: "Прилагательные",  labelUk: "Прикметники", emoji: "🎨", bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/20" },
  andere:   { label: "Другое",          labelUk: "Інше",        emoji: "📝", bg: "bg-muted",         text: "text-muted-foreground", border: "border-border" },
};

const VERB_ENDINGS = ["en", "ern", "eln"];
const ADJ_ENDINGS = ["ig", "lich", "isch", "bar", "sam", "haft", "los", "voll", "reich"];

function detectWordType(word: DictWord): WordType {
  if (word.article) return "nomen";
  const g = word.german.toLowerCase().trim();
  // Check if it starts with "sich " (reflexive verb)
  const base = g.startsWith("sich ") ? g.slice(5) : g;
  if (g.startsWith("sich ")) return "verb";
  if (VERB_ENDINGS.some(e => base.endsWith(e)) && base.length > 3) return "verb";
  if (ADJ_ENDINGS.some(e => base.endsWith(e))) return "adjektiv";
  // Nouns in German start with uppercase (if no article provided)
  if (word.german.trim()[0] === word.german.trim()[0]?.toUpperCase() && /^[A-ZÄÖÜ]/.test(word.german.trim())) return "nomen";
  return "andere";
}

const getArticleStyle = (article: string | null) => {
  if (!article) return null;
  return ARTICLE_COLORS[article.toLowerCase()] ?? null;
};

const Dictionary = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { isMobile } = usePlatform();
  const [words, setWords] = useState<DictWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "difficult" | "custom">("all");
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
  const [wordTypeFilter, setWordTypeFilter] = useState<WordType | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupWord, setLookupWord] = useState("");
  const [lookupResult, setLookupResult] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ german: string; article: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Autocomplete: fetch suggestions from vocab_cards as user types
  useEffect(() => {
    const q = lookupWord.trim().toLowerCase();
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("vocab_cards")
        .select("german, article")
        .ilike("german", `${q}%`)
        .order("german")
        .limit(8);
      if (data && data.length > 0) {
        // deduplicate
        const unique = Array.from(new Map(data.map(d => [d.german.toLowerCase(), d])).values());
        setSuggestions(unique);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [lookupWord]);

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

  const handleLookup = async () => {
    if (!lookupWord.trim()) return;
    setLookupLoading(true);
    setLookupResult("");
    try {
      const { data, error } = await supabase.functions.invoke("lookup-word", {
        body: { word: lookupWord.trim(), lang },
      });
      if (error) throw error;
      setLookupResult(data?.result || (lang === "uk" ? "Нічого не знайдено" : "Ничего не найдено"));
    } catch (e: any) {
      toast({ title: lang === "uk" ? "Помилка пошуку" : "Ошибка поиска", variant: "destructive" });
    } finally {
      setLookupLoading(false);
    }
  };

  const wordsWithType = useMemo(() => words.map(w => ({ ...w, wordType: detectWordType(w) })), [words]);

  const filtered = useMemo(() => wordsWithType.filter((w) => {
    if (filter === "difficult" && !w.is_difficult) return false;
    if (filter === "custom" && w.source !== "custom") return false;
    if (articleFilter !== "all" && w.article?.toLowerCase() !== articleFilter) return false;
    if (wordTypeFilter !== "all" && w.wordType !== wordTypeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return w.german.toLowerCase().includes(s) || w.russian.toLowerCase().includes(s);
    }
    return true;
  }), [wordsWithType, filter, articleFilter, wordTypeFilter, search]);

  const difficultWords = useMemo(() => wordsWithType.filter((w) => w.is_difficult), [wordsWithType]);

  const stats = useMemo(() => ({
    total: words.length,
    difficult: difficultWords.length,
    custom: words.filter(w => w.source === "custom").length,
    der: words.filter(w => w.article?.toLowerCase() === "der").length,
    die: words.filter(w => w.article?.toLowerCase() === "die").length,
    das: words.filter(w => w.article?.toLowerCase() === "das").length,
    nomen: wordsWithType.filter(w => w.wordType === "nomen").length,
    verb: wordsWithType.filter(w => w.wordType === "verb").length,
    adjektiv: wordsWithType.filter(w => w.wordType === "adjektiv").length,
    andere: wordsWithType.filter(w => w.wordType === "andere").length,
  }), [words, wordsWithType, difficultWords]);

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
    const progress = ((reviewIndex + 1) / difficultWords.length) * 100;

    return (
      <div className={`flex flex-col items-center justify-center h-full gap-6 px-4 ${isMobile ? "max-w-sm" : "max-w-lg"} mx-auto`}>
        {/* Progress bar */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-display font-semibold text-foreground">
              {reviewIndex + 1} / {difficultWords.length}
            </span>
            <button onClick={() => setReviewMode(false)} className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <X className="w-3.5 h-3.5" />
              {t("back")}
            </button>
          </div>
          <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <AnimatePresence mode="wait">
          <motion.div
            key={reviewIndex}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className={`w-full cursor-pointer ${isMobile ? "aspect-[3/4]" : "aspect-[4/3]"}`}
            onClick={() => setFlipped(!flipped)}
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 ${flipped ? "[transform:rotateY(180deg)]" : ""}`}
              style={{ transformStyle: "preserve-3d" }}
            >
              {/* Front */}
              <div className="absolute inset-0 rounded-2xl border border-border bg-card shadow-xl flex flex-col items-center justify-center p-8" style={{ backfaceVisibility: "hidden" }}>
                {card?.article && (
                  <span className={`text-sm font-bold px-3 py-1 rounded-full mb-3 ${getArticleStyle(card.article)?.bg ?? "bg-secondary"} ${getArticleStyle(card.article)?.text ?? "text-muted-foreground"}`}>
                    {card.article}
                  </span>
                )}
                <h2 className="text-3xl font-display font-bold text-foreground text-center">{card?.german}</h2>
                <p className="text-sm text-muted-foreground mt-6 flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t("tapToFlip")}
                </p>
              </div>
              {/* Back */}
              <div className="absolute inset-0 rounded-2xl border border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center p-8 [transform:rotateY(180deg)]" style={{ backfaceVisibility: "hidden" }}>
                <h2 className="text-2xl font-display font-bold text-primary text-center">
                  {lang === "uk" && card?.ukrainian ? card.ukrainian : card?.russian}
                </h2>
                {card?.example && (
                  <p className="text-sm text-muted-foreground italic text-center mt-4 px-4">„{card.example}"</p>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Controls */}
        <div className="flex gap-3 items-center">
          <button
            onClick={() => { setFlipped(false); if (reviewIndex > 0) setTimeout(() => setReviewIndex(reviewIndex - 1), 150); }}
            disabled={reviewIndex === 0}
            className="p-3 rounded-xl bg-secondary border border-border text-foreground disabled:opacity-30 hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              toggleDifficult(difficultWords[reviewIndex]);
              setFlipped(false);
              if (reviewIndex < difficultWords.length - 1) setTimeout(() => setReviewIndex(reviewIndex + 1), 150);
              else { setReviewMode(false); toast({ title: t("reviewComplete") }); }
            }}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {t("iLearned")}
          </button>
          <button
            onClick={() => { setFlipped(false); if (reviewIndex < difficultWords.length - 1) setTimeout(() => setReviewIndex(reviewIndex + 1), 150); }}
            disabled={reviewIndex >= difficultWords.length - 1}
            className="p-3 rounded-xl bg-secondary border border-border text-foreground disabled:opacity-30 hover:bg-muted transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${isMobile ? "px-4 py-4" : "px-8 py-6 max-w-3xl mx-auto"}`}>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{t("dictionaryTitle")}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {stats.total} {t("wordsTotal")}
            </p>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowAdd(!showAdd)}
              className={`p-2.5 rounded-xl border transition-colors ${
                showAdd
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {showAdd ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => { setShowLookup(!showLookup); setLookupResult(""); setLookupWord(""); }}
              className={`p-2.5 rounded-xl border transition-colors ${
                showLookup
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <BookMarked className="w-5 h-5" />
            </motion.button>
            {stats.difficult > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startReview}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:opacity-90 transition-opacity"
              >
                <RotateCcw className="w-4 h-4" />
                {!isMobile && t("reviewDifficult")}
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary-foreground/20 text-[10px] font-bold">
                  {stats.difficult}
                </span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Stats mini-bar */}
        <div className="space-y-2 pb-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            {[
              { key: "all" as const, label: lang === "uk" ? "Усі" : "Все", count: stats.total, color: "bg-primary/10 text-primary border-primary/20" },
              { key: "difficult" as const, label: "★", count: stats.difficult, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
              { key: "custom" as const, label: "✎", count: stats.custom, color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                  filter === f.key ? f.color : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
                <span className="opacity-70">{f.count}</span>
              </button>
            ))}
            <div className="w-px bg-border mx-1 self-stretch min-h-[24px]" />
            {(["der", "die", "das"] as const).map((a) => {
              const style = ARTICLE_COLORS[a];
              return (
                <button
                  key={a}
                  onClick={() => setArticleFilter(articleFilter === a ? "all" : a)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                    articleFilter === a
                      ? `${style.bg} ${style.text} ${style.border}`
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                  {a}
                  <span className="opacity-70">{stats[a]}</span>
                </button>
              );
            })}
            <div className="w-px bg-border mx-1 self-stretch min-h-[24px]" />
            {(["nomen", "verb", "adjektiv", "andere"] as WordType[]).map((wt) => {
              const meta = WORD_TYPE_META[wt];
              return (
                <button
                  key={wt}
                  onClick={() => setWordTypeFilter(wordTypeFilter === wt ? "all" : wt)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                    wordTypeFilter === wt
                      ? `${meta.bg} ${meta.text} ${meta.border}`
                      : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{meta.emoji}</span>
                  {lang === "uk" ? meta.labelUk : meta.label}
                  <span className="opacity-70">{stats[wt]}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add word form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-display font-semibold text-foreground">
                {lang === "uk" ? "Додати слово" : "Добавить слово"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Deutsch"
                  value={newGerman}
                  onChange={(e) => setNewGerman(e.target.value)}
                  maxLength={100}
                  autoFocus
                  className="px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <input
                  type="text"
                  placeholder={lang === "uk" ? "Переклад" : "Перевод"}
                  value={newRussian}
                  onChange={(e) => setNewRussian(e.target.value)}
                  maxLength={100}
                  className="px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex gap-1.5">
                  {["der", "die", "das"].map((a) => {
                    const style = ARTICLE_COLORS[a];
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setNewArticle(newArticle === a ? "" : a)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                          newArticle === a
                            ? `${style.bg} ${style.text} ${style.border}`
                            : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {a}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder={lang === "uk" ? "Приклад (необов'язково)" : "Пример (необязательно)"}
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  maxLength={200}
                  className="px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <button
                onClick={addCustomWord}
                disabled={!newGerman.trim() || !newRussian.trim() || adding}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-40 transition-all hover:opacity-90"
              >
                {adding ? "..." : lang === "uk" ? "Додати" : "Добавить"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lookup panel */}
      <AnimatePresence>
        {showLookup && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <p className="text-sm font-display font-semibold text-foreground">
                {lang === "uk" ? "🔍 Знайти слово" : "🔍 Найти слово"}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={lang === "uk" ? "Введіть слово німецькою..." : "Введите слово на немецком..."}
                  value={lookupWord}
                  onChange={(e) => setLookupWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  maxLength={60}
                  autoFocus
                  className="flex-1 px-3 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  onClick={handleLookup}
                  disabled={!lookupWord.trim() || lookupLoading}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-40 transition-all hover:opacity-90 flex items-center gap-2"
                >
                  {lookupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {lang === "uk" ? "Шукаю..." : "Ищу..."}
                    </>
                  ) : (
                    lang === "uk" ? "Знайти" : "Найти"
                  )}
                </button>
              </div>

              {/* Result */}
              {lookupResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-secondary/50 border border-border p-4 max-h-[50vh] overflow-y-auto"
                >
                  <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground/90 prose-strong:text-foreground prose-li:text-foreground/90">
                    <ReactMarkdown>{lookupResult}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mb-4">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={t("searchWords")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results count */}
      {(search || filter !== "all" || articleFilter !== "all" || wordTypeFilter !== "all") && (
        <p className="text-xs text-muted-foreground mb-2 px-1">
          {lang === "uk" ? "Знайдено" : "Найдено"}: {filtered.length}
        </p>
      )}

      {/* Word list */}
      <div className="flex-1 overflow-y-auto overscroll-none space-y-1.5 pb-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">{t("loading")}</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-4 text-muted-foreground"
          >
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
              <BookOpen className="w-8 h-8 opacity-40" />
            </div>
            <div className="text-center">
              <p className="font-display font-semibold text-foreground mb-1">
                {search ? (lang === "uk" ? "Нічого не знайдено" : "Ничего не найдено") : t("dictionaryEmpty")}
              </p>
              <p className="text-xs">
                {search
                  ? (lang === "uk" ? "Спробуй інший запит" : "Попробуй другой запрос")
                  : (lang === "uk" ? "Вивчай слова в уроках — вони з'являться тут" : "Изучай слова в уроках — они появятся здесь")}
              </p>
            </div>
          </motion.div>
        ) : (
          filtered.map((word, i) => {
            const articleStyle = getArticleStyle(word.article);
            const typeMeta = WORD_TYPE_META[word.wordType];
            const isExpanded = expandedId === word.id;

            return (
              <motion.div
                key={word.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.02, 0.3) }}
                layout
                className={`rounded-xl border transition-colors cursor-pointer group ${
                  isExpanded
                    ? "bg-card border-primary/20 shadow-sm"
                    : "bg-card/50 border-border hover:bg-card hover:border-border"
                }`}
                onClick={() => setExpandedId(isExpanded ? null : word.id)}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Article dot */}
                  <div className="shrink-0 w-8 flex justify-center">
                    {articleStyle ? (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${articleStyle.bg} ${articleStyle.text}`}>
                        {word.article}
                      </span>
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-muted-foreground/20" />
                    )}
                  </div>

                  {/* Word content */}
                  <div className="flex-1 min-w-0">
                    <span className="font-display font-semibold text-foreground text-sm">
                      {word.german.replace(/^(der|die|das)\s+/i, "")}
                    </span>
                    <span className="text-muted-foreground text-sm ml-2">
                      — {lang === "uk" && word.ukrainian ? word.ukrainian : word.russian}
                    </span>
                  </div>

                  {/* Right side */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {word.level && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground font-medium">
                        {word.level}
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${typeMeta.bg} ${typeMeta.text}`}>
                      {typeMeta.emoji}
                    </span>
                    {word.source === "custom" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-400 font-medium">✎</span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleDifficult(word); }}
                      className="p-1 rounded-lg transition-colors"
                    >
                      {word.is_difficult ? (
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      ) : (
                        <StarOff className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3 pt-0 border-t border-border/50 mt-0">
                        <div className="pt-2.5 flex items-start justify-between">
                          <div className="space-y-1.5">
                            {word.example && (
                              <p className="text-xs text-muted-foreground italic">„{word.example}"</p>
                            )}
                            {word.article && (
                              <p className="text-xs text-muted-foreground">
                                {lang === "uk" ? "Артикль" : "Артикль"}: <span className={`font-semibold ${articleStyle?.text ?? ""}`}>{word.article}</span>
                              </p>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeWord(word); }}
                            className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Dictionary;
