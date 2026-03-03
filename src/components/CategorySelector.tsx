import { Level } from "@/data/lessons";
import { BookOpen, Languages, FileText, Headphones, PenLine, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Category = "vocabulary" | "grammar" | "reading" | "listening" | "writing";

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
    { key: "listening", label: "Hören", sublabel: t("listeningSublabel"), icon: <Headphones className="w-6 h-6" /> },
    { key: "writing", label: "Schreiben", sublabel: "Пиши тексты — AI проверит", icon: <PenLine className="w-6 h-6" /> },
  ];

  return (
    <div className="flex flex-col gap-4 animate-slide-up w-full max-w-xl mx-auto h-full justify-center">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </button>

      <div>
        <h2 className="text-xl font-display font-bold">{t("levelLabel")} {level}</h2>
        <p className="text-muted-foreground text-sm mt-0.5">{t("chooseCategory")}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => onSelect(cat.key)}
            className="glass-card p-4 flex items-center gap-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors shrink-0">
              {cat.icon}
            </div>
            <div>
              <h3 className="font-display font-semibold text-base">{cat.label}</h3>
              <p className="text-xs text-muted-foreground">{cat.sublabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategorySelector;
