import { motion } from "framer-motion";
import { GraduationCap, Sparkles } from "lucide-react";
import type { Lang } from "@/i18n/translations";

const CourseHero = ({ lang }: { lang: Lang }) => (
  <section className="relative overflow-hidden py-16 px-4 mb-6">
    {/* Ambient glow */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
    </div>

    <div className="relative max-w-3xl mx-auto text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">
            KLAR Academy
          </span>
        </div>

        <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
          {lang === "uk" ? "Навчайся з " : "Учись с "}
          <span className="text-primary">
            {lang === "uk" ? "викладачем" : "преподавателем"}
          </span>
        </h1>

        <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
          {lang === "uk"
            ? "Структуровані відеокурси з живим чатом, AI-практикою та сертифікатом"
            : "Структурированные видеокурсы с живым чатом, AI-практикой и сертификатом"}
        </p>

        <div className="flex items-center gap-6 mt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-primary/70" />
            <span>{lang === "uk" ? "Відеолекції" : "Видеолекции"}</span>
          </div>
          <span>•</span>
          <span>AI-{lang === "uk" ? "практика" : "практика"}</span>
          <span>•</span>
          <span>{lang === "uk" ? "Сертифікат" : "Сертификат"}</span>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CourseHero;
