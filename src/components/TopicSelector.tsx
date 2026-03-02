import { ArrowLeft, BookOpen, Languages, FileText, Headphones } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type Category = "vocabulary" | "grammar" | "reading" | "listening";

interface TopicSelectorProps {
  level: string;
  category: Category;
  topics: string[];
  onSelect: (topic: string) => void;
  onBack: () => void;
}

const categoryIcons: Record<Category, React.ReactNode> = {
  vocabulary: <Languages className="w-5 h-5" />,
  grammar: <BookOpen className="w-5 h-5" />,
  reading: <FileText className="w-5 h-5" />,
  listening: <Headphones className="w-5 h-5" />,
};

const categoryLabels: Record<Category, string> = {
  vocabulary: "Wortschatz",
  grammar: "Grammatik",
  reading: "Lesen",
  listening: "Hören",
};

const TopicSelector = ({ level, category, topics, onSelect, onBack }: TopicSelectorProps) => {
  const { t } = useLanguage();

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
        <h2 className="text-xl font-display font-bold">
          {level} · {categoryLabels[category]}
        </h2>
        <p className="text-muted-foreground text-sm mt-0.5">{t("chooseTopic")}</p>
      </div>

      <div className="flex flex-col gap-2.5">
        {topics.map((topic) => (
          <button
            key={topic}
            onClick={() => onSelect(topic)}
            className="glass-card p-4 flex items-center gap-3 text-left transition-all hover:border-primary/50 hover:bg-primary/5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors shrink-0">
              {categoryIcons[category]}
            </div>
            <h3 className="font-display font-semibold text-base">{topic}</h3>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopicSelector;
