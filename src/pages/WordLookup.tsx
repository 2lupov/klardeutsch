import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, Loader2, Sparkles, BookOpen, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import Panda3D from "@/components/Panda3D";
import pandaStudying from "@/assets/mascot/panda-studying.png";

const BAMBOO_PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 16 + 8,
  delay: Math.random() * 5,
  duration: 8 + Math.random() * 6,
}));

const WordLookup = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [word, setWord] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ german: string; article: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searched, setSearched] = useState(false);

  // Autocomplete
  useEffect(() => {
    const q = word.trim().toLowerCase();
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("vocab_cards")
        .select("german, article")
        .ilike("german", `${q}%`)
        .order("german")
        .limit(8);
      if (data && data.length > 0) {
        const unique = Array.from(new Map(data.map(d => [d.german.toLowerCase(), d])).values());
        setSuggestions(unique);
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [word]);

  const handleLookup = async () => {
    if (!word.trim()) return;
    setLoading(true);
    setResult("");
    setSearched(true);
    setShowSuggestions(false);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-word", {
        body: { word: word.trim(), lang },
      });
      if (error) throw error;
      setResult(data?.result || (lang === "uk" ? "Нічого не знайдено" : "Ничего не найдено"));
    } catch {
      setResult(lang === "uk" ? "❌ Помилка пошуку. Спробуйте ще раз." : "❌ Ошибка поиска. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Floating bamboo leaves */}
      {BAMBOO_PARTICLES.map(p => (
        <motion.div
          key={p.id}
          className="absolute pointer-events-none text-primary/10 select-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
          animate={{
            y: [0, -30, 0],
            x: [0, 15, -10, 0],
            rotate: [0, 20, -15, 0],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        >
          🎋
        </motion.div>
      ))}

      {/* Background gradient orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 py-4 md:px-8 md:py-6 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/dictionary")}
            className="p-2.5 rounded-xl bg-secondary/80 border border-border text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <span className="text-2xl">🐼</span>
              {lang === "uk" ? "Панда-словник" : "Панда-словарь"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "uk" ? "Знайди будь-яке німецьке слово" : "Найди любое немецкое слово"}
            </p>
          </div>
        </motion.div>

        {/* Panda mascot area */}
        <AnimatePresence mode="wait">
          {!searched ? (
            <motion.div
              key="panda-idle"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center mb-4"
            >
              <div className="w-48 h-48 md:w-56 md:h-56">
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center text-6xl animate-bounce">🐼</div>
                }>
                  <Panda3D stageImage={pandaStudying} className="rounded-2xl" />
                </Suspense>
              </div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative mt-2"
              >
                <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl px-5 py-3 text-center max-w-xs">
                  <p className="text-sm text-foreground font-medium">
                    {lang === "uk"
                      ? "Напиши слово, і я знайду все про нього! 📚"
                      : "Напиши слово, и я найду всё о нём! 📚"}
                  </p>
                </div>
                {/* Speech bubble tail */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card/80 border-l border-t border-border rotate-45" />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="panda-small"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3 mb-4"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="text-3xl"
              >
                🐼
              </motion.div>
              {loading && (
                <motion.p
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm text-muted-foreground italic"
                >
                  {lang === "uk" ? "Шукаю... 🔍" : "Ищу... 🔍"}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="relative mb-6"
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-emerald-500/20 to-primary/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder={lang === "uk" ? "Введіть слово німецькою..." : "Введите слово на немецком..."}
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  maxLength={60}
                  autoFocus
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-sm"
                />

                {/* Suggestions dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -4, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute z-50 left-0 right-0 top-full mt-2 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl overflow-hidden"
                    >
                      {suggestions.map((s, i) => (
                        <motion.button
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-primary/10 transition-colors flex items-center gap-3 text-foreground border-b border-border/50 last:border-0"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setWord(s.german);
                            setShowSuggestions(false);
                            setSuggestions([]);
                          }}
                        >
                          {s.article && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                              s.article === "der" ? "bg-blue-500/15 text-blue-400" :
                              s.article === "die" ? "bg-pink-500/15 text-pink-400" :
                              s.article === "das" ? "bg-emerald-500/15 text-emerald-400" : "text-muted-foreground"
                            }`}>{s.article}</span>
                          )}
                          <span className="font-medium">{s.german}</span>
                          <Sparkles className="w-3 h-3 text-primary/40 ml-auto" />
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleLookup}
                disabled={!word.trim() || loading}
                className="px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-sm disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-primary/20 flex items-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <BookOpen className="w-5 h-5" />
                )}
                <span className="hidden sm:inline">
                  {lang === "uk" ? "Знайти" : "Найти"}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Result area */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 py-12"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
              />
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary/40"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                {lang === "uk" ? "Панда шукає слово..." : "Панда ищет слово..."}
              </p>
            </motion.div>
          )}

          {!loading && result && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex-1 pb-8"
            >
              <div className="relative">
                {/* Decorative top bar */}
                <div className="h-1 rounded-t-2xl bg-gradient-to-r from-primary/60 via-emerald-500/40 to-primary/60" />
                
                <div className="rounded-b-2xl border border-t-0 border-border bg-card/90 backdrop-blur-sm overflow-hidden">
                  {/* Word header */}
                  <div className="px-5 py-4 border-b border-border/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-display font-bold text-lg text-foreground">{word}</h2>
                      <p className="text-xs text-muted-foreground">
                        {lang === "uk" ? "Результат пошуку" : "Результат поиска"}
                      </p>
                    </div>
                    <motion.div
                      className="ml-auto text-xl"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      🐼
                    </motion.div>
                  </div>

                  {/* Markdown content */}
                  <div className="px-5 py-5 max-h-[55vh] overflow-y-auto scrollbar-thin scrollbar-thumb-border">
                    <div className="prose prose-sm dark:prose-invert max-w-none
                      prose-headings:font-display prose-headings:text-foreground prose-headings:mt-4 prose-headings:mb-2
                      prose-h2:text-lg prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-2
                      prose-h3:text-base prose-h3:text-primary/90
                      prose-p:text-foreground/85 prose-p:leading-relaxed
                      prose-strong:text-foreground prose-strong:font-semibold
                      prose-li:text-foreground/85 prose-li:marker:text-primary/50
                      prose-code:bg-secondary prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-primary prose-code:text-xs
                      prose-table:border-collapse
                      prose-th:bg-secondary/60 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:text-xs prose-th:font-display prose-th:text-foreground/80 prose-th:border prose-th:border-border/50
                      prose-td:px-3 prose-td:py-2 prose-td:text-sm prose-td:border prose-td:border-border/30
                    ">
                      <ReactMarkdown>{result}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search another */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                onClick={() => {
                  setWord("");
                  setResult("");
                  setSearched(false);
                }}
                className="mt-4 w-full py-3 rounded-xl border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium flex items-center justify-center gap-2"
              >
                <Search className="w-4 h-4" />
                {lang === "uk" ? "Шукати інше слово" : "Искать другое слово"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WordLookup;
