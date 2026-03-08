import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, RotateCcw, Zap, Trophy, HelpCircle, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type WordPuzzle = {
  parts: string[];
  solution: string;
  meaningRu: string;
  meaningUk: string;
  funFact?: { ru: string; uk: string };
  difficulty: 1 | 2 | 3;
};

const puzzles: WordPuzzle[] = [
  // Easy (2 parts)
  {
    parts: ["Haus", "tür"],
    solution: "Haustür",
    meaningRu: "Входная дверь",
    meaningUk: "Вхідні двері",
    difficulty: 1,
  },
  {
    parts: ["Hand", "schuh"],
    solution: "Handschuh",
    meaningRu: "Перчатка (буквально: ботинок для руки)",
    meaningUk: "Рукавичка (буквально: черевик для руки)",
    funFact: { ru: "🧤 Немцы надевают «обувь» на руки!", uk: "🧤 Німці надягають «взуття» на руки!" },
    difficulty: 1,
  },
  {
    parts: ["Kühl", "schrank"],
    solution: "Kühlschrank",
    meaningRu: "Холодильник (холодный шкаф)",
    meaningUk: "Холодильник (холодна шафа)",
    difficulty: 1,
  },
  {
    parts: ["Flug", "zeug"],
    solution: "Flugzeug",
    meaningRu: "Самолёт (летающая штука)",
    meaningUk: "Літак (літаюча штука)",
    difficulty: 1,
  },
  {
    parts: ["Wasser", "fall"],
    solution: "Wasserfall",
    meaningRu: "Водопад",
    meaningUk: "Водоспад",
    difficulty: 1,
  },
  {
    parts: ["Schild", "kröte"],
    solution: "Schildkröte",
    meaningRu: "Черепаха (щит + жаба)",
    meaningUk: "Черепаха (щит + жаба)",
    funFact: { ru: "🐢 Черепаха = жаба со щитом!", uk: "🐢 Черепаха = жаба зі щитом!" },
    difficulty: 1,
  },
  {
    parts: ["Feuer", "wehr"],
    solution: "Feuerwehr",
    meaningRu: "Пожарная служба",
    meaningUk: "Пожежна служба",
    difficulty: 1,
  },
  {
    parts: ["Staub", "sauger"],
    solution: "Staubsauger",
    meaningRu: "Пылесос (высасыватель пыли)",
    meaningUk: "Пилосос (висмоктувач пилу)",
    difficulty: 1,
  },
  // Medium (3 parts)
  {
    parts: ["Kranken", "haus", "bett"],
    solution: "Krankenhausbett",
    meaningRu: "Больничная кровать",
    meaningUk: "Лікарняне ліжко",
    difficulty: 2,
  },
  {
    parts: ["Geschwindig", "keits", "begrenzung"],
    solution: "Geschwindigkeitsbegrenzung",
    meaningRu: "Ограничение скорости",
    meaningUk: "Обмеження швидкості",
    difficulty: 2,
  },
  {
    parts: ["Weihnachts", "baum", "schmuck"],
    solution: "Weihnachtsbaumschmuck",
    meaningRu: "Ёлочные украшения",
    meaningUk: "Ялинкові прикраси",
    difficulty: 2,
  },
  {
    parts: ["Finger", "nagel", "lack"],
    solution: "Fingernagellack",
    meaningRu: "Лак для ногтей",
    meaningUk: "Лак для нігтів",
    difficulty: 2,
  },
  {
    parts: ["Fahr", "karten", "automat"],
    solution: "Fahrkartenautomat",
    meaningRu: "Автомат по продаже билетов",
    meaningUk: "Автомат з продажу квитків",
    difficulty: 2,
  },
  {
    parts: ["Haupt", "bahn", "hof"],
    solution: "Hauptbahnhof",
    meaningRu: "Главный вокзал",
    meaningUk: "Головний вокзал",
    difficulty: 2,
  },
  {
    parts: ["Kranken", "ver", "sicherung"],
    solution: "Krankenversicherung",
    meaningRu: "Медицинская страховка",
    meaningUk: "Медична страховка",
    difficulty: 2,
  },
  // Hard (4+ parts)
  {
    parts: ["Donau", "dampf", "schiff", "fahrt"],
    solution: "Donaudampfschifffahrt",
    meaningRu: "Плавание на пароходе по Дунаю",
    meaningUk: "Плавання на пароплаві по Дунаю",
    funFact: { ru: "🚢 Классика немецкого языка — 4 'f' подряд!", uk: "🚢 Класика німецької мови — 4 'f' підряд!" },
    difficulty: 3,
  },
  {
    parts: ["Kraft", "fahr", "zeug", "haft", "pflicht"],
    solution: "Kraftfahrzeughaftpflicht",
    meaningRu: "Автострахование гражданской ответственности",
    meaningUk: "Автострахування цивільної відповідальності",
    difficulty: 3,
  },
  {
    parts: ["Arbeits", "un", "fähigkeits", "bescheinigung"],
    solution: "Arbeitsunfähigkeitsbescheinigung",
    meaningRu: "Больничный лист",
    meaningUk: "Лікарняний лист",
    funFact: { ru: "📋 29 букв просто чтобы сказать «больничный»!", uk: "📋 29 літер просто щоб сказати «лікарняний»!" },
    difficulty: 3,
  },
  {
    parts: ["Rind", "fleisch", "etikettierungs", "überwachung"],
    solution: "Rindfleischetikettierungsüberwachung",
    meaningRu: "Контроль маркировки говядины",
    meaningUk: "Контроль маркування яловичини",
    funFact: { ru: "🐄 Бывший рекордсмен среди официальных слов!", uk: "🐄 Колишній рекордсмен серед офіційних слів!" },
    difficulty: 3,
  },
  {
    parts: ["Straßen", "bahn", "halte", "stelle"],
    solution: "Straßenbahnhaltestelle",
    meaningRu: "Остановка трамвая",
    meaningUk: "Зупинка трамвая",
    difficulty: 3,
  },
  {
    parts: ["Leben", "mittel", "geschäft"],
    solution: "Lebensmittelgeschäft",
    meaningRu: "Продуктовый магазин",
    meaningUk: "Продуктовий магазин",
    difficulty: 2,
  },
];

