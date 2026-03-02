import { Level } from "@/data/lessons";

interface LevelSelectorProps {
  onSelect: (level: Level) => void;
}

const levels: { level: Level; description: string; emoji: string }[] = [
  { level: "A1", description: "Начальный", emoji: "🌱" },
  { level: "A2", description: "Элементарный", emoji: "🌿" },
  { level: "B1", description: "Средний", emoji: "🌳" },
  { level: "B2", description: "Выше среднего", emoji: "🏔️" },
];

const LevelSelector = ({ onSelect }: LevelSelectorProps) => {
  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <div className="text-center">
        <h1 className="text-4xl font-display font-bold tracking-tight">
          <span className="text-gradient">KLAR</span>
        </h1>
        <p className="text-muted-foreground mt-2">Немецкий язык — ясно и просто</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        {levels.map((item, i) => (
          <button
            key={item.level}
            onClick={() => onSelect(item.level)}
            className="glass-card p-6 flex flex-col items-center gap-3 transition-all hover:border-primary/50 hover:bg-primary/5 group"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-3xl animate-float" style={{ animationDelay: `${i * 200}ms` }}>
              {item.emoji}
            </span>
            <div className="text-center">
              <h3 className="text-xl font-display font-bold text-primary group-hover:text-yellow-glow transition-colors">
                {item.level}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LevelSelector;
