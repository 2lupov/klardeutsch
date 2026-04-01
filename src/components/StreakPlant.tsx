import { Suspense, lazy, useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";

const Panda3D = lazy(() => import("@/components/Panda3D"));
import {
  Dialog,
  DialogContent,
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

function isNightTime(): boolean {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6;
}

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

/* ── Animated mountain SVG background ── */
const MountainScene = ({ isNight = false }: { isNight?: boolean }) => (
  <div className="absolute inset-0 overflow-hidden rounded-2xl">
    {/* Sky gradient */}
    <div className={`absolute inset-0 transition-colors duration-700 ${
      isNight
        ? "bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900"
        : "bg-gradient-to-b from-sky-300 via-sky-200 to-amber-100 dark:from-indigo-900 dark:via-purple-900 dark:to-amber-900"
    }`} />

    {/* Stars (night only) */}
    {isNight && [...Array(20)].map((_, i) => (
      <motion.div
        key={`star-${i}`}
        className="absolute rounded-full bg-white"
        style={{
          width: i % 3 === 0 ? 2.5 : 1.5,
          height: i % 3 === 0 ? 2.5 : 1.5,
          left: `${5 + (i * 4.7) % 90}%`,
          top: `${3 + (i * 7.3) % 45}%`,
        }}
        animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
        transition={{ duration: 2 + (i % 4) * 0.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
      />
    ))}

    {/* Moon (night) or Sun (day) */}
    {isNight ? (
      <motion.div
        className="absolute top-[8%] right-[15%] w-11 h-11 rounded-full bg-amber-100 shadow-lg shadow-amber-100/40"
        animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Moon crater shadows */}
        <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-amber-200/50" />
        <div className="absolute top-5 left-5 w-1.5 h-1.5 rounded-full bg-amber-200/40" />
        <div className="absolute top-3 right-2 w-1 h-1 rounded-full bg-amber-200/30" />
      </motion.div>
    ) : (
      <motion.div
        className="absolute top-[8%] right-[15%] w-10 h-10 rounded-full bg-amber-300 dark:bg-indigo-300 shadow-lg shadow-amber-300/50 dark:shadow-indigo-300/30"
        animate={{ scale: [1, 1.08, 1], opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    )}

    {/* Animated clouds (dimmer at night) */}
    <motion.div
      className={`absolute top-[10%] w-16 h-6 rounded-full blur-sm ${isNight ? "bg-white/10" : "bg-white/60 dark:bg-white/20"}`}
      animate={{ x: ["-10%", "110%"] }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className={`absolute top-[18%] w-12 h-4 rounded-full blur-sm ${isNight ? "bg-white/8" : "bg-white/50 dark:bg-white/15"}`}
      animate={{ x: ["110%", "-10%"] }}
      transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
    />

    {/* Mountains */}
    <svg className="absolute bottom-0 w-full" viewBox="0 0 400 200" preserveAspectRatio="none" style={{ height: "65%" }}>
      <motion.path
        d="M0,200 L0,120 Q50,60 100,100 Q130,70 160,90 Q200,30 240,80 Q280,50 320,70 Q360,40 400,90 L400,200 Z"
        className={isNight ? "fill-slate-800/60" : "fill-emerald-800/40 dark:fill-emerald-900/50"}
        animate={{ d: [
          "M0,200 L0,120 Q50,60 100,100 Q130,70 160,90 Q200,30 240,80 Q280,50 320,70 Q360,40 400,90 L400,200 Z",
          "M0,200 L0,115 Q50,55 100,95 Q130,75 160,85 Q200,35 240,75 Q280,55 320,75 Q360,35 400,85 L400,200 Z",
          "M0,200 L0,120 Q50,60 100,100 Q130,70 160,90 Q200,30 240,80 Q280,50 320,70 Q360,40 400,90 L400,200 Z",
        ] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M0,200 L0,140 Q40,100 80,130 Q120,90 160,120 Q200,80 240,110 Q280,85 320,105 Q360,75 400,120 L400,200 Z"
        className={isNight ? "fill-slate-700/70" : "fill-emerald-700/60 dark:fill-emerald-800/60"}
        animate={{ d: [
          "M0,200 L0,140 Q40,100 80,130 Q120,90 160,120 Q200,80 240,110 Q280,85 320,105 Q360,75 400,120 L400,200 Z",
          "M0,200 L0,145 Q40,105 80,125 Q120,95 160,115 Q200,85 240,115 Q280,80 320,110 Q360,80 400,115 L400,200 Z",
          "M0,200 L0,140 Q40,100 80,130 Q120,90 160,120 Q200,80 240,110 Q280,85 320,105 Q360,75 400,120 L400,200 Z",
        ] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Snow caps */}
      <motion.path
        d="M185,80 L200,30 L215,80 Z"
        className={isNight ? "fill-white/20" : "fill-white/70 dark:fill-white/30"}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.path
        d="M345,75 L360,40 L375,75 Z"
        className={isNight ? "fill-white/15" : "fill-white/60 dark:fill-white/25"}
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Near mountains */}
      <motion.path
        d="M0,200 L0,160 Q30,130 70,155 Q110,120 150,145 Q190,110 230,140 Q270,115 310,135 Q350,105 400,145 L400,200 Z"
        className={isNight ? "fill-slate-800/80" : "fill-emerald-600/80 dark:fill-emerald-700/70"}
        animate={{ d: [
          "M0,200 L0,160 Q30,130 70,155 Q110,120 150,145 Q190,110 230,140 Q270,115 310,135 Q350,105 400,145 L400,200 Z",
          "M0,200 L0,155 Q30,135 70,150 Q110,125 150,140 Q190,115 230,145 Q270,110 310,140 Q350,110 400,140 L400,200 Z",
          "M0,200 L0,160 Q30,130 70,155 Q110,120 150,145 Q190,110 230,140 Q270,115 310,135 Q350,105 400,145 L400,200 Z",
        ] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Grass foreground */}
      <rect x="0" y="175" width="400" height="25" className={isNight ? "fill-slate-900/90" : "fill-emerald-500/90 dark:fill-emerald-800/80"} />
    </svg>

    {/* Fireflies (brighter at night) */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className={`absolute w-1.5 h-1.5 rounded-full ${isNight ? "bg-amber-300/80" : "bg-amber-300/60 dark:bg-amber-200/40"}`}
        style={{ left: `${15 + i * 14}%`, top: `${50 + (i % 3) * 12}%` }}
        animate={{
          y: [0, -12, 0],
          opacity: isNight ? [0.4, 1, 0.4] : [0.3, 0.8, 0.3],
          scale: [0.8, 1.2, 0.8],
        }}
        transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
      />
    ))}
  </div>
);

const NIGHT_STAGE = { img: pandaSleeping, nameRu: "Спит 🌙", nameUk: "Спить 🌙", color: "text-muted-foreground" };
const NIGHT_MOTIVATION_RU = "Уже ночь — панда легла спать. И тебе пора! 💤";
const NIGHT_MOTIVATION_UK = "Вже ніч — панда лягла спати. І тобі час! 💤";

const StreakPlant = ({ streak, canClaim, compact = false }: StreakPlantProps) => {
  const { lang } = useLanguage();
  const isRu = lang === "ru";
  const [showDialog, setShowDialog] = useState(false);
  const night = isNightTime();

  const stageIdx = useMemo(() => getStageIndex(streak, canClaim), [streak, canClaim]);
  const stage = night ? NIGHT_STAGE : STAGES[stageIdx];
  const motivation = night
    ? (isRu ? NIGHT_MOTIVATION_RU : NIGHT_MOTIVATION_UK)
    : (isRu ? MOTIVATIONS_RU[stageIdx] : MOTIVATIONS_UK[stageIdx]);

  const progressToNext = useMemo(() => {
    if (stageIdx >= 6) return 100;
    const thresholds = [0, 1, 3, 7, 14, 30, 60];
    const current = thresholds[stageIdx] || 0;
    const next = thresholds[stageIdx + 1] || 60;
    return Math.min(100, Math.round(((streak - current) / (next - current)) * 100));
  }, [streak, stageIdx]);

  /* ── Compact button (used in header) ── */
  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowDialog(true)}
          className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-all overflow-hidden"
        >
          <span className={`text-xl md:text-2xl ${night || stageIdx === 0 ? "opacity-60" : ""}`}>🐼</span>
        </button>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-sm md:max-w-md overflow-hidden rounded-2xl [&>button.absolute]:hidden">
            <PandaSceneCard
              stage={stage}
              stageIdx={night ? 0 : stageIdx}
              streak={streak}
              motivation={motivation}
              progressToNext={progressToNext}
              isRu={isRu}
              isNight={night}
              onClose={() => setShowDialog(false)}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  /* ── Simple panda circle button + dialog ── */
  return (
    <>
      <motion.button
        onClick={() => setShowDialog(true)}
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 hover:bg-primary/20 hover:border-primary/40 transition-all overflow-hidden"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-2xl">🐼</span>
        {streak > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
            {streak}
          </span>
        )}
        {canClaim && (
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-background animate-pulse" />
        )}
      </motion.button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-sm md:max-w-md overflow-hidden rounded-2xl [&>button.absolute]:hidden">
          <PandaSceneCard
            stage={stage}
            stageIdx={night ? 0 : stageIdx}
            streak={streak}
            motivation={motivation}
            progressToNext={progressToNext}
            isRu={isRu}
            isNight={night}
            onClose={() => setShowDialog(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

/* ── Full scene card (used inside dialog) ── */
interface PandaSceneCardProps {
  stage: typeof STAGES[number];
  stageIdx: number;
  streak: number;
  motivation: string;
  progressToNext: number;
  isRu: boolean;
  isNight?: boolean;
  onClose?: () => void;
}

const PandaSceneCard = ({ stage, stageIdx, streak, motivation, progressToNext, isRu, isNight, onClose }: PandaSceneCardProps) => (
  <motion.div
    className="relative w-full overflow-hidden rounded-2xl"
    style={{ aspectRatio: "3/4" }}
    initial={{ scale: 0.9, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ type: "spring", stiffness: 200, damping: 20 }}
  >
    {/* Mountain background */}
    <MountainScene />

    {/* Close button */}
    {onClose && (
      <button
        onClick={onClose}
        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/50 transition-colors"
      >
        <span className="text-lg leading-none">×</span>
      </button>
    )}

    {/* Content overlay */}
    <div className="relative z-10 flex flex-col items-center justify-between h-full p-5">
      {/* Title */}
      <motion.div
        className="text-center"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="font-display font-bold text-lg text-white drop-shadow-lg">
          🐼 {isRu ? "Моя панда" : "Моя панда"}
        </h3>
      </motion.div>

      {/* 3D Panda character */}
      <motion.div
        className="flex-1 flex items-center justify-center w-full min-h-[200px]"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 150, damping: 12, delay: 0.2 }}
      >
        <Suspense
          fallback={
            <motion.img
              src={stage.img}
              alt="KLAR Panda"
              className="w-36 h-36 object-contain drop-shadow-2xl"
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              loading="lazy"
              width={512}
              height={512}
            />
          }
        >
          <Panda3D isSleeping={isNight || stageIdx === 0} stageImage={stage.img} className="w-full h-[300px]" />
        </Suspense>
      </motion.div>

      {/* Bottom info card */}
      <motion.div
        className="w-full rounded-xl bg-black/30 backdrop-blur-md p-3 space-y-2"
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-center">
          <p className="font-display font-bold text-sm text-white">
            {isRu ? stage.nameRu : stage.nameUk}
          </p>
          <p className="text-[11px] text-white/70 mt-0.5">{motivation}</p>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressToNext}%` }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
              style={{
                background: stageIdx === 0
                  ? "rgba(255,255,255,0.3)"
                  : "linear-gradient(90deg, #4ade80, #facc15)",
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-white/50">
              {isRu ? stage.nameRu : stage.nameUk}
            </span>
            {stageIdx < 6 && (
              <span className="text-[9px] text-white/50">
                {isRu ? STAGES[stageIdx + 1].nameRu : STAGES[stageIdx + 1].nameUk}
              </span>
            )}
          </div>
        </div>

        {/* Streak counter */}
        <div className="flex justify-center">
          <span className="text-xs font-display font-bold text-white px-3 py-1 rounded-full bg-white/15">
            🔥 {streak} {isRu ? (streak === 1 ? "день" : streak < 5 ? "дня" : "дней") : (streak === 1 ? "день" : streak < 5 ? "дні" : "днів")}
          </span>
        </div>
      </motion.div>
    </div>
  </motion.div>
);

export default StreakPlant;
