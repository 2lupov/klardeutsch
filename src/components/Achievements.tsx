import { useMemo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Flame, BookOpen, GraduationCap, Trophy, Star, Target,
  Zap, Crown, Medal, Sparkles, Heart, Rocket
} from "lucide-react";

interface AchievementDef {
  id: string;
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
  check: (stats: AchievementStats) => boolean;
  progressFn?: (stats: AchievementStats) => { current: number; target: number };
}

export interface AchievementStats {
  wordsLearned: number;
  lessonsCompleted: number;
  streak: number;
  levelsCompleted: number; // number of levels with all 3 categories done
  grammarAvgScore: number;
  readingCompleted: number;
  customWordsAdded: number;
  difficultWordsReviewed: number;
}

const achievements: AchievementDef[] = [
  {
    id: "first_step",
    icon: <Rocket className="w-6 h-6" />,
    titleKey: "achFirstStep",
    descKey: "achFirstStepDesc",
    check: (s) => s.lessonsCompleted >= 1,
  },
  {
    id: "word_10",
    icon: <BookOpen className="w-6 h-6" />,
    titleKey: "achWord10",
    descKey: "achWord10Desc",
    check: (s) => s.wordsLearned >= 10,
    progressFn: (s) => ({ current: Math.min(s.wordsLearned, 10), target: 10 }),
  },
  {
    id: "word_50",
    icon: <Star className="w-6 h-6" />,
    titleKey: "achWord50",
    descKey: "achWord50Desc",
    check: (s) => s.wordsLearned >= 50,
    progressFn: (s) => ({ current: Math.min(s.wordsLearned, 50), target: 50 }),
  },
  {
    id: "word_100",
    icon: <Crown className="w-6 h-6" />,
    titleKey: "achWord100",
    descKey: "achWord100Desc",
    check: (s) => s.wordsLearned >= 100,
    progressFn: (s) => ({ current: Math.min(s.wordsLearned, 100), target: 100 }),
  },
  {
    id: "streak_3",
    icon: <Flame className="w-6 h-6" />,
    titleKey: "achStreak3",
    descKey: "achStreak3Desc",
    check: (s) => s.streak >= 3,
    progressFn: (s) => ({ current: Math.min(s.streak, 3), target: 3 }),
  },
  {
    id: "streak_7",
    icon: <Zap className="w-6 h-6" />,
    titleKey: "achStreak7",
    descKey: "achStreak7Desc",
    check: (s) => s.streak >= 7,
    progressFn: (s) => ({ current: Math.min(s.streak, 7), target: 7 }),
  },
  {
    id: "streak_30",
    icon: <Sparkles className="w-6 h-6" />,
    titleKey: "achStreak30",
    descKey: "achStreak30Desc",
    check: (s) => s.streak >= 30,
    progressFn: (s) => ({ current: Math.min(s.streak, 30), target: 30 }),
  },
  {
    id: "level_master",
    icon: <GraduationCap className="w-6 h-6" />,
    titleKey: "achLevelMaster",
    descKey: "achLevelMasterDesc",
    check: (s) => s.levelsCompleted >= 1,
    progressFn: (s) => ({ current: Math.min(s.levelsCompleted, 1), target: 1 }),
  },
  {
    id: "all_levels",
    icon: <Trophy className="w-6 h-6" />,
    titleKey: "achAllLevels",
    descKey: "achAllLevelsDesc",
    check: (s) => s.levelsCompleted >= 4,
    progressFn: (s) => ({ current: Math.min(s.levelsCompleted, 4), target: 4 }),
  },
  {
    id: "grammar_pro",
    icon: <Target className="w-6 h-6" />,
    titleKey: "achGrammarPro",
    descKey: "achGrammarProDesc",
    check: (s) => s.grammarAvgScore >= 90,
  },
  {
    id: "bookworm",
    icon: <Heart className="w-6 h-6" />,
    titleKey: "achBookworm",
    descKey: "achBookwormDesc",
    check: (s) => s.readingCompleted >= 4,
    progressFn: (s) => ({ current: Math.min(s.readingCompleted, 4), target: 4 }),
  },
  {
    id: "custom_collector",
    icon: <Medal className="w-6 h-6" />,
    titleKey: "achCustomCollector",
    descKey: "achCustomCollectorDesc",
    check: (s) => s.customWordsAdded >= 10,
    progressFn: (s) => ({ current: Math.min(s.customWordsAdded, 10), target: 10 }),
  },
];

interface AchievementsProps {
  stats: AchievementStats;
}

const Achievements = ({ stats }: AchievementsProps) => {
  const { t } = useLanguage();

  const sorted = useMemo(() => {
    return achievements.map((a) => ({
      ...a,
      unlocked: a.check(stats),
      progress: a.progressFn?.(stats),
    })).sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      return 0;
    });
  }, [stats]);

  const unlockedCount = sorted.filter((a) => a.unlocked).length;

  return (
    <section className="animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          {t("achievementsTitle")}
        </h2>
        <span className="text-xs text-muted-foreground">
          {unlockedCount} / {achievements.length}
        </span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {sorted.map((ach) => (
          <div
            key={ach.id}
            className={`glass-card p-3 flex flex-col items-center gap-1.5 text-center transition-all relative overflow-hidden ${
              ach.unlocked
                ? "border-primary/30 bg-primary/5"
                : "opacity-50 grayscale"
            }`}
          >
            {/* Progress bar at bottom */}
            {!ach.unlocked && ach.progress && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${(ach.progress.current / ach.progress.target) * 100}%`,
                    background: "linear-gradient(90deg, hsl(var(--yellow-glow)), hsl(var(--yellow-soft)))",
                  }}
                />
              </div>
            )}

            <div className={ach.unlocked ? "text-primary" : "text-muted-foreground"}>
              {ach.icon}
            </div>
            <span className="text-[10px] font-display font-semibold leading-tight text-foreground">
              {t(ach.titleKey as any)}
            </span>
            {!ach.unlocked && ach.progress && (
              <span className="text-[9px] text-muted-foreground">
                {ach.progress.current}/{ach.progress.target}
              </span>
            )}
            {ach.unlocked && (
              <span className="text-[9px] text-primary font-medium">✓</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

export default Achievements;
