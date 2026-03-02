import { Level } from "@/data/lessons";
import { useLanguage } from "@/contexts/LanguageContext";
import { useLevelProgress } from "@/hooks/useLevelProgress";
import LanguageSwitcher from "./LanguageSwitcher";
import KlarLogo from "./KlarLogo";

interface LevelSelectorProps {
  onSelect: (level: Level) => void;
}

const LevelSelector = ({ onSelect }: LevelSelectorProps) => {
  const { t } = useLanguage();

  // Aggregate progress across all levels for the logo
  const a1 = useLevelProgress("A1");
  const a2 = useLevelProgress("A2");
  const b1 = useLevelProgress("B1");
  const b2 = useLevelProgress("B2");

  const totalProgress = Math.round((a1.progress + a2.progress + b1.progress + b2.progress) / 4);
  const allCompleted = a1.completed && a2.completed && b1.completed && b2.completed;

  const levels: { level: Level; description: string; emoji: string; pct: number }[] = [
    { level: "A1", description: t("levelA1"), emoji: "🌱", pct: a1.progress },
    { level: "A2", description: t("levelA2"), emoji: "🌿", pct: a2.progress },
    { level: "B1", description: t("levelB1"), emoji: "🌳", pct: b1.progress },
    { level: "B2", description: t("levelB2"), emoji: "🏔️", pct: b2.progress },
  ];

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <div className="text-center">
        <div className="flex justify-end mb-2">
          <LanguageSwitcher />
        </div>
        <div className="flex justify-center mb-1">
          <KlarLogo progress={totalProgress} completed={allCompleted} />
        </div>
        <p className="text-muted-foreground mt-2">{t("appSubtitle")}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {levels.map((item, i) => (
          <button
            key={item.level}
            onClick={() => onSelect(item.level)}
            className="glass-card p-6 flex flex-col items-center gap-3 transition-all hover:border-primary/50 hover:bg-primary/5 group relative overflow-hidden"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Mini progress bar inside each card */}
            <div
              className="absolute bottom-0 left-0 h-0.5 transition-all duration-700"
              style={{
                width: `${item.pct}%`,
                background: "linear-gradient(90deg, hsl(var(--yellow-glow)), hsl(var(--yellow-soft)))",
              }}
            />
            <span className="text-3xl animate-float" style={{ animationDelay: `${i * 200}ms` }}>
              {item.emoji}
            </span>
            <div className="text-center">
              <h3 className="text-xl font-display font-bold text-primary group-hover:text-yellow-glow transition-colors">
                {item.level}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
              {item.pct > 0 && (
                <p className="text-[10px] text-primary/70 mt-1 font-medium">{item.pct}%</p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelSelector;
