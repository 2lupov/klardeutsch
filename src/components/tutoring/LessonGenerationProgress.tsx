import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, FileSearch, Layers, BookOpen, ListChecks, Sparkles, Loader2 } from "lucide-react";

interface Props {
  active: boolean;
  hasFiles?: boolean;
  lang?: "ru" | "uk";
  /** estimated total seconds for full generation */
  estimatedSeconds?: number;
}

/**
 * Progress bar with staged checklist for AI lesson generation.
 * Stages auto-advance over ~estimatedSeconds; the final stage stays
 * pulsing until the parent sets active=false.
 */
const LessonGenerationProgress = ({
  active,
  hasFiles = false,
  lang = "ru",
  estimatedSeconds = 45,
}: Props) => {
  const t = (uk: string, ru: string) => (lang === "uk" ? uk : ru);

  const stages = [
    { icon: FileSearch, label: hasFiles ? t("Аналізуємо файл", "Анализируем файл") : t("Розуміємо запит", "Понимаем запрос"), weight: 0.12 },
    { icon: Layers, label: t("Будуємо структуру", "Строим структуру"), weight: 0.16 },
    { icon: BookOpen, label: t("Пишемо теорію (з блоками і таблицями)", "Пишем теорию (с блоками и таблицами)"), weight: 0.30 },
    { icon: Sparkles, label: t("Підбираємо словник", "Подбираем словарь"), weight: 0.14 },
    { icon: ListChecks, label: t("Створюємо вправи й ДЗ", "Создаём упражнения и ДЗ"), weight: 0.20 },
    { icon: Check, label: t("Фінальна перевірка", "Финальная проверка"), weight: 0.08 },
  ];

  const [progress, setProgress] = useState(0);
  const [stageIdx, setStageIdx] = useState(0);

  useEffect(() => {
    if (!active) {
      setProgress(0);
      setStageIdx(0);
      return;
    }
    const start = Date.now();
    const total = estimatedSeconds * 1000;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      // ease-out: progress slows down so we never hit 100% before parent finishes
      const raw = elapsed / total;
      const eased = 1 - Math.pow(1 - Math.min(raw, 0.97), 1.6);
      const pct = Math.min(eased * 100, 97);
      setProgress(pct);

      // Determine stage by cumulative weights (cap at last)
      let acc = 0;
      let idx = 0;
      for (let i = 0; i < stages.length; i++) {
        acc += stages[i].weight * 100;
        if (pct < acc) {
          idx = i;
          break;
        }
        idx = i;
      }
      setStageIdx(idx);
    }, 200);
    return () => clearInterval(id);
  }, [active, estimatedSeconds]);

  if (!active) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-primary"
            animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 1.6, repeat: Infinity }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold">
            {t("AI створює урок", "AI создаёт урок")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("Зазвичай займає 30–60 секунд", "Обычно занимает 30–60 секунд")}
          </p>
        </div>
        <div className="text-2xl font-display font-black tabular-nums text-primary">
          {Math.round(progress)}%
        </div>
      </div>

      {/* Bar */}
      <div className="h-3 rounded-full bg-muted overflow-hidden relative">
        <motion.div
          className="h-full bg-gradient-to-r from-primary via-yellow-400 to-primary rounded-full relative"
          style={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        >
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
      </div>

      {/* Stages list */}
      <div className="space-y-2 pt-1">
        <AnimatePresence initial={false}>
          {stages.map((s, i) => {
            const done = i < stageIdx;
            const current = i === stageIdx;
            const Icon = s.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0.4 }}
                animate={{ opacity: done || current ? 1 : 0.45 }}
                className={`flex items-center gap-3 text-sm ${
                  current ? "text-foreground font-medium" : done ? "text-muted-foreground" : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    done
                      ? "bg-green-500/15 text-green-600"
                      : current
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <Check className="w-4 h-4" />
                  ) : current ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <span className="flex-1">{s.label}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default LessonGenerationProgress;
