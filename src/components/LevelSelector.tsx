import { Level } from "@/data/lessons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLevelProgress } from "@/hooks/useLevelProgress";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import LanguageSwitcher from "./LanguageSwitcher";
import KlarLogo from "./KlarLogo";

interface LevelSelectorProps {
  onSelect: (level: Level) => void;
}

const LEVEL_THEMES: Record<string, { gradient: string; glow: string; border: string }> = {
  A1: { gradient: "from-emerald-500/15 to-emerald-600/5", glow: "shadow-emerald-500/10", border: "hover:border-emerald-500/40" },
  A2: { gradient: "from-green-500/15 to-green-600/5", glow: "shadow-green-500/10", border: "hover:border-green-500/40" },
  B1: { gradient: "from-blue-500/15 to-blue-600/5", glow: "shadow-blue-500/10", border: "hover:border-blue-500/40" },
  B2: { gradient: "from-indigo-500/15 to-indigo-600/5", glow: "shadow-indigo-500/10", border: "hover:border-indigo-500/40" },
  C1: { gradient: "from-purple-500/15 to-purple-600/5", glow: "shadow-purple-500/10", border: "hover:border-purple-500/40" },
};

const LEVEL_ACCENT: Record<string, string> = {
  A1: "text-emerald-400", A2: "text-green-400", B1: "text-blue-400", B2: "text-indigo-400", C1: "text-purple-400",
};

const LevelSelector = ({ onSelect }: LevelSelectorProps) => {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const a1 = useLevelProgress("A1");
  const a2 = useLevelProgress("A2");
  const b1 = useLevelProgress("B1");
  const b2 = useLevelProgress("B2");
  const c1 = useLevelProgress("C1");

  const totalProgress = Math.round((a1.progress + a2.progress + b1.progress + b2.progress + c1.progress) / 5);
  const allCompleted = a1.completed && a2.completed && b1.completed && b2.completed && c1.completed;

  const levels: { level: Level; description: string; emoji: string; pct: number }[] = [
    { level: "A1", description: t("levelA1"), emoji: "🌱", pct: a1.progress },
    { level: "A2", description: t("levelA2"), emoji: "🌿", pct: a2.progress },
    { level: "B1", description: t("levelB1"), emoji: "🌳", pct: b1.progress },
    { level: "B2", description: t("levelB2"), emoji: "🏔️", pct: b2.progress },
    { level: "C1", description: t("levelC1"), emoji: "🎓", pct: c1.progress },
  ];

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto h-full justify-center">
      <div className="text-center">
        <div className="flex justify-end items-center mb-1">
          <LanguageSwitcher />
        </div>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
          className="flex justify-center mb-1">
          <KlarLogo progress={totalProgress} completed={allCompleted} />
        </motion.div>
        <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="text-muted-foreground text-sm mt-1">{t("appSubtitle")}</motion.p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-3">
        {levels.map((item, i) => {
          const theme = LEVEL_THEMES[item.level];
          const accent = LEVEL_ACCENT[item.level];
          return (
            <motion.button
              key={item.level}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.35 }}
              whileHover={{ scale: 1.04, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelect(item.level)}
              className={`relative p-5 flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-gradient-to-b ${theme.gradient} backdrop-blur-sm overflow-hidden transition-all hover:shadow-xl ${theme.glow} ${theme.border} group`}
            >
              {/* Progress bar at bottom */}
              {item.pct > 0 && (
                <motion.div
                  className="absolute bottom-0 left-0 h-1 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${item.pct}%` }}
                  transition={{ delay: i * 0.07 + 0.3, duration: 0.8, ease: "easeOut" }}
                  style={{ background: "linear-gradient(90deg, hsl(var(--yellow-glow)), hsl(var(--yellow-soft)))" }}
                />
              )}

              {/* Floating emoji */}
              <motion.span
                className="text-3xl"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
              >
                {item.emoji}
              </motion.span>

              <div className="text-center">
                <h3 className={`text-xl font-display font-bold ${accent} transition-colors`}>
                  {item.level}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.description}</p>
                {item.pct > 0 && (
                  <p className="text-[10px] text-primary/70 mt-1 font-semibold">{item.pct}%</p>
                )}
              </div>

              {/* Subtle shine effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </motion.button>
          );
        })}

        {/* Mini-games — mobile */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 5 * 0.07, duration: 0.35 }}
          whileHover={{ scale: 1.04, y: -4 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/games")}
          className="lg:hidden relative p-5 flex flex-col items-center gap-2.5 rounded-2xl border border-border bg-gradient-to-b from-amber-500/10 to-amber-600/5 backdrop-blur-sm overflow-hidden transition-all hover:shadow-xl hover:shadow-amber-500/10 hover:border-amber-500/40 group"
        >
          <motion.span className="text-3xl" animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 1.5 }}>
            🕹️
          </motion.span>
          <div className="text-center">
            <h3 className="text-xl font-display font-bold text-amber-400">Игры</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Мини-игры</p>
          </div>
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        </motion.button>
      </div>

      {/* Mini-games — desktop */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate("/games")}
        className="hidden lg:flex w-full p-3.5 items-center justify-center gap-3 rounded-2xl border border-border bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group"
      >
        <span className="text-lg">🕹️</span>
        <span className="font-display text-sm font-semibold text-muted-foreground group-hover:text-amber-400 transition-colors">
          Мини-игры
        </span>
        <span className="text-lg">🕹️</span>
      </motion.button>
    </div>
  );
};

export default LevelSelector;