const Wortbaustelle = ({ onBack }: { onBack: () => void }) => {
  const { lang } = useLanguage();
  const { isMobile } = usePlatform();
  const isRu = lang === "ru";

  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [selectedParts, setSelectedParts] = useState<number[]>([]);
  const [availableParts, setAvailableParts] = useState<string[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [shuffledPuzzles, setShuffledPuzzles] = useState<WordPuzzle[]>([]);

  // Shuffle puzzles on mount
  useEffect(() => {
    const shuffled = [...puzzles].sort(() => Math.random() - 0.5);
    setShuffledPuzzles(shuffled);
  }, []);

  const currentPuzzle = shuffledPuzzles[currentPuzzleIndex];

  // Shuffle available parts when puzzle changes
  useEffect(() => {
    if (currentPuzzle) {
      const shuffled = [...currentPuzzle.parts].sort(() => Math.random() - 0.5);
      setAvailableParts(shuffled);
      setSelectedParts([]);
      setIsCorrect(null);
      setShowHint(false);
    }
  }, [currentPuzzle]);

  const handleSelectPart = (index: number) => {
    if (isCorrect !== null) return;
    setSelectedParts([...selectedParts, index]);
  };

  const handleRemovePart = (selectedIndex: number) => {
    if (isCorrect !== null) return;
    setSelectedParts(selectedParts.filter((_, i) => i !== selectedIndex));
  };

  const builtWord = selectedParts.map((i) => availableParts[i]).join("");

  const checkAnswer = useCallback(() => {
    if (!currentPuzzle) return;
    const correct = builtWord === currentPuzzle.solution;
    setIsCorrect(correct);
    setTotalAnswered((t) => t + 1);

    if (correct) {
      const points = currentPuzzle.difficulty * 10 * (streak + 1);
      setScore((s) => s + points);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }, [builtWord, currentPuzzle, streak]);

  const nextPuzzle = () => {
    if (currentPuzzleIndex + 1 >= shuffledPuzzles.length) {
      setGameComplete(true);
    } else {
      setCurrentPuzzleIndex((i) => i + 1);
    }
  };

  const resetGame = () => {
    const shuffled = [...puzzles].sort(() => Math.random() - 0.5);
    setShuffledPuzzles(shuffled);
    setCurrentPuzzleIndex(0);
    setScore(0);
    setStreak(0);
    setTotalAnswered(0);
    setGameComplete(false);
  };

  if (!currentPuzzle && !gameComplete) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (gameComplete) {
    const accuracy = totalAnswered > 0 ? Math.round((score / (totalAnswered * 30)) * 100) : 0;
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-card p-8 text-center"
        >
          <div className="text-6xl mb-4">🏗️</div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-2">
            {isRu ? "Стройка завершена!" : "Будівництво завершено!"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {isRu ? "Ты построил все слова!" : "Ти побудував усі слова!"}
          </p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="glass-card p-4">
              <div className="text-3xl font-bold text-primary">{score}</div>
              <div className="text-xs text-muted-foreground">{isRu ? "Очки" : "Очки"}</div>
            </div>
            <div className="glass-card p-4">
              <div className="text-3xl font-bold text-primary">{totalAnswered}</div>
              <div className="text-xs text-muted-foreground">{isRu ? "Слов собрано" : "Слів зібрано"}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button onClick={resetGame} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              {isRu ? "Ещё раз" : "Ще раз"}
            </Button>
            <Button onClick={onBack} variant="outline" className="flex-1">
              {isRu ? "Выйти" : "Вийти"}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const difficultyStars = Array(currentPuzzle.difficulty).fill("⭐").join("");

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {isRu ? "Назад" : "Назад"}
        </button>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-sm">
            <Zap className="w-4 h-4 text-primary" />
            <span className="font-bold text-foreground">{streak}</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="font-bold text-foreground">{score}</span>
          </div>
        </div>
      </div>

      {/* Title */}
      <h1 className="font-display text-xl font-bold text-foreground mb-1 flex items-center gap-2">
        🏗️ {isRu ? "Стройплощадка слов" : "Будмайданчик слів"}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {isRu
          ? "Собери немецкое составное слово из кубиков"
          : "Збери німецьке складене слово з кубиків"}
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentPuzzleIndex + 1) / shuffledPuzzles.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {currentPuzzleIndex + 1}/{shuffledPuzzles.length}
        </span>
      </div>

      {/* Difficulty */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">
          {isRu ? "Сложность:" : "Складність:"}
        </span>
        <span className="text-sm">{difficultyStars}</span>
      </div>

      {/* Building area */}
      <div className="glass-card p-6 mb-4">
        <div className="text-xs text-muted-foreground mb-2 text-center">
          {isRu ? "Твоё слово:" : "Твоє слово:"}
        </div>
        <div className="min-h-[60px] flex items-center justify-center flex-wrap gap-2 p-3 rounded-xl bg-background/50 border-2 border-dashed border-border">
          <AnimatePresence mode="popLayout">
            {selectedParts.length === 0 ? (
              <span className="text-muted-foreground text-sm">
                {isRu ? "Нажми на кубики ниже" : "Натисни на кубики нижче"}
              </span>
            ) : (
              selectedParts.map((partIndex, i) => (
                <motion.button
                  key={`${partIndex}-${i}`}
                  initial={{ scale: 0, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0, y: -20 }}
                  onClick={() => handleRemovePart(i)}
                  className={cn(
                    "px-3 py-2 rounded-lg font-bold text-lg transition-all",
                    isCorrect === true && "bg-green-500/20 text-green-400 border border-green-500/30",
                    isCorrect === false && "bg-destructive/20 text-destructive border border-destructive/30",
                    isCorrect === null && "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                  )}
                  disabled={isCorrect !== null}
                >
                  {availableParts[partIndex]}
                </motion.button>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Result display */}
        {isCorrect !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-center"
          >
            {isCorrect ? (
              <div className="space-y-2">
                <div className="text-2xl">✅</div>
                <div className="text-lg font-bold text-green-400">{currentPuzzle.solution}</div>
                <div className="text-sm text-muted-foreground">
                  {isRu ? currentPuzzle.meaningRu : currentPuzzle.meaningUk}
                </div>
                {currentPuzzle.funFact && (
                  <div className="text-sm text-primary mt-2 p-2 rounded-lg bg-primary/10">
                    {isRu ? currentPuzzle.funFact.ru : currentPuzzle.funFact.uk}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-2xl">❌</div>
                <div className="text-sm text-muted-foreground">
                  {isRu ? "Правильный ответ:" : "Правильна відповідь:"}
                </div>
                <div className="text-lg font-bold text-foreground">{currentPuzzle.solution}</div>
                <div className="text-sm text-muted-foreground">
                  {isRu ? currentPuzzle.meaningRu : currentPuzzle.meaningUk}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Available parts */}
      {isCorrect === null && (
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {availableParts.map((part, i) => {
            const isUsed = selectedParts.includes(i);
            return (
              <motion.button
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => !isUsed && handleSelectPart(i)}
                disabled={isUsed}
                className={cn(
                  "px-4 py-3 rounded-xl font-bold text-lg transition-all shadow-lg",
                  isUsed
                    ? "bg-muted/30 text-muted-foreground opacity-40"
                    : "bg-gradient-to-br from-secondary to-secondary/80 text-foreground hover:from-primary/30 hover:to-primary/20 border border-border hover:border-primary/30"
                )}
              >
                {part}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Hint */}
      {showHint && isCorrect === null && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="glass-card p-4 mb-4 text-center"
        >
          <p className="text-sm text-muted-foreground">
            {isRu ? "Подсказка: начинается с" : "Підказка: починається з"}{" "}
            <span className="font-bold text-primary">{currentPuzzle.parts[0]}</span>
          </p>
        </motion.div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {isCorrect === null ? (
          <>
            <Button
              variant="outline"
              onClick={() => setShowHint(true)}
              disabled={showHint}
              className="flex-1"
            >
              <HelpCircle className="w-4 h-4 mr-2" />
              {isRu ? "Подсказка" : "Підказка"}
            </Button>
            <Button
              onClick={checkAnswer}
              disabled={selectedParts.length !== currentPuzzle.parts.length}
              className="flex-1"
            >
              {isRu ? "Проверить" : "Перевірити"}
            </Button>
          </>
        ) : (
          <Button onClick={nextPuzzle} className="w-full">
            {currentPuzzleIndex + 1 >= shuffledPuzzles.length
              ? isRu ? "Завершить" : "Завершити"
              : isRu ? "Дальше" : "Далі"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default Wortbaustelle;