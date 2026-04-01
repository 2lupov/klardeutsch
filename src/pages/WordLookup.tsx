import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Search, Loader2, Sparkles, BookOpen, Languages, Lightbulb, Table2, Layers } from "lucide-react";
import pandaWriting from "@/assets/mascot/panda-writing.png";

interface WordData {
  word: string;
  article?: string;
  translation: string;
  part_of_speech: string;
  part_of_speech_translation: string;
  level: string;
  meanings: { meaning: string; example_de: string; example_translation: string }[];
  conjugation?: {
    präsens: Record<string, string>;
    präteritum: Record<string, string>;
    perfekt: string;
    governing?: string;
  };
  noun_forms?: { singular: string; plural: string; genitiv: string };
  synonyms?: string[];
}

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  A2: "bg-green-500/15 text-green-400 border-green-500/30",
  B1: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  B2: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  C1: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  C2: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const ARTICLE_COLORS: Record<string, string> = {
  der: "bg-blue-500/15 text-blue-400",
  die: "bg-pink-500/15 text-pink-400",
  das: "bg-emerald-500/15 text-emerald-400",
};

const BAMBOO = Array.from({ length: 10 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 14 + 8, delay: Math.random() * 5, dur: 8 + Math.random() * 6,
}));

const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.08, duration: 0.35 },
});

