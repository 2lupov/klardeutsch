import { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import pandaSleeping from "@/assets/mascot/panda-sleeping.png";
import pandaStudying from "@/assets/mascot/panda-studying.png";
import pandaCelebrating from "@/assets/mascot/panda-celebrating.png";
import pandaWaving from "@/assets/mascot/panda-waving.png";

interface StreakPlantProps {
  streak: number;
  canClaim: boolean;
  compact?: boolean;
}

const STAGES = [
  { img: pandaSleeping, nameRu: "Дрыхнет...", nameUk: "Дрімає...", color: "text-muted-foreground" },
  { img: pandaWaving, nameRu: "Проснулась!", nameUk: "Прокинулась!", color: "text-foreground" },
  { img: pandaStudying, nameRu: "Читает", nameUk: "Читає", color: "text-green-400" },
  { img: pandaStudying, nameRu: "Зубрит", nameUk: "Зубрить", color: "text-green-500" },
  { img: pandaStudying, nameRu: "Учёная", nameUk: "Вчена", color: "text-green-500" },
  { img: pandaCelebrating, nameRu: "Отличница", nameUk: "Відмінниця", color: "text-yellow-500" },
  { img: pandaCelebrating, nameRu: "Мастер!", nameUk: "Майстер!", color: "text-primary" },
];

const MOTIVATIONS_RU = [
  "Панда уснула... Разбуди её!",
  "Панда проснулась — пора учиться!",
  "Панда читает учебник! Так держать!",
  "Панда зубрит без остановки!",
  "Панда уже учёная! Продолжай!",
  "Панда-отличница! Не бросай!",
  "Панда — настоящий мастер! 🌟",
];

const MOTIVATIONS_UK = [
  "Панда заснула... Розбуди її!",
  "Панда прокинулась — час вчитися!",
  "Панда читає підручник! Так тримати!",
  "Панда зубрить без зупинки!",
  "Панда вже вчена! Продовжуй!",
  "Панда-відмінниця! Не кидай!",
  "Панда — справжній майстер! 🌟",
];

function getStageIndex(streak: number, canClaim: boolean): number {
  if (canClaim && streak <= 1) return 0;
  if (streak <= 0) return 0;
  if (streak === 1) return 1;
  if (streak <= 3) return 2;
  if (streak <= 7) return 3;
  if (streak <= 14) return 4;
  if (streak <= 30) return 5;
  return 6;
}

const StreakPlant = ({ streak, canClaim, compact = false }: StreakPlantProps) => {
  const { lang } = useLanguage();
  const isRu = lang === "ru";
  const [showDialog, setShowDialog] = useState(false);

  const stageIdx = useMemo(() => getStageIndex(streak, canClaim), [streak, canClaim]);
  const stage = STAGES[stageIdx];
  const motivation = isRu ? MOTIVATIONS_RU[stageIdx] : MOTIVATIONS_UK[stageIdx];

  const progressToNext = useMemo(() => {
    if (stageIdx >= 6) return 100;
    const thresholds = [0, 1, 3, 7, 14, 30, 60];
    const current = thresholds[stageIdx] || 0;
    const next = thresholds[stageIdx + 1] || 60;
    return Math.min(100, Math.round(((streak - current) / (next - current)) * 100));
  }, [streak, stageIdx]);

  const PandaImage = ({ size = "w-24 h-24" }: { size?: string }) => (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 15 }}
    >
      <motion.img
        src={stage.img}
        alt="KLAR Panda"
        className={`${size} object-contain drop-shadow-lg`}
        animate={
          stageIdx === 0
            ? { y: [0, 4, 0], opacity: [0.6, 0.8, 0.6] }
            : { y: [0, -4, 0] }
        }
        transition={{ repeat: Infinity, duration: stageIdx === 0 ? 3 : 2.5, ease: "easeInOut" }}
        loading="lazy"
        width={512}
        height={512}
      />
    </motion.div>
  );

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowDialog(true)}
          className="relative flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all overflow-hidden"
        >
          <img
            src={stageIdx === 0 ? pandaSleeping : pandaWaving}
            alt="Panda"
            className={`w-8 h-8 object-contain ${stageIdx === 0 ? "opacity-60" : ""}`}
            loading="lazy"
            width={512}
            height={512}
          />
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
              <PandaImage />

              <div className="text-center">
                <p className={`font-display font-bold text-sm ${stage.color}`}>
                  {isRu ? stage.nameRu : stage.nameUk}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{motivation}</p>
              </div>

              <div className="w-full max-w-[180px]">
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressToNext}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{
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
                  {stageIdx < 6 && (
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
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <PandaImage />

      <div className="text-center">
        <p className={`font-display font-bold text-sm ${stage.color}`}>
          {isRu ? stage.nameRu : stage.nameUk}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{motivation}</p>
      </div>

      <div className="w-full max-w-[180px]">
        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressToNext}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
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
          {stageIdx < 6 && (
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
