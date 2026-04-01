import { ArrowLeft, BookOpen, Languages, FileText, Headphones, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion } from "framer-motion";

type Category = "vocabulary" | "grammar" | "reading" | "listening";

interface TopicSelectorProps {
  level: string;
  category: Category;
  topics: string[];
  onSelect: (topic: string) => void;
  onBack: () => void;
}

const categoryConfig: Record<Category, { icon: React.ReactNode; label: string; accent: string; iconBg: string }> = {
  vocabulary: { icon: <Languages className="w-4 h-4" />, label: "Wortschatz", accent: "text-amber-400", iconBg: "bg-amber-500/15 text-amber-400" },
  grammar:    { icon: <BookOpen className="w-4 h-4" />, label: "Grammatik", accent: "text-blue-400", iconBg: "bg-blue-500/15 text-blue-400" },
  reading:    { icon: <FileText className="w-4 h-4" />, label: "Lesen", accent: "text-emerald-400", iconBg: "bg-emerald-500/15 text-emerald-400" },
  listening:  { icon: <Headphones className="w-4 h-4" />, label: "Hören", accent: "text-purple-400", iconBg: "bg-purple-500/15 text-purple-400" },
};

const TOPIC_EMOJIS = ["📂", "🗂️", "📁", "📋", "📌", "🏷️", "📎", "🔖", "📝", "📄", "📑", "🗃️"];

const TopicSelector = ({ level, category, topics, onSelect, onBack }: TopicSelectorProps) => {
  const { t } = useLanguage();
  const cfg = categoryConfig[category];

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
        <div className="flex items-center gap-2.5">
          <span className={`text-xl font-display font-bold text-primary`}>{level}</span>
          <span className="text-muted-foreground/40">·</span>
          <span className={`font-display font-semibold ${cfg.accent}`}>{cfg.label}</span>
        </div>
        <p className="text-muted-foreground text-sm mt-1">{t("chooseTopic")}</p>
      </motion.div>

      <div className="flex flex-col gap-2.5">
        {topics.map((topic, i) => (
          <motion.button
            key={topic}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 + 0.1, duration: 0.3 }}
            whileHover={{ scale: 1.015, x: 4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(topic)}
            className="relative p-4 flex items-center gap-4 text-left rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden transition-all hover:shadow-lg hover:border-primary/30 group"
          >
            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0 transition-transform group-hover:scale-110`}>
              <span className="text-lg">{TOPIC_EMOJIS[i % TOPIC_EMOJIS.length]}</span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-base text-foreground group-hover:text-primary transition-colors">{topic}</h3>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-1 transition-all shrink-0" />

            {/* Shine */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default TopicSelector;
