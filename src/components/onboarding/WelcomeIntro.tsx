import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, AtSign, BookOpen, GraduationCap, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { nicknameSchema } from "@/lib/nickname-auth";

interface Props {
  onComplete: () => void;
}

const features = [
  {
    icon: GraduationCap,
    titleRu: "Живые занятия",
    titleUk: "Живі заняття",
    textRu: "Учитель ведёт урок, а задания, заметки и материалы появляются у тебя сразу.",
    textUk: "Викладач веде урок, а завдання, нотатки й матеріали з’являються в тебе одразу.",
  },
  {
    icon: Sparkles,
    titleRu: "Интерактивная Академия",
    titleUk: "Інтерактивна Академія",
    textRu: "Изучай немецкий через истории, аудио, игровые сцены и практику — не скучные конспекты.",
    textUk: "Вивчай німецьку через історії, аудіо, ігрові сцени та практику — не нудні конспекти.",
  },
  {
    icon: BookOpen,
    titleRu: "Всё в одном месте",
    titleUk: "Усе в одному місці",
    textRu: "Домашние задания, словарь и твой прогресс всегда под рукой.",
    textUk: "Домашні завдання, словник і твій прогрес завжди під рукою.",
  },
  {
    icon: Send,
    titleRu: "Подключи Telegram",
    titleUk: "Прив'яжи Telegram",
    textRu: "Так ты сможешь восстановить пароль без почты и получать новости и напоминания о занятиях.",
    textUk: "Так ти зможеш відновити пароль без пошти й отримувати новини та нагадування про заняття.",
  },
];

const WelcomeIntro = ({ onComplete }: Props) => {
  const [active, setActive] = useState(0);
  const { lang } = useLanguage();
  const { user } = useAuth() as any;
  const feature = features[active];
  const Icon = feature.icon;
  const isTelegram = feature.icon === Send;
  const tgLink = `https://t.me/klar_deutsch_bot${user?.id ? `?start=${user.id}` : ""}`;
  const isLast = active === features.length - 1;

  const advance = () => {
    if (isLast) {
      onComplete();
      return;
    }
    setActive((current) => current + 1);
  };

  return (
    <div className="space-y-6 text-center">
      <div>
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/20"
        >
          <span className="font-display text-xl font-bold">K</span>
        </motion.div>
        <p className="mb-2 text-sm font-semibold uppercase text-accent">
          {lang === "uk" ? "Ласкаво просимо до KLAR" : "Добро пожаловать в KLAR"}
        </p>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
          {lang === "uk" ? "Німецька, яку хочеться вивчати" : "Немецкий, который хочется учить"}
        </h2>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card/70 p-6 shadow-xl backdrop-blur-xl">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="flex min-h-48 flex-col items-center justify-center"
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Icon className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-bold text-foreground">
              {lang === "uk" ? feature.titleUk : feature.titleRu}
            </h3>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              {lang === "uk" ? feature.textUk : feature.textRu}
            </p>
            {isTelegram && (
              <Button asChild variant="outline" className="mt-4 rounded-xl">
                <a href={tgLink} target="_blank" rel="noopener noreferrer">
                  <Send className="h-4 w-4" />
                  {lang === "uk" ? "Відкрити бота й прив'язати" : "Открыть бота и привязать"}
                </a>
              </Button>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="mt-5 flex justify-center gap-2" aria-label={lang === "uk" ? "Можливості KLAR" : "Возможности KLAR"}>
          {features.map((item, index) => (
            <Button
              key={item.titleRu}
              type="button"
              variant="ghost"
              animated={false}
              onClick={() => setActive(index)}
              aria-label={`${index + 1} / ${features.length}`}
              aria-current={index === active ? "step" : undefined}
              className={`min-w-0 p-0 transition-all hover:bg-primary/80 ${index === active ? "h-2 w-7 bg-primary" : "h-2 w-2 bg-muted"}`}
            />
          ))}
        </div>
      </div>

      <Button onClick={advance} size="lg" className="h-12 w-full rounded-xl text-base">
        {isLast
          ? lang === "uk" ? "Почати знайомство" : "Начать знакомство"
          : lang === "uk" ? "Далі" : "Дальше"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export default WelcomeIntro;