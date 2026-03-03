import { useMemo, useEffect, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Flame, BookOpen, GraduationCap, Trophy, Star, Target,
  Zap, Crown, Medal, Sparkles, Heart, Rocket, PenTool,
  Gift, Swords, MessageCircle, Users
} from "lucide-react";
import confetti from "canvas-confetti";

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
  levelsCompleted: number;
  grammarAvgScore: number;
  readingCompleted: number;
  customWordsAdded: number;
  difficultWordsReviewed: number;
  writingCompleted?: number;
  duelsWon?: number;
  dialoguesCompleted?: number;
  dailyBonusStreak?: number;
  challengesSent?: number;
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
    id: "word_250",
    icon: <Trophy className="w-6 h-6" />,
    titleKey: "achWord250",
    descKey: "achWord250Desc",
    check: (s) => s.wordsLearned >= 250,
    progressFn: (s) => ({ current: Math.min(s.wordsLearned, 250), target: 250 }),
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
  // New achievements
  {
    id: "first_writing",
    icon: <PenTool className="w-6 h-6" />,
    titleKey: "achFirstWriting",
    descKey: "achFirstWritingDesc",
    check: (s) => (s.writingCompleted ?? 0) >= 1,
  },
  {
    id: "writer_5",
    icon: <PenTool className="w-6 h-6" />,
    titleKey: "achWriter5",
    descKey: "achWriter5Desc",
    check: (s) => (s.writingCompleted ?? 0) >= 5,
    progressFn: (s) => ({ current: Math.min(s.writingCompleted ?? 0, 5), target: 5 }),
  },
  {
    id: "daily_bonus_7",
    icon: <Gift className="w-6 h-6" />,
    titleKey: "achDailyBonus7",
    descKey: "achDailyBonus7Desc",
    check: (s) => (s.dailyBonusStreak ?? 0) >= 7,
    progressFn: (s) => ({ current: Math.min(s.dailyBonusStreak ?? 0, 7), target: 7 }),
  },
  {
    id: "duelist_3",
    icon: <Swords className="w-6 h-6" />,
    titleKey: "achDuelist3",
    descKey: "achDuelist3Desc",
    check: (s) => (s.duelsWon ?? 0) >= 3,
    progressFn: (s) => ({ current: Math.min(s.duelsWon ?? 0, 3), target: 3 }),
  },
  {
    id: "duelist_10",
    icon: <Swords className="w-6 h-6" />,
    titleKey: "achDuelist10",
    descKey: "achDuelist10Desc",
    check: (s) => (s.duelsWon ?? 0) >= 10,
    progressFn: (s) => ({ current: Math.min(s.duelsWon ?? 0, 10), target: 10 }),
  },
  {
    id: "first_dialogue",
    icon: <MessageCircle className="w-6 h-6" />,
    titleKey: "achFirstDialogue",
    descKey: "achFirstDialogueDesc",
    check: (s) => (s.dialoguesCompleted ?? 0) >= 1,
  },
  {
    id: "challenger",
    icon: <Users className="w-6 h-6" />,
    titleKey: "achChallenger",
    descKey: "achChallengerDesc",
    check: (s) => (s.challengesSent ?? 0) >= 5,
    progressFn: (s) => ({ current: Math.min(s.challengesSent ?? 0, 5), target: 5 }),
  },
];

interface AchievementsProps {
  stats: AchievementStats;
}

const Achievements = ({ stats }: AchievementsProps) => {
  const { t } = useLanguage();
  const prevUnlockedRef = useRef<Set<string>>(new Set());
  const [newlyUnlocked, setNewlyUnlocked] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
  const unlockedIds = useMemo(() => new Set(sorted.filter((a) => a.unlocked).map((a) => a.id)), [sorted]);

  // Detect newly unlocked achievements and fire confetti
  useEffect(() => {
    if (prevUnlockedRef.current.size === 0) {
      prevUnlockedRef.current = unlockedIds;
      return;
    }

    for (const id of unlockedIds) {
      if (!prevUnlockedRef.current.has(id)) {
        setNewlyUnlocked(id);
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FFD700", "#FF6B35", "#00D4AA", "#7C3AED"],
        });
        setTimeout(() => setNewlyUnlocked(null), 2000);
        break;
      }
    }
    prevUnlockedRef.current = unlockedIds;
  }, [unlockedIds]);

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
        {sorted.map((ach) => {
          const isExpanded = expandedId === ach.id;
          return (
            <div
              key={ach.id}
              onClick={() => setExpandedId(isExpanded ? null : ach.id)}
              className={`glass-card p-3 flex flex-col items-center gap-1.5 text-center transition-all relative overflow-hidden cursor-pointer ${
                ach.unlocked
                  ? "border-primary/30 bg-primary/5"
                  : "opacity-50 grayscale"
              } ${newlyUnlocked === ach.id ? "animate-scale-in ring-2 ring-primary" : ""} ${
                isExpanded ? "col-span-3 sm:col-span-4 !opacity-100 !grayscale-0" : ""
              }`}
            >
              {/* Progress bar at bottom */}
              {!ach.unlocked && ach.progress && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(ach.progress.current / ach.progress.target) * 100}%`,
                      background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))",
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

              {/* Expanded description */}
              {isExpanded && (
                <p className="text-[11px] text-muted-foreground leading-snug mt-1 px-1">
                  {t(ach.descKey as any)}
                </p>
              )}

              {!isExpanded && !ach.unlocked && ach.progress && (
                <span className="text-[9px] text-muted-foreground">
                  {ach.progress.current}/{ach.progress.target}
                </span>
              )}
              {!isExpanded && ach.unlocked && (
                <span className="text-[9px] text-primary font-medium">✓</span>
              )}

              {/* Expanded progress details */}
              {isExpanded && ach.progress && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  {ach.progress.current}/{ach.progress.target}
                  {ach.unlocked && " ✓"}
                </span>
              )}
              {isExpanded && !ach.progress && ach.unlocked && (
                <span className="text-[10px] text-primary font-medium">Выполнено ✓</span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default Achievements;
