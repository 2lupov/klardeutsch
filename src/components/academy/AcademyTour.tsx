import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Award, BookOpen, Mic, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import LivePanda from "@/components/LivePanda";
import webm from "@/assets/panda-academy-alpha.webm.asset.json";
import stacked from "@/assets/panda-academy-stacked.mp4.asset.json";
import poster from "@/assets/panda-academy-poster.png.asset.json";

const KEY = "klar_academy_tour_done";

const STEPS = {
  uk: [
    { icon: null, title: "Привіт! Вітаю тебе в KLAR 👋", text: "Я панда KLAR. Давай коротко покажу, як влаштована Академія." },
    { icon: BookOpen, title: "Програми й рівні", text: "Обери рівень A1–C1 у фільтрах — побачиш лише курси й модулі свого рівня." },
    { icon: Mic, title: "Практика одразу", text: "Кожен урок — теорія, вправи, аудіо й голосові відповіді з AI-перевіркою." },
    { icon: Award, title: "Прогрес і сертифікат", text: "Проходь уроки, збирай XP, а після фінального тесту отримуй сертифікат." },
  ],
  ru: [
    { icon: null, title: "Привет! Добро пожаловать в KLAR 👋", text: "Я панда KLAR. Давай коротко покажу, как устроена Академия." },
    { icon: BookOpen, title: "Программы и уровни", text: "Выбери уровень A1–C1 в фильтрах — увидишь только курсы и модули своего уровня." },
    { icon: Mic, title: "Практика сразу", text: "Каждый урок — теория, упражнения, аудио и голосовые ответы с AI-проверкой." },
    { icon: Award, title: "Прогресс и сертификат", text: "Проходи уроки, собирай XP, а после финального теста получай сертификат." },
  ],
};

export const openAcademyTour = () => window.dispatchEvent(new Event("klar-academy-tour"));

const AcademyTour = ({ lang }: { lang: string }) => {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const steps = STEPS[lang === "uk" ? "uk" : "ru"];

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setOpen(true);
    const h = () => { setI(0); setOpen(true); };
    window.addEventListener("klar-academy-tour", h);
    return () => window.removeEventListener("klar-academy-tour", h);
  }, []);

  const close = () => { localStorage.setItem(KEY, "1"); setOpen(false); };
  if (!open) return null;
  const s = steps[i];
  const last = i === steps.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-5 text-center shadow-2xl"
      >
        <button onClick={close} aria-label="Закрити" className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        {i === 0 ? (
          <LivePanda
            className="mx-auto h-48 w-auto object-contain"
            assets={{ webm: webm.url, stacked: stacked.url, poster: poster.url, ariaLabel: "Панда KLAR махає лапкою" }}
          />
        ) : (
          s.icon && (
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <s.icon className="h-8 w-8" />
            </div>
          )
        )}
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h3 className="mt-3 font-display text-xl font-bold text-foreground">{s.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{s.text}</p>
          </motion.div>
        </AnimatePresence>
        <div className="my-4 flex justify-center gap-1.5">
          {steps.map((_, d) => (
            <span key={d} className={`h-2 rounded-full transition-all ${d === i ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {!last && (
            <Button variant="ghost" className="flex-1" onClick={close}>
              {lang === "uk" ? "Пропустити" : "Пропустить"}
            </Button>
          )}
          <Button className="flex-1" onClick={() => (last ? close() : setI(i + 1))}>
            {last ? (lang === "uk" ? "Почати!" : "Начать!") : lang === "uk" ? "Далі" : "Дальше"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default AcademyTour;
