import { motion } from "framer-motion";
import { GraduationCap, Sparkles, Play } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import pandaExplorer from "@/assets/panda-director.png";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CertificatePreview from "./CertificatePreview";


const CourseHero = ({ lang }: { lang: Lang }) => (
  <section className="relative overflow-hidden mb-6">
    {/* Cinematic backdrop */}
    <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-background to-accent/15" />
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 -left-24 w-[520px] h-[520px] rounded-full blur-[140px] bg-primary/40" />
      <div className="absolute bottom-0 -right-24 w-[480px] h-[480px] rounded-full blur-[140px] bg-accent/30" />
    </div>

    <div className="relative max-w-6xl mx-auto px-6 py-14 md:py-20 grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-8 items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col gap-5 text-left"
      >
        <div className="inline-flex items-center gap-2 self-start px-3 py-1.5 rounded-full bg-accent/15 border border-accent/30 backdrop-blur">
          <Sparkles className="w-3.5 h-3.5 text-accent" />
          <span className="text-[11px] font-bold text-accent uppercase tracking-[0.18em]">
            KLAR Academy
          </span>
        </div>

        <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.02] tracking-tight text-foreground">
          {lang === "uk" ? "Мови " : "Мови "}
          <span className="italic text-accent">
            {lang === "uk" ? "як кіно." : "як кіно."}
          </span>
          <br />
          <span className="text-foreground/70">
            {lang === "uk" ? "Курс за курсом." : "Курс за курсом."}
          </span>
        </h1>

        <p className="text-muted-foreground text-base sm:text-lg max-w-xl leading-relaxed">
          {lang === "uk"
            ? "Структуровані відеокурси, живе спільнотне навчання, AI-практика та сертифікат після завершення."
            : "Структуровані відеокурси, живе ком'юніті, AI-практика та сертифікат після завершення."}
        </p>

        <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/40 backdrop-blur">
            <Play className="w-3.5 h-3.5 text-primary" />
            <span className="font-medium">{lang === "uk" ? "Відеолекції" : "Видеолекции"}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/40 backdrop-blur">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span className="font-medium">AI-{lang === "uk" ? "тренер" : "тренер"}</span>
          </div>
          <HoverCard openDelay={80} closeDelay={80}>
            <HoverCardTrigger asChild>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/60 border border-border/40 backdrop-blur transition hover:border-accent/60 hover:bg-accent/10 hover:shadow-[0_0_0_3px_hsl(var(--accent)/0.15)] focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 cursor-pointer"
                    aria-label={lang === "uk" ? "Показати приклад сертифіката" : "Показать пример сертификата"}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-primary" />
                    <span className="font-medium">{lang === "uk" ? "Сертифікат" : "Сертификат"}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="center" className="w-[min(92vw,420px)] p-3 border-accent/30 bg-card/95 backdrop-blur md:hidden">
                  <CertificatePreview lang={lang} />
                  <p className="mt-2 text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                    {lang === "uk" ? "Приклад сертифіката" : "Пример сертификата"}
                  </p>
                </PopoverContent>
              </Popover>
            </HoverCardTrigger>
            <HoverCardContent side="top" align="center" className="w-[420px] p-3 border-accent/30 bg-card/95 backdrop-blur hidden md:block">
              <CertificatePreview lang={lang} />
              <p className="mt-2 text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                {lang === "uk" ? "Приклад сертифіката" : "Пример сертификата"}
              </p>
            </HoverCardContent>
          </HoverCard>
        </div>
      </motion.div>



      <motion.div
        initial={{ opacity: 0, scale: 0.9, rotate: -6 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="relative hidden md:flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-accent/25 blur-[80px] rounded-full" />
        <img
          src={pandaExplorer}
          alt=""
          className="relative w-64 lg:w-80 drop-shadow-[0_20px_50px_rgba(245,166,35,0.35)]"
        />
      </motion.div>
    </div>
  </section>
);

export default CourseHero;
