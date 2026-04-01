import { Level } from "@/data/lessons";
import { BookOpen, Languages, FileText, Headphones, PenLine, ArrowLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import pandaGraduate from "@/assets/mascot/panda-graduate.png";

type Category = "vocabulary" | "grammar" | "reading" | "listening" | "writing";

interface CategorySelectorProps {
  level: Level;
  onSelect: (category: Category) => void;
  onBack: () => void;
}

const CATEGORY_CONFIG: Record<Category, { gradient: string; iconBg: string; accent: string; border: string }> = {
  vocabulary: { gradient: "from-amber-500/12 to-amber-600/4", iconBg: "bg-amber-500/15 text-amber-400", accent: "text-amber-400", border: "hover:border-amber-500/40" },
  grammar:    { gradient: "from-blue-500/12 to-blue-600/4", iconBg: "bg-blue-500/15 text-blue-400", accent: "text-blue-400", border: "hover:border-blue-500/40" },
  reading:    { gradient: "from-emerald-500/12 to-emerald-600/4", iconBg: "bg-emerald-500/15 text-emerald-400", accent: "text-emerald-400", border: "hover:border-emerald-500/40" },
  listening:  { gradient: "from-purple-500/12 to-purple-600/4", iconBg: "bg-purple-500/15 text-purple-400", accent: "text-purple-400", border: "hover:border-purple-500/40" },
  writing:    { gradient: "from-pink-500/12 to-pink-600/4", iconBg: "bg-pink-500/15 text-pink-400", accent: "text-pink-400", border: "hover:border-pink-500/40" },
};

const CategorySelector = ({ level, onSelect, onBack }: CategorySelectorProps) => {
  const { t } = useLanguage();

  const categories: { key: Category; label: string; sublabel: string; icon: React.ReactNode; emoji: string }[] = [
    { key: "vocabulary", label: "Wortschatz", sublabel: t("vocabSublabel"), icon: <Languages className="w-5 h-5" />, emoji: "📚" },
    { key: "grammar", label: "Grammatik", sublabel: t("grammarSublabel"), icon: <BookOpen className="w-5 h-5" />, emoji: "📐" },
    { key: "reading", label: "Lesen", sublabel: t("readingSublabel"), icon: <FileText className="w-5 h-5" />, emoji: "📖" },
    { key: "listening", label: "Hören", sublabel: t("listeningSublabel"), icon: <Headphones className="w-5 h-5" />, emoji: "🎧" },
    { key: "writing", label: "Schreiben", sublabel: "Пиши тексты — AI проверит", icon: <PenLine className="w-5 h-5" />, emoji: "✍️" },
  ];

  return (
    <div className="flex flex-col gap-5 w-full max-w-xl mx-auto h-full justify-center">
      <motion.button
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors self-start group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
        {t("back")}
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <h2 className="text-2xl font-display font-bold text-foreground">
          {t("levelLabel")} <span className="text-primary">{level}</span>
        </h2>
        <p className="text-muted-foreground text-sm mt-1">{t("chooseCategory")}</p>
      </motion.div>

      <div className="flex flex-col gap-2.5">
        {categories.map((cat, i) => {
          const cfg = CATEGORY_CONFIG[cat.key];
          return (
            <motion.button
              key={cat.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 + 0.1, duration: 0.3 }}
              whileHover={{ scale: 1.015, x: 4 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(cat.key)}
              className={`relative p-4 flex items-center gap-4 text-left rounded-2xl border border-border bg-gradient-to-r ${cfg.gradient} backdrop-blur-sm overflow-hidden transition-all hover:shadow-lg ${cfg.border} group`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
                {cat.icon}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className={`font-display font-bold text-base ${cfg.accent}`}>{cat.label}</h3>
                  <span className="text-base">{cat.emoji}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{cat.sublabel}</p>
              </div>

              {/* Arrow */}
              <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />

              {/* Shine */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default CategorySelector;