/* ── Conjugation Table ── */
const ConjugationTable = ({ title, data, icon }: { title: string; data: Record<string, string>; icon?: string }) => {
  const pronouns = [
    ["ich", data.ich], ["du", data.du], ["er/sie/es", data.er_sie_es],
    ["wir", data.wir], ["ihr", data.ihr], ["sie/Sie", data.sie_Sie],
  ];
  return (
    <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
      <div className="px-4 py-2.5 bg-secondary/60 border-b border-border flex items-center gap-2">
        <span>{icon || "📝"}</span>
        <span className="font-display font-semibold text-sm text-foreground">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-0">
        {pronouns.map(([pronoun, form], i) => (
          <div key={pronoun} className={`px-4 py-2.5 flex items-center gap-2 ${i % 2 === 0 ? "border-r border-border" : ""} ${i < 4 ? "border-b border-border/50" : ""}`}>
            <span className="text-xs text-muted-foreground w-14 shrink-0">{pronoun}</span>
            <span className="text-sm font-medium text-foreground">{form}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const WordLookup = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [word, setWord] = useState("");
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [fallbackResult, setFallbackResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ german: string; article: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const q = word.trim().toLowerCase();
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("vocab_cards").select("german, article")
        .ilike("german", `${q}%`).order("german").limit(8);
      if (data && data.length > 0) {
        const unique = Array.from(new Map(data.map(d => [d.german.toLowerCase(), d])).values());
        setSuggestions(unique);
        setShowSuggestions(true);
      } else { setSuggestions([]); setShowSuggestions(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [word]);

  const handleLookup = async () => {
    if (!word.trim()) return;
    setLoading(true);
    setWordData(null);
    setFallbackResult("");
    setSearched(true);
    setShowSuggestions(false);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-word", {
        body: { word: word.trim(), lang },
      });
      if (error) throw error;
      if (data?.structured) {
        setWordData(data.structured);
      } else {
        setFallbackResult(data?.result || (lang === "uk" ? "Нічого не знайдено" : "Ничего не найдено"));
      }
    } catch {
      setFallbackResult(lang === "uk" ? "❌ Помилка. Спробуйте ще раз." : "❌ Ошибка. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {BAMBOO.map(p => (
        <motion.div key={p.id} className="absolute pointer-events-none text-primary/8 select-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, fontSize: p.size }}
          animate={{ y: [0, -25, 0], rotate: [0, 15, -10, 0], opacity: [0.1, 0.25, 0.1] }}
          transition={{ duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
        >🎋</motion.div>
      ))}

      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col h-full px-4 py-4 md:px-8 md:py-6 max-w-2xl mx-auto">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 mb-6">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/dictionary")}
            className="p-2.5 rounded-xl bg-secondary/80 border border-border text-muted-foreground hover:text-foreground transition-colors backdrop-blur-sm">
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
              <span>🐼</span> {lang === "uk" ? "Панда-словник" : "Панда-словарь"}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "uk" ? "Знайди будь-яке німецьке слово" : "Найди любое немецкое слово"}
            </p>
          </div>
        </motion.div>

        {/* Panda */}
        <AnimatePresence mode="wait">
          {!searched ? (
            <motion.div key="idle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }} transition={{ duration: 0.4 }}
              className="flex flex-col items-center mb-4">
              <div className="w-48 h-48 md:w-56 md:h-56">
                <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-6xl animate-bounce">🐼</div>}>
                  <Panda3D stageImage={pandaStudying} className="rounded-2xl" />
                </Suspense>
              </div>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="relative mt-2">
                <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl px-5 py-3 text-center max-w-xs">
                  <p className="text-sm text-foreground font-medium">
                    {lang === "uk" ? "Напиши слово, і я знайду все про нього! 📚" : "Напиши слово, и я найду всё о нём! 📚"}
                  </p>
                </div>
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card/80 border-l border-t border-border rotate-45" />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="small" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 mb-4">
              <motion.div animate={{ y: [0, -4, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-3xl">🐼</motion.div>
              {loading && (
                <motion.p initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="text-sm text-muted-foreground italic">
                  {lang === "uk" ? "Шукаю... 🔍" : "Ищу... 🔍"}
                </motion.p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="relative mb-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-emerald-500/20 to-primary/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input type="text"
                  placeholder={lang === "uk" ? "Введіть слово німецькою..." : "Введите слово на немецком..."}
                  value={word} onChange={(e) => setWord(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                  maxLength={60} autoFocus
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-sm"
                />
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                      className="absolute z-50 left-0 right-0 top-full mt-2 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl overflow-hidden">
                      {suggestions.map((s, i) => (
                        <motion.button key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                          className="w-full px-4 py-3 text-left text-sm hover:bg-primary/10 transition-colors flex items-center gap-3 text-foreground border-b border-border/50 last:border-0"
                          onMouseDown={(e) => { e.preventDefault(); setWord(s.german); setShowSuggestions(false); setSuggestions([]); }}>
                          {s.article && (
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${ARTICLE_COLORS[s.article] || "text-muted-foreground"}`}>{s.article}</span>
                          )}
                          <span className="font-medium">{s.german}</span>
                          <Sparkles className="w-3 h-3 text-primary/40 ml-auto" />
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={handleLookup} disabled={!word.trim() || loading}
                className="px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-sm disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-primary/20 flex items-center gap-2">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
                <span className="hidden sm:inline">{lang === "uk" ? "Знайти" : "Найти"}</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Loading */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-4 py-12">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary" />
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div key={i} className="w-2 h-2 rounded-full bg-primary/40"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{lang === "uk" ? "Панда шукає слово..." : "Панда ищет слово..."}</p>
            </motion.div>
          )}

          {/* ── Structured Result ── */}
          {!loading && wordData && (
            <motion.div key="structured" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 pb-8 space-y-3">
              
              {/* Word Header Card */}
              <motion.div {...cardAnim(0)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary/60 via-emerald-500/40 to-primary/60" />
                <div className="p-5 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-2xl">📖</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {wordData.article && (
                        <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${ARTICLE_COLORS[wordData.article] || "bg-secondary text-muted-foreground"}`}>
                          {wordData.article}
                        </span>
                      )}
                      <h2 className="text-2xl font-display font-bold text-foreground">{wordData.word}</h2>
                    </div>
                    <p className="text-lg text-muted-foreground mt-1">{wordData.translation}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-secondary border border-border text-foreground/70 font-medium">
                        {wordData.part_of_speech} <span className="text-muted-foreground">({wordData.part_of_speech_translation})</span>
                      </span>
                      <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${LEVEL_COLORS[wordData.level] || "bg-secondary text-foreground"}`}>
                        {wordData.level}
                      </span>
                    </div>
                  </div>
                  <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="text-2xl shrink-0">
                    🐼
                  </motion.div>
                </div>
              </motion.div>

              {/* Meanings Card */}
              <motion.div {...cardAnim(1)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Lightbulb className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-foreground">
                    {lang === "uk" ? "Значення" : "Значения"}
                  </h3>
                </div>
                <div className="divide-y divide-border/40">
                  {wordData.meanings.map((m, i) => (
                    <div key={i} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{m.meaning}</p>
                          <div className="mt-2 pl-3 border-l-2 border-primary/20 space-y-1">
                            <p className="text-sm text-foreground/80 italic">{m.example_de}</p>
                            <p className="text-xs text-muted-foreground">{m.example_translation}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Conjugation Card (Verbs) */}
              {wordData.conjugation && (
                <motion.div {...cardAnim(2)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Table2 className="w-4 h-4 text-blue-400" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground">
                      {lang === "uk" ? "Відмінювання" : "Спряжение"}
                    </h3>
                    {wordData.conjugation.governing && (
                      <span className="ml-auto text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {wordData.conjugation.governing}
                      </span>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <ConjugationTable title="Präsens" data={wordData.conjugation.präsens} icon="🟢" />
                    <ConjugationTable title="Präteritum" data={wordData.conjugation.präteritum} icon="🔵" />
                    <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 flex items-center gap-3">
                      <span>🟣</span>
                      <span className="text-sm font-display font-semibold text-foreground">Perfekt:</span>
                      <span className="text-sm text-foreground/90 font-medium">{wordData.conjugation.perfekt}</span>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Noun Forms Card */}
              {wordData.noun_forms && (
                <motion.div {...cardAnim(2)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-pink-500/10 flex items-center justify-center">
                      <Layers className="w-4 h-4 text-pink-400" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground">
                      {lang === "uk" ? "Форми" : "Формы"}
                    </h3>
                  </div>
                  <div className="p-4 grid grid-cols-3 gap-3">
                    {[
                      [lang === "uk" ? "Однина" : "Ед. число", wordData.noun_forms.singular],
                      [lang === "uk" ? "Множина" : "Мн. число", wordData.noun_forms.plural],
                      ["Genitiv", wordData.noun_forms.genitiv],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                        <p className="text-sm font-semibold text-foreground">{value}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Synonyms Card */}
              {wordData.synonyms && wordData.synonyms.length > 0 && (
                <motion.div {...cardAnim(3)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Languages className="w-4 h-4 text-emerald-400" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground">
                      {lang === "uk" ? "Синоніми" : "Синонимы"}
                    </h3>
                  </div>
                  <div className="px-5 py-4 flex flex-wrap gap-2">
                    {wordData.synonyms.map((s, i) => (
                      <motion.button key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => { setWord(s); handleLookup(); }}
                        className="px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors">
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Search another */}
              <motion.button {...cardAnim(4)}
                onClick={() => { setWord(""); setWordData(null); setFallbackResult(""); setSearched(false); }}
                className="w-full py-3 rounded-xl border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium flex items-center justify-center gap-2">
                <Search className="w-4 h-4" />
                {lang === "uk" ? "Шукати інше слово" : "Искать другое слово"}
              </motion.button>
            </motion.div>
          )}

          {/* Fallback plain text */}
          {!loading && !wordData && fallbackResult && (
            <motion.div key="fallback" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 pb-8">
              <div className="rounded-2xl border border-border bg-card/90 p-5">
                <p className="text-sm text-foreground whitespace-pre-wrap">{fallbackResult}</p>
              </div>
              <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                onClick={() => { setWord(""); setFallbackResult(""); setSearched(false); }}
                className="mt-4 w-full py-3 rounded-xl border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium flex items-center justify-center gap-2">
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
