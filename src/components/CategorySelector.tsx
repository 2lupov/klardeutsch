import { Level } from "@/data/lessons";
import { BookOpen, Languages, FileText, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Category = "vocabulary" | "grammar" | "reading";

interface CategorySelectorProps {
  level: Level;
  onSelect: (category: Category) => void;
  onBack: () => void;
}

const CategorySelector = ({ level, onSelect, onBack }: CategorySelectorProps) => {
  const { t } = useLanguage();

  const categories: { key: Category; label: string; sublabel: string; icon: React.ReactNode }[] = [
    { key: "vocabulary", label: "Wortschatz", sublabel: t("vocabSublabel"), icon: <Languages className="w-6 h-6" /> },
    { key: "grammar", label: "Grammatik", sublabel: t("grammarSublabel"), icon: <BookOpen className="w-6 h-6" /> },
    { key: "reading", label: "Lesen", sublabel: t("readingSublabel"), icon: <FileText className="w-6 h-6" /> },
  ];

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </button>

      <div>
        <h2 className="text-2xl font-display font-bold">{t("levelLabel")} {level}</h2>
        <p className="text-muted-foreground mt-1">{t("chooseCategory")}</p>
      </div>

      <div className="flex flex-col gap-3">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className="glass-card p-5 flex items-center gap-4 text-left transition-all hover:border-primary/50 hover:bg-primary/5 group"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
              {cat.icon}
            </div>
            <div>
              <h3 className="font-display font-semibold text-lg">{cat.label}</h3>
              <p className="text-sm text-muted-foreground">{cat.sublabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategorySelector;
