import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, RotateCcw, Trophy, ChevronRight, Lightbulb } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Sentence = {
  words: string[];
  correct: string[];
  translationRu: string;
  translationUk: string;
  level: "A1" | "A2" | "B1" | "B2";
};

const sentences: Sentence[] = [
  // A1
  { words: ["bin", "Ich", "aus", "Russland"], correct: ["Ich", "bin", "aus", "Russland"], translationRu: "Я из России", translationUk: "Я з Росії", level: "A1" },
  { words: ["heißt", "Wie", "du", "?"], correct: ["Wie", "heißt", "du", "?"], translationRu: "Как тебя зовут?", translationUk: "Як тебе звати?", level: "A1" },
  { words: ["Kaffee", "Ich", "trinke", "gern"], correct: ["Ich", "trinke", "gern", "Kaffee"], translationRu: "Я люблю пить кофе", translationUk: "Я люблю пити каву", level: "A1" },
  { words: ["Supermarkt", "Wir", "gehen", "in", "den"], correct: ["Wir", "gehen", "in", "den", "Supermarkt"], translationRu: "Мы идём в супермаркет", translationUk: "Ми йдемо в супермаркет", level: "A1" },
  { words: ["du", "Wo", "wohnst", "?"], correct: ["Wo", "wohnst", "du", "?"], translationRu: "Где ты живёшь?", translationUk: "Де ти живеш?", level: "A1" },
  // A2
  { words: ["muss", "Ich", "zum", "morgen", "Arzt"], correct: ["Ich", "muss", "morgen", "zum", "Arzt"], translationRu: "Мне нужно завтра к врачу", translationUk: "Мені потрібно завтра до лікаря", level: "A2" },
  { words: ["gegessen", "Ich", "habe", "Pizza", "heute"], correct: ["Ich", "habe", "heute", "Pizza", "gegessen"], translationRu: "Я сегодня ел пиццу", translationUk: "Я сьогодні їв піцу", level: "A2" },
  { words: ["weil", "lerne", "Deutsch", "ich", "in", "Deutschland", "lebe", ",", "Ich"], correct: ["Ich", "lerne", "Deutsch", ",", "weil", "ich", "in", "Deutschland", "lebe"], translationRu: "Я учу немецкий, потому что живу в Германии", translationUk: "Я вчу німецьку, тому що живу в Німеччині", level: "A2" },
  { words: ["sich", "Er", "hat", "ein", "Auto", "gekauft"], correct: ["Er", "hat", "sich", "ein", "Auto", "gekauft"], translationRu: "Он купил себе машину", translationUk: "Він купив собі машину", level: "A2" },
  // B1
  { words: ["würde", "Ich", "gern", "nach", "Berlin", "fahren"], correct: ["Ich", "würde", "gern", "nach", "Berlin", "fahren"], translationRu: "Я бы с удовольствием поехал в Берлин", translationUk: "Я б із задоволенням поїхав до Берліна", level: "B1" },
  { words: ["obwohl", "kalt", "ist", "er", "geht", "spazieren", ",", "es"], correct: ["er", "geht", "spazieren", ",", "obwohl", "es", "kalt", "ist"], translationRu: "Он гуляет, хотя холодно", translationUk: "Він гуляє, хоча холодно", level: "B1" },
  { words: ["gesagt", "Sie", "hat", "dass", "sie", "kommt", "morgen", ","], correct: ["Sie", "hat", "gesagt", ",", "dass", "sie", "morgen", "kommt"], translationRu: "Она сказала, что придёт завтра", translationUk: "Вона сказала, що прийде завтра", level: "B1" },
  { words: ["je", "Dieses", "Buch", "ist", "das", "beste", ",", "ich", "gelesen", "habe", "das"], correct: ["Dieses", "Buch", "ist", "das", "beste", ",", "das", "ich", "je", "gelesen", "habe"], translationRu: "Это лучшая книга, что я когда-либо читал", translationUk: "Це найкраща книга, яку я коли-небудь читав", level: "B1" },
  // B2
  { words: ["Hätte", "gewusst", "ich", "das", "wäre", "ich", "nicht", "gekommen", ","], correct: ["Hätte", "ich", "das", "gewusst", ",", "wäre", "ich", "nicht", "gekommen"], translationRu: "Если бы я это знал, я бы не пришёл", translationUk: "Якби я це знав, я б не прийшов", level: "B2" },
  { words: ["desto", "Je", "mehr", "man", "übt", "besser", "wird", "man"], correct: ["Je", "mehr", "man", "übt", ",", "desto", "besser", "wird", "man"], translationRu: "Чем больше практикуешься, тем лучше становишься", translationUk: "Чим більше практикуєшся, тим кращим стаєш", level: "B2" },
];

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface Props { onBack: () => void; }

