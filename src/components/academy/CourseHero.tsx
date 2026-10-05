import { motion, useReducedMotion } from "framer-motion";
import { Award, Bot, GraduationCap, Mic, PlayCircle } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import LivePanda from "@/components/LivePanda";
import pandaAcademyAlpha from "@/assets/panda-academy-alpha.webm.asset.json";
import pandaAcademyStacked from "@/assets/panda-academy-stacked.mp4.asset.json";
import pandaAcademyPoster from "@/assets/panda-academy-poster.png.asset.json";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import CertificatePreview from "./CertificatePreview";

const ACADEMY_PANDA_ASSETS = {
  webm: pandaAcademyAlpha.url,
  stacked: pandaAcademyStacked.url,
  poster: pandaAcademyPoster.url,
  ariaLabel: "Панда-тренер KLAR",
};

const T = {
  uk: {
    title: "Мова, якою ти справді заговориш.",
    sub: "Дивишся урок, одразу тренуєшся з AI, говориш уголос і отримуєш сертифікат. Усе в одному місці.",
    cta: "Обрати курс",
    ctaA2: "Deutsch A2",
    bubble: "Привіт! З чого почнемо?",
    certLink: "Приклад сертифіката",
    certCaption: "Так виглядає сертифікат після завершення курсу",
    steps: [
      { icon: PlayCircle, title: "Дивись", text: "Короткі відеоуроки з поясненнями" },
      { icon: Bot, title: "Практикуй", text: "AI-тренер перевіряє відповіді одразу" },
      { icon: Mic, title: "Говори", text: "Мовні завдання з вимовою" },
      { icon: Award, title: "Підтверди", text: "Сертифікат після фінального тесту" },
    ],
  },
  ru: {
    title: "Язык, на котором ты реально заговоришь.",
    sub: "Смотришь урок, сразу тренируешься с AI, говоришь вслух и получаешь сертификат. Всё в одном месте.",
    cta: "Выбрать курс",
    ctaA2: "Deutsch A2",
    bubble: "Привет! С чего начнём?",
    certLink: "Пример сертификата",
    certCaption: "Так выглядит сертификат после завершения курса",
    steps: [
      { icon: PlayCircle, title: "Смотри", text: "Короткие видеоуроки с объяснениями" },
      { icon: Bot, title: "Практикуй", text: "AI-тренер проверяет ответы сразу" },
      { icon: Mic, title: "Говори", text: "Речевые задания с произношением" },
      { icon: Award, title: "Подтверди", text: "Сертификат после финального теста" },
    ],
  },
} as const;

interface Props {
  lang: Lang;
  onPickCourse: () => void;
  onOpenA2: () => void;
}

const CourseHero = ({ lang, onPickCourse, onOpenA2 }: Props) => {
  const t = T[lang === "uk" ? "uk" : "ru"];
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden border-b border-border/30">
      {/* One quiet background: soft glow + dot grid. No blur blobs. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_85%_0%,hsl(var(--accent)/0.18),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:radial-gradient(hsl(var(--foreground)/0.07)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]" />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-6 px-4 py-8 md:grid-cols-[1.3fr_1fr] md:gap-10 md:px-6 md:py-14">
        <div className="flex flex-col gap-5 text-left pl-12 md:pl-0">
          <h1 className="font-display text-3xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t.title}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">{t.sub}</p>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button size="lg" className="h-11 w-full font-display font-bold sm:w-auto" onClick={onPickCourse}>
              {t.cta}
            </Button>
            <Button size="lg" variant="outline" className="h-11 w-full font-display font-bold sm:w-auto" onClick={onOpenA2}>
              <GraduationCap className="mr-2 h-4 w-4" />
              {t.ctaA2}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="self-start text-sm text-muted-foreground underline underline-offset-4 transition hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 sm:self-center"
                >
                  {t.certLink}
                </button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="start" className="w-[min(92vw,420px)] border-accent/30 bg-card/95 p-3 backdrop-blur">
                <CertificatePreview lang={lang} />
                <p className="mt-2 text-center text-xs text-muted-foreground">{t.certCaption}</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* The one memorable element: the panda coach with a line of dialogue */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-col items-center md:items-end"
        >
          <button
            type="button"
            onClick={onPickCourse}
            className="relative mb-3 rounded-2xl rounded-bl-sm border border-accent/40 bg-card px-4 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 md:mr-10"
          >
            {t.bubble}
          </button>
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-accent/20 blur-3xl" aria-hidden />
            {reduceMotion ? (
              <img
                src={ACADEMY_PANDA_ASSETS.poster}
                alt={ACADEMY_PANDA_ASSETS.ariaLabel}
                className="relative w-36 sm:w-44 md:w-64 lg:w-72"
              />
            ) : (
              <LivePanda assets={ACADEMY_PANDA_ASSETS} className="relative w-36 sm:w-44 md:w-64 lg:w-72" />
            )}
          </div>
        </motion.div>
      </div>

      {/* How the academy works: this IS a sequence, so numbering is meaningful */}
      <div className="relative mx-auto max-w-6xl px-4 pb-6 md:px-6">
        <ol className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-border/30 pt-5 md:grid-cols-4">
          {t.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <s.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="font-display text-sm font-bold text-foreground">
                  {i + 1}. {s.title}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
};

export default CourseHero;
