import { useState, useMemo, useCallback } from "react";
import { ArrowLeft, RotateCcw, Trophy, Shuffle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type Idiom = {
  german: string;
  meaningRu: string;
  meaningUk: string;
  literalRu?: string;
  literalUk?: string;
};

const allIdioms: Idiom[] = [
  { german: "Daumen drücken", meaningRu: "Желать удачи", meaningUk: "Бажати удачі", literalRu: "Давить большой палец", literalUk: "Тиснути великий палець" },
  { german: "Schwein haben", meaningRu: "Везёт", meaningUk: "Везе", literalRu: "Иметь свинью", literalUk: "Мати свиню" },
  { german: "Tomaten auf den Augen haben", meaningRu: "Не замечать очевидного", meaningUk: "Не бачити очевидного", literalRu: "Иметь помидоры на глазах", literalUk: "Мати помідори на очах" },
  { german: "Das ist mir Wurst", meaningRu: "Мне всё равно", meaningUk: "Мені все одно", literalRu: "Это мне колбаса", literalUk: "Це мені ковбаса" },
  { german: "Ich verstehe nur Bahnhof", meaningRu: "Ничего не понимаю", meaningUk: "Нічого не розумію", literalRu: "Я понимаю только вокзал", literalUk: "Я розумію тільки вокзал" },
  { german: "Die Nase voll haben", meaningRu: "Быть сытым по горло", meaningUk: "Бути ситим по горло", literalRu: "Иметь полный нос", literalUk: "Мати повний ніс" },
  { german: "Ins Fettnäpfchen treten", meaningRu: "Допустить бестактность", meaningUk: "Допустити нетактовність", literalRu: "Наступить в жирную мисочку", literalUk: "Наступити в жирну мисочку" },
  { german: "Einen Vogel haben", meaningRu: "Быть не в своём уме", meaningUk: "Бути не при тямі", literalRu: "Иметь птицу", literalUk: "Мати птаха" },
  { german: "Klar wie Kloßbrühe", meaningRu: "Яснее ясного", meaningUk: "Зрозуміліше за зрозуміле", literalRu: "Ясно как бульон от клёцок", literalUk: "Ясно як бульйон від кльоцок" },
  { german: "Auf dem Holzweg sein", meaningRu: "Ошибаться", meaningUk: "Помилятися", literalRu: "Быть на деревянном пути", literalUk: "Бути на дерев'яному шляху" },
  { german: "Den Nagel auf den Kopf treffen", meaningRu: "Попасть в точку", meaningUk: "Попасти в точку", literalRu: "Попасть гвоздю по шляпке", literalUk: "Потрапити цвяху по капелюху" },
  { german: "Zwei Fliegen mit einer Klappe schlagen", meaningRu: "Убить двух зайцев", meaningUk: "Вбити двох зайців", literalRu: "Убить двух мух одной хлопушкой", literalUk: "Вбити двох мух однією хлопавкою" },
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

const RedewendungenMatch = ({ onBack }: Props) => {
  const { lang } = useLanguage();
  const { isMobile } = usePlatform();
  const [round, setRound] = useState(0);

  const roundIdioms = useMemo(() => shuffle(allIdioms).slice(0, 6), [round]);

  const [selectedLeft, setSelectedLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongPair, setWrongPair] = useState<[number, number] | null>(null);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);

  const shuffledMeanings = useMemo(() => {
    return shuffle(roundIdioms.map((idiom, i) => ({ meaning: lang === "uk" ? idiom.meaningUk : idiom.meaningRu, originalIndex: i })));
  }, [roundIdioms, lang]);

  const handleLeftClick = (idx: number) => {
    if (matched.has(idx)) return;
    setSelectedLeft(idx);
    setWrongPair(null);
  };

  const handleRightClick = (originalIndex: number) => {
    if (selectedLeft === null || matched.has(originalIndex)) return;
    if (selectedLeft === originalIndex) {
      setMatched(prev => new Set(prev).add(originalIndex));
      setScore(s => s + 1);
      setSelectedLeft(null);
    } else {
      setWrongPair([selectedLeft, originalIndex]);
      setMistakes(m => m + 1);
      setTimeout(() => { setWrongPair(null); setSelectedLeft(null); }, 800);
    }
  };

  const finished = matched.size === roundIdioms.length;

  const restart = () => {
    setRound(r => r + 1);
    setSelectedLeft(null);
    setMatched(new Set());
    setWrongPair(null);
    setScore(0);
    setMistakes(0);
  };

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <span className="text-xs text-muted-foreground font-display">
          ✅ {matched.size}/{roundIdioms.length} · ❌ {mistakes}
        </span>
      </div>

      <h1 className="font-display text-xl font-bold text-foreground mb-1">🔗 Redewendungen</h1>
      <p className="text-sm text-muted-foreground mb-5">
        {lang === "uk" ? "З'єднай ідіому з її значенням" : "Соедини идиому с её значением"}
      </p>

      {finished ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 text-center space-y-4">
          <Trophy className="w-12 h-12 text-primary mx-auto" />
          <p className="text-3xl font-display font-bold text-gradient">{score}/{roundIdioms.length}</p>
          <p className="text-sm text-muted-foreground">{mistakes === 0 ? "🔥 " + (lang === "uk" ? "Без помилок!" : "Без ошибок!") : `${mistakes} ${lang === "uk" ? "помилок" : "ошибок"}`}</p>
          
          {/* Show literal translations */}
          <div className="text-left space-y-2 pt-4 border-t border-border">
            <p className="text-xs font-display font-semibold text-muted-foreground mb-2">
              {lang === "uk" ? "Буквальний переклад:" : "Буквальный перевод:"}
            </p>
            {roundIdioms.map((idiom, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{idiom.german}</span>
                {" — "}
                {lang === "uk" ? idiom.literalUk : idiom.literalRu}
              </div>
            ))}
          </div>

          <Button onClick={restart} className="mt-4">
            <Shuffle className="w-4 h-4 mr-1" /> {lang === "uk" ? "Нові ідіоми" : "Новые идиомы"}
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Left column: German idioms */}
          <div className="space-y-2">
            {roundIdioms.map((idiom, i) => (
              <motion.button
                key={`left-${i}`}
                onClick={() => handleLeftClick(i)}
                animate={{
                  scale: matched.has(i) ? 0.95 : 1,
                  opacity: matched.has(i) ? 0.4 : 1,
                }}
                className={cn(
                  "w-full p-3 rounded-xl border text-left text-xs font-display font-medium transition-all",
                  matched.has(i) ? "border-primary/20 bg-primary/5 text-primary line-through" :
                  selectedLeft === i ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/30" :
                  wrongPair?.[0] === i ? "border-destructive bg-destructive/10 text-destructive" :
                  "border-border bg-card text-foreground hover:border-primary/30"
                )}
                disabled={matched.has(i)}
              >
                {idiom.german}
              </motion.button>
            ))}
          </div>

          {/* Right column: Meanings (shuffled) */}
          <div className="space-y-2">
            {shuffledMeanings.map((item, i) => (
              <motion.button
                key={`right-${i}`}
                onClick={() => handleRightClick(item.originalIndex)}
                animate={{
                  scale: matched.has(item.originalIndex) ? 0.95 : 1,
                  opacity: matched.has(item.originalIndex) ? 0.4 : 1,
                }}
                className={cn(
                  "w-full p-3 rounded-xl border text-left text-xs font-display font-medium transition-all",
                  matched.has(item.originalIndex) ? "border-primary/20 bg-primary/5 text-primary" :
                  wrongPair?.[1] === item.originalIndex ? "border-destructive bg-destructive/10 text-destructive" :
                  "border-border bg-card text-foreground hover:border-primary/30"
                )}
                disabled={matched.has(item.originalIndex)}
              >
                {item.meaning}
              </motion.button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RedewendungenMatch;
