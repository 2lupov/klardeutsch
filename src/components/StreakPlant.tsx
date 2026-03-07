import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface StreakPlantProps {
  streak: number;
  canClaim: boolean;
  compact?: boolean;
}

/**
 * Visual stages of the panda:
 * 0 = sleeping (missed day), 1 = waking up, 2 = sitting, 3 = reading,
 * 4 = studying hard, 5 = writing, 6 = graduated, 7+ = master panda
 */
const STAGES = [
  { emoji: "😴", nameRu: "Дрыхнет...", nameUk: "Дрімає...", color: "text-muted-foreground" },
  { emoji: "🐼", nameRu: "Проснулась!", nameUk: "Прокинулась!", color: "text-foreground" },
  { emoji: "📖", nameRu: "Читает", nameUk: "Читає", color: "text-green-400" },
  { emoji: "✏️", nameRu: "Пишет", nameUk: "Пише", color: "text-green-400" },
  { emoji: "📚", nameRu: "Зубрит", nameUk: "Зубрить", color: "text-green-500" },
  { emoji: "🎓", nameRu: "Учёная", nameUk: "Вчена", color: "text-green-500" },
  { emoji: "🏆", nameRu: "Отличница", nameUk: "Відмінниця", color: "text-yellow-500" },
  { emoji: "👑", nameRu: "Мастер!", nameUk: "Майстер!", color: "text-primary" },
];

const MOTIVATIONS_RU = [
  "Панда уснула на дереве... Разбуди её!",
  "Панда проснулась — пора учиться!",
  "Панда читает учебник! Так держать!",
  "Панда делает заметки! Молодец!",
  "Панда зубрит без остановки!",
  "Панда уже учёная! Продолжай!",
  "Панда-отличница! Не бросай!",
  "Панда — настоящий мастер! 🌟",
];

const MOTIVATIONS_UK = [
  "Панда заснула на дереві... Розбуди її!",
  "Панда прокинулась — час вчитися!",
  "Панда читає підручник! Так тримати!",
  "Панда робить нотатки! Молодець!",
  "Панда зубрить без зупинки!",
  "Панда вже вчена! Продовжуй!",
  "Панда-відмінниця! Не кидай!",
  "Панда — справжній майстер! 🌟",
];

function getStageIndex(streak: number, canClaim: boolean): number {
  if (canClaim && streak <= 1) return 0;
  if (streak <= 0) return 0;
  if (streak === 1) return 1;
  if (streak === 2) return 2;
  if (streak === 3) return 3;
  if (streak <= 5) return 4;
  if (streak <= 7) return 5;
  if (streak <= 14) return 6;
  return 7;
}

const StreakPlant = ({ streak, canClaim, compact = false }: StreakPlantProps) => {
  const { lang } = useLanguage();
  const isRu = lang === "ru";
  const [showDialog, setShowDialog] = useState(false);

  const stageIdx = useMemo(() => getStageIndex(streak, canClaim), [streak, canClaim]);
  const stage = STAGES[stageIdx];
  const motivation = isRu ? MOTIVATIONS_RU[stageIdx] : MOTIVATIONS_UK[stageIdx];

  const progressToNext = useMemo(() => {
    if (stageIdx >= 7) return 100;
    const thresholds = [0, 1, 2, 3, 5, 7, 14, 21];
    const current = thresholds[stageIdx] || 0;
    const next = thresholds[stageIdx + 1] || 21;
    return Math.min(100, Math.round(((streak - current) / (next - current)) * 100));
  }, [streak, stageIdx]);

  // Compact = button in profile header
  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowDialog(true)}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all"
        >
          <span className={`text-lg ${stageIdx === 0 ? "animate-pulse" : ""}`}>
            {stageIdx === 0 ? "😴" : "🐼"}
          </span>
          {/* Streak badge */}
          {streak > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
              {streak}
            </span>
          )}
          {canClaim && (
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-background animate-pulse" />
          )}
        </button>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="glass-card border-primary/20 max-w-xs">
            <DialogHeader>
              <DialogTitle className="font-display text-center text-base">
                🐼 {isRu ? "Твоя панда" : "Твоя панда"}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-3 py-3">
              {/* Panda scene */}
              <div className="relative">
                <span
                  className={`text-6xl block transition-transform duration-500 ${
                    stageIdx === 0 ? "animate-pulse scale-90 opacity-70" : "animate-float"
                  }`}
                >
                  {stageIdx === 0 ? "😴🌳" : `🐼${stage.emoji}`}
                </span>
              </div>

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
                        ? "hsl(var(--muted-foreground))"
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
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Full view (used in DailyBonusDialog)
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <span
          className={`text-6xl block transition-transform duration-500 ${
            canClaim && stageIdx === 0 ? "animate-pulse scale-90 opacity-70" : "animate-float"
          }`}
        >
          {stageIdx === 0 ? "😴🌳" : `🐼${stage.emoji}`}
        </span>
      </div>

      <div className="text-center">
        <p className={`font-display font-bold text-sm ${stage.color}`}>
          {isRu ? stage.nameRu : stage.nameUk}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{motivation}</p>
      </div>

      <div className="w-full max-w-[180px]">
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progressToNext}%`,
              background: stageIdx === 0
                ? "hsl(var(--muted-foreground))"
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