const Satzpuzzle = ({ onBack }: Props) => {
  const { lang } = useLanguage();
  const { isMobile } = usePlatform();
  const [level, setLevel] = useState<"A1" | "A2" | "B1" | "B2" | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [placed, setPlaced] = useState<string[]>([]);
  const [available, setAvailable] = useState<string[]>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [finished, setFinished] = useState(false);

  const levelSentences = useMemo(() => {
    if (!level) return [];
    return shuffle(sentences.filter(s => s.level === level)).slice(0, 8);
  }, [level]);

  const current = levelSentences[currentIndex];

  const startLevel = (l: "A1" | "A2" | "B1" | "B2") => {
    setLevel(l);
    setCurrentIndex(0);
    setScore(0);
    setFinished(false);
  };

  const initRound = useCallback(() => {
    if (!current) return;
    setPlaced([]);
    setAvailable(shuffle(current.words));
    setResult(null);
    setShowHint(false);
  }, [current]);

  useState(() => { if (current) initRound(); });

  // Re-init when currentIndex changes
  useMemo(() => {
    if (current) {
      setPlaced([]);
      setAvailable(shuffle(current.words));
      setResult(null);
      setShowHint(false);
    }
  }, [currentIndex, current]);

  const handleWordClick = (word: string, idx: number) => {
    if (result) return;
    setPlaced(prev => [...prev, word]);
    setAvailable(prev => prev.filter((_, i) => i !== idx));
  };

  const handlePlacedClick = (word: string, idx: number) => {
    if (result) return;
    setAvailable(prev => [...prev, word]);
    setPlaced(prev => prev.filter((_, i) => i !== idx));
  };

  const checkAnswer = () => {
    if (!current) return;
    const isCorrect = placed.join(" ") === current.correct.join(" ");
    setResult(isCorrect ? "correct" : "wrong");
    if (isCorrect) setScore(s => s + 1);
  };

  const nextSentence = () => {
    if (currentIndex + 1 >= levelSentences.length) {
      setFinished(true);
    } else {
      setCurrentIndex(i => i + 1);
    }
  };

  // Level picker
  if (!level) {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <h1 className="font-display text-xl font-bold text-foreground mb-1">🧩 Satzpuzzle</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "uk" ? "Склади правильне речення з перемішаних слів" : "Собери правильное предложение из перемешанных слов"}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["A1", "A2", "B1", "B2"] as const).map(l => (
            <button key={l} onClick={() => startLevel(l)}
              className="glass-card p-6 flex flex-col items-center gap-2 hover:border-primary/30 transition-all">
              <span className="text-2xl font-display font-bold text-gradient">{l}</span>
              <span className="text-xs text-muted-foreground">
                {sentences.filter(s => s.level === l).length} {lang === "uk" ? "речень" : "предложений"}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Finished
  if (finished) {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <div className="glass-card p-8 text-center space-y-4">
          <Trophy className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-display text-xl font-bold text-foreground">
            {lang === "uk" ? "Результат" : "Результат"}
          </h2>
          <p className="text-3xl font-display font-bold text-gradient">{score}/{levelSentences.length}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => { setLevel(null); }}>
              {lang === "uk" ? "Інший рівень" : "Другой уровень"}
            </Button>
            <Button onClick={() => startLevel(level)}>
              <RotateCcw className="w-4 h-4 mr-1" /> {lang === "uk" ? "Ще раз" : "Ещё раз"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!current) return null;

  const translation = lang === "uk" ? current.translationUk : current.translationRu;

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <span className="text-xs text-muted-foreground font-display">
          {currentIndex + 1}/{levelSentences.length} · ✅ {score}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full mb-6">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentIndex) / levelSentences.length) * 100}%` }} />
      </div>

      {/* Placed words area */}
      <div className="glass-card p-4 min-h-[80px] mb-4 flex flex-wrap gap-2 items-start">
        <AnimatePresence mode="popLayout">
          {placed.map((word, i) => (
            <motion.button
              key={`placed-${i}-${word}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1, backgroundColor: result === "wrong" ? "hsl(var(--destructive) / 0.15)" : result === "correct" ? "hsl(var(--primary) / 0.15)" : undefined }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => handlePlacedClick(word, i)}
              className={cn(
                "px-3 py-1.5 rounded-lg border text-sm font-display font-medium transition-colors",
                result === "correct" ? "border-primary/30 text-primary bg-primary/10" :
                result === "wrong" ? "border-destructive/30 text-destructive bg-destructive/10" :
                "border-primary/20 text-foreground bg-primary/5 hover:bg-primary/10"
              )}
            >
              {word}
            </motion.button>
          ))}
        </AnimatePresence>
        {placed.length === 0 && (
          <span className="text-xs text-muted-foreground/50 italic">
            {lang === "uk" ? "Натисни на слова нижче..." : "Нажми на слова ниже..."}
          </span>
        )}
      </div>

      {/* Available words */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        <AnimatePresence mode="popLayout">
          {available.map((word, i) => (
            <motion.button
              key={`avail-${i}-${word}`}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={() => handleWordClick(word, i)}
              disabled={!!result}
              className="px-3 py-1.5 rounded-lg border border-border text-sm font-display font-medium text-foreground bg-card hover:bg-muted/50 transition-colors disabled:opacity-50"
            >
              {word}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      {/* Hint */}
      {showHint && !result && (
        <div className="glass-card p-3 mb-4 text-center">
          <p className="text-xs text-muted-foreground">💡 {translation}</p>
        </div>
      )}

      {/* Result feedback */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn("glass-card p-4 mb-4 text-center", result === "correct" ? "border-primary/30" : "border-destructive/30")}
        >
          <p className="text-sm font-display font-semibold mb-1">
            {result === "correct" ? "✅ " + (lang === "uk" ? "Правильно!" : "Правильно!") : "❌ " + (lang === "uk" ? "Неправильно" : "Неправильно")}
          </p>
          {result === "wrong" && (
            <p className="text-xs text-muted-foreground">
              {current.correct.join(" ")}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">📖 {translation}</p>
        </motion.div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2">
        {!result ? (
          <>
            <Button variant="outline" size="sm" onClick={() => setShowHint(true)} disabled={showHint}>
              <Lightbulb className="w-4 h-4 mr-1" /> {lang === "uk" ? "Підказка" : "Подсказка"}
            </Button>
            <Button className="flex-1" onClick={checkAnswer} disabled={placed.length !== current.words.length}>
              {lang === "uk" ? "Перевірити" : "Проверить"}
            </Button>
          </>
        ) : (
          <Button className="flex-1" onClick={nextSentence}>
            {lang === "uk" ? "Далі" : "Дальше"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default Satzpuzzle;
