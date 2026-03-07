import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Droplets } from "lucide-react";

interface StreakPlantProps {
  streak: number;
  canClaim: boolean;
  compact?: boolean;
}

/**
 * Visual stages of the plant:
 * 0 = wilted (missed day), 1 = seed, 2 = sprout, 3 = small plant,
 * 4 = growing, 5 = bush, 6 = tree, 7+ = blooming tree
 */
const STAGES = [
  { emoji: "🥀", nameRu: "Вянет...", nameUk: "В'яне...", color: "text-destructive" },
  { emoji: "🌰", nameRu: "Семечко", nameUk: "Насінинка", color: "text-muted-foreground" },
  { emoji: "🌱", nameRu: "Росток", nameUk: "Паросток", color: "text-green-400" },
  { emoji: "🪴", nameRu: "Побег", nameUk: "Пагін", color: "text-green-400" },
  { emoji: "🌿", nameRu: "Кустик", nameUk: "Кущик", color: "text-green-500" },
  { emoji: "🌳", nameRu: "Деревце", nameUk: "Деревце", color: "text-green-500" },
  { emoji: "🌲", nameRu: "Дерево", nameUk: "Дерево", color: "text-green-600" },
  { emoji: "🌸", nameRu: "Цветение!", nameUk: "Цвітіння!", color: "text-pink-400" },
];

const MOTIVATIONS_RU = [
  "Не дай растению завянуть!",
  "Поливай каждый день — учись!",
  "Твоё деревце растёт!",
  "Уже подросло! Продолжай!",
  "Красивый кустик! Не бросай!",
  "Настоящее дерево! Молодец!",
  "Мощное дерево знаний!",
  "Оно цветёт! Ты легенда! 🌟",
];

const MOTIVATIONS_UK = [
  "Не дай рослині зів'янути!",
  "Поливай щодня — вчися!",
  "Твоє деревце росте!",
  "Вже підросло! Продовжуй!",
  "Гарний кущик! Не кидай!",
  "Справжнє дерево! Молодець!",
  "Потужне дерево знань!",
  "Воно цвіте! Ти легенда! 🌟",
];

function getStageIndex(streak: number, canClaim: boolean): number {
  // If user hasn't claimed today and streak would reset, show wilted
  if (canClaim && streak <= 1) return 0; // wilted / needs watering
  if (streak <= 0) return 0;
  if (streak === 1) return 1;
  if (streak === 2) return 2;
  if (streak === 3) return 3;
  if (streak <= 5) return 4;
  if (streak <= 7) return 5;
  if (streak <= 14) return 6;
  return 7; // 14+ days
}

const StreakPlant = ({ streak, canClaim, compact = false }: StreakPlantProps) => {
  const { lang } = useLanguage();
  const isRu = lang === "ru";

  const stageIdx = useMemo(() => getStageIndex(streak, canClaim), [streak, canClaim]);
  const stage = STAGES[stageIdx];
  const motivation = isRu ? MOTIVATIONS_RU[stageIdx] : MOTIVATIONS_UK[stageIdx];

  // Progress to next stage (visual bar)
  const progressToNext = useMemo(() => {
    if (stageIdx >= 7) return 100;
    const thresholds = [0, 1, 2, 3, 5, 7, 14, 21];
    const current = thresholds[stageIdx] || 0;
    const next = thresholds[stageIdx + 1] || 21;
    return Math.min(100, Math.round(((streak - current) / (next - current)) * 100));
  }, [streak, stageIdx]);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-2xl ${canClaim && stageIdx === 0 ? "animate-pulse" : ""}`}>
          {stage.emoji}
        </span>
        <div className="flex flex-col">
          <span className="text-xs font-display font-bold text-foreground">
            {streak} {isRu ? (streak === 1 ? "день" : streak < 5 ? "дня" : "дней") : (streak === 1 ? "день" : streak < 5 ? "дні" : "днів")}
          </span>
          <span className={`text-[10px] ${stage.color}`}>{isRu ? stage.nameRu : stage.nameUk}</span>
        </div>
        {canClaim && (
          <Droplets className="w-3.5 h-3.5 text-primary animate-bounce" />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Plant */}
      <div className="relative">
        <span
          className={`text-6xl block transition-transform duration-500 ${
            canClaim && stageIdx === 0 ? "animate-pulse scale-90 opacity-70" : "animate-float"
          }`}
        >
          {stage.emoji}
        </span>
        {canClaim && (
          <div className="absolute -top-1 -right-1">
            <Droplets className="w-5 h-5 text-primary animate-bounce" />
          </div>
        )}
      </div>

      {/* Stage name */}
      <div className="text-center">
        <p className={`font-display font-bold text-sm ${stage.color}`}>
          {isRu ? stage.nameRu : stage.nameUk}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{motivation}</p>
      </div>

      {/* Growth progress bar */}
      <div className="w-full max-w-[180px]">
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressToNext}%`,
              background: stageIdx === 0
                ? "hsl(var(--destructive))"
                : "linear-gradient(90deg, hsl(142 76% 36%), hsl(var(--primary)))",
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">
            {isRu ? stage.nameRu : stage.nameUk}
          </span>
          {stageIdx < 7 && (
            <span className="text-[10px] text-muted-foreground">
              {isRu ? STAGES[stageIdx + 1].nameRu : STAGES[stageIdx + 1].nameUk}
            </span>
          )}
        </div>
      </div>

      {/* Streak counter */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10">
        <span className="text-xs">🔥</span>
        <span className="text-xs font-display font-bold text-primary">
          {streak} {isRu ? (streak === 1 ? "день" : streak < 5 ? "дня" : "дней") : (streak === 1 ? "день" : streak < 5 ? "дні" : "днів")}
        </span>
      </div>
    </div>
  );
};

export default StreakPlant;
