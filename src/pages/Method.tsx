import { useLanguage } from "@/contexts/LanguageContext";
import { Brain, Sparkles, Target, Zap, Star, ArrowLeft, Volume2, Loader2, Pause, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useCallback, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion, AnimatePresence } from "framer-motion";

const testimonials = {
  ru: [
    { name: "Анна К.", photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Anna", text: "За 3 месяца с KLAR я сдала Goethe A2! Карточки и квизы — просто огонь 🔥" },
    { name: "Дмитрий П.", photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Dmitry", text: "Наконец-то немецкий не кажется скучным. Система прогресса мотивирует заниматься каждый день." },
    { name: "Олена В.", photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Olena", text: "Мне нравится, что всё ясно и без лишнего. AI-разбор ошибок — это гениально!" },
    { name: "Максим Т.", photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Max", text: "Аудирование с ElevenLabs — как живой преподаватель. Рекомендую всем, кто учит немецкий!" },
  ],
  uk: [
    { name: "Анна К.", photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Anna", text: "За 3 місяці з KLAR я склала Goethe A2! Картки та квізи — просто вогонь 🔥" },
    { name: "Дмитро П.", photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Dmitry", text: "Нарешті німецька не здається нудною. Система прогресу мотивує займатися щодня." },
    { name: "Олена В.", photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Olena", text: "Мені подобається, що все ясно і без зайвого. AI-розбір помилок — це геніально!" },
    { name: "Максим Т.", photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Max", text: "Аудіювання з ElevenLabs — як живий викладач. Рекомендую всім, хто вчить німецьку!" },
  ],
};

const motivationText: Record<string, string> = {
  ru: "Привет! Я — KLAR, твой помощник в изучении немецкого языка. Забудь скучные учебники и бесконечную зубрёжку. Здесь всё по-другому: короткие уроки, умные карточки, квизы и аудирование — всего 5–10 минут в день. Искусственный интеллект анализирует именно твои ошибки и подсказывает, над чем работать. А система XP, достижений и дуэлей с друзьями превращает учёбу в увлекательную игру. От A1 до C1 — ясно, просто и бесплатно. Начни прямо сейчас!",
  uk: "Привіт! Я — KLAR, твій помічник у вивченні німецької мови. Забудь нудні підручники та нескінченне зубріння. Тут все інакше: короткі уроки, розумні картки, квізи та аудіювання — лише 5–10 хвилин на день. Штучний інтелект аналізує саме твої помилки і підказує, над чим працювати. А система XP, досягнень та дуелей з друзями перетворює навчання на захопливу гру. Від A1 до C1 — ясно, просто і безкоштовно. Починай прямо зараз!",
};

const voiceIdMap: Record<string, string> = {
  ru: "ycbyWsnf4hqZgdpKHqiU",
  uk: "2OXYbN1uGomXXJtv9Dq6",
};

const faqItems = {
  ru: [
    { q: "Как работает подписка?", a: "KLAR полностью бесплатен. Все уровни (A1–C1), карточки, квизы, аудирование и AI-разбор ошибок доступны без ограничений. Мы развиваем проект за счёт магазина авторских заданий." },
    { q: "Как установить KLAR на iPhone?", a: "Откройте klardeutsch.org в Safari → нажмите кнопку «Поделиться» (внизу) → «На экран Домой». Приложение появится как обычная иконка." },
    { q: "Как установить KLAR на Android?", a: "Откройте klardeutsch.org в Chrome → нажмите три точки (⋮) → «Добавить на главный экран» или дождитесь всплывающего баннера «Установить»." },
    { q: "Работает ли KLAR без интернета?", a: "Да! После первой загрузки основные карточки и интерфейс кэшируются. Вы можете повторять слова офлайн. Для AI-функций и аудирования нужен интернет." },
    { q: "Чем KLAR отличается от Duolingo?", a: "KLAR создан специально для русско/украиноговорящих. Объяснения на вашем языке, AI разбирает именно ваши ошибки, а система уровней соответствует Goethe-Institut (A1–C1)." },
  ],
  uk: [
    { q: "Як працює підписка?", a: "KLAR повністю безкоштовний. Усі рівні (A1–C1), картки, квізи, аудіювання та AI-розбір помилок доступні без обмежень. Ми розвиваємо проєкт за рахунок магазину авторських завдань." },
    { q: "Як встановити KLAR на iPhone?", a: "Відкрийте klardeutsch.org у Safari → натисніть кнопку «Поділитися» (внизу) → «На екран Домому». Застосунок з'явиться як звичайна іконка." },
    { q: "Як встановити KLAR на Android?", a: "Відкрийте klardeutsch.org у Chrome → натисніть три крапки (⋮) → «Додати на головний екран» або дочекайтеся спливаючого банера «Встановити»." },
    { q: "Чи працює KLAR без інтернету?", a: "Так! Після першого завантаження основні картки та інтерфейс кешуються. Ви можете повторювати слова офлайн. Для AI-функцій та аудіювання потрібен інтернет." },
    { q: "Чим KLAR відрізняється від Duolingo?", a: "KLAR створений спеціально для російсько/україномовних. Пояснення вашою мовою, AI розбирає саме ваші помилки, а система рівнів відповідає Goethe-Institut (A1–C1)." },
  ],
};

const featuresData = {
  ru: [
    { icon: Target, title: "Ясность", desc: "Простые объяснения без лишней воды. Каждый урок — конкретный результат." },
    { icon: Brain, title: "AI-технологии", desc: "Искусственный интеллект анализирует ваши ошибки и подсказывает, над чем работать." },
    { icon: Zap, title: "Скорость", desc: "5–10 минут в день. Карточки, квизы и аудирование в удобном темпе." },
    { icon: Sparkles, title: "Мотивация", desc: "XP, достижения, дуэли с друзьями и магазин заданий — учиться интересно." },
  ],
  uk: [
    { icon: Target, title: "Ясність", desc: "Прості пояснення без зайвого. Кожен урок — конкретний результат." },
    { icon: Brain, title: "AI-технології", desc: "Штучний інтелект аналізує ваші помилки та підказує, над чим працювати." },
    { icon: Zap, title: "Швидкість", desc: "5–10 хвилин на день. Картки, квізи та аудіювання у зручному темпі." },
    { icon: Sparkles, title: "Мотивація", desc: "XP, досягнення, дуелі з друзями та магазин завдань — вчитися цікаво." },
  ],
};

const ui = {
  ru: {
    heroTitle: "Метод",
    heroSub1: "Немецкий язык — ясно и просто.",
    heroSub2: "От A1 до C1 с AI-поддержкой.",
    audioLabel: "🎧 Послушай мотивацию KLAR",
    audioLoading: "Загрузка...",
    audioPlaying: "Сейчас играет",
    audioPaused: "На паузе — нажми чтобы продолжить",
    audioIdle: "Нажми, чтобы услышать",
    whyTitle: "Почему KLAR?",
    reviewsTitle: "Отзывы учеников",
    faqTitle: "Частые вопросы",
    cta: "Начать бесплатно",
    footerPrivacy: "Политика конфиденциальности",
    footerTerms: "Оферта",
    footerCopy: "KLAR — Немецкий язык ясно и просто",
  },
  uk: {
    heroTitle: "Метод",
    heroSub1: "Німецька мова — ясно і просто.",
    heroSub2: "Від A1 до C1 з AI-підтримкою.",
    audioLabel: "🎧 Послухай мотивацію KLAR",
    audioLoading: "Завантаження...",
    audioPlaying: "Зараз грає",
    audioPaused: "На паузі — натисни щоб продовжити",
    audioIdle: "Натисни, щоб почути",
    whyTitle: "Чому KLAR?",
    reviewsTitle: "Відгуки учнів",
    faqTitle: "Часті запитання",
    cta: "Почати безкоштовно",
    footerPrivacy: "Політика конфіденційності",
    footerTerms: "Оферта",
    footerCopy: "KLAR — Німецька мова ясно і просто",
  },
};

/* Typewriter component for KLAR */
const TypewriterKLAR = () => {
  const letters = ["K", "L", "A", "R"];
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (visibleCount < letters.length) {
      const timer = setTimeout(() => setVisibleCount((c) => c + 1), 400);
      return () => clearTimeout(timer);
    }
  }, [visibleCount, letters.length]);

  return (
    <span className="text-gradient inline-flex">
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 12, scale: 0.7 }}
          animate={i < visibleCount ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.7 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          {letter}
        </motion.span>
      ))}
      {visibleCount < letters.length && (
        <motion.span
          className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 self-center"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatType: "reverse" }}
        />
      )}
    </span>
  );
};

const Method = () => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  const t = ui[lang] || ui.ru;
  const features = featuresData[lang] || featuresData.ru;
  const reviews = testimonials[lang] || testimonials.ru;
  const faqs = faqItems[lang] || faqItems.ru;

  const playMotivation = useCallback(async () => {
    // Playing → pause
    if (audioState === "playing" && audioRef.current) {
      audioRef.current.pause();
      setAudioState("paused");
      return;
    }

    // Paused → resume
    if (audioState === "paused" && audioRef.current) {
      await audioRef.current.play();
      setAudioState("playing");
      return;
    }

    // Check cache first
    const cachedUrl = audioCacheRef.current.get(lang);
    if (cachedUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(cachedUrl);
      audioRef.current = audio;
      audio.onended = () => setAudioState("idle");
      audio.onpause = () => {
        if (!audio.ended) setAudioState("paused");
      };
      audio.onplay = () => setAudioState("playing");
      await audio.play();
      return;
    }

    setAudioState("loading");
    try {
      const text = motivationText[lang] || motivationText.ru;
      const voiceId = voiceIdMap[lang] || voiceIdMap.ru;

      const { fetchEdgeFunction } = await import("@/lib/auth-fetch");
      const response = await fetchEdgeFunction("elevenlabs-tts", {
        json: { text, voiceId, speed: 1.1 },
      });

      if (!response.ok) throw new Error("TTS failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      audioCacheRef.current.set(lang, url);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setAudioState("idle");
      audio.onpause = () => {
        if (!audio.ended) setAudioState("paused");
      };
      audio.onplay = () => setAudioState("playing");
      await audio.play();
    } catch {
      setAudioState("idle");
    }
  }, [lang, audioState]);

  return (
    <div className="min-h-[100dvh] overflow-y-auto bg-background text-foreground standalone-scroll">
      {/* Hero */}
      <section className="relative px-4 pt-12 pb-16 text-center overflow-hidden">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="relative z-10 max-w-xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
            {t.heroTitle} <TypewriterKLAR />
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            {t.heroSub1}<br />
            {t.heroSub2}
          </p>

          <button
            onClick={playMotivation}
            className="glass-card max-w-md mx-auto flex items-center gap-4 px-6 py-5 mb-4 cursor-pointer hover:border-primary/30 transition-all group"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              <AnimatePresence mode="wait">
                {audioState === "loading" ? (
                  <motion.div key="load" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                    <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  </motion.div>
                ) : audioState === "playing" ? (
                  <motion.div key="pause" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                    <Pause className="w-6 h-6 text-primary" />
                  </motion.div>
                ) : audioState === "paused" ? (
                  <motion.div key="play" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                    <Play className="w-6 h-6 text-primary" />
                  </motion.div>
                ) : (
                  <motion.div key="vol" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}>
                    <Volume2 className="w-6 h-6 text-primary" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <div className="text-left">
              <p className="font-display font-semibold text-sm">{t.audioLabel}</p>
              <p className="text-xs text-muted-foreground">
                {audioState === "loading" ? t.audioLoading : audioState === "playing" ? t.audioPlaying : audioState === "paused" ? t.audioPaused : t.audioIdle}
              </p>
            </div>
            {audioState === "playing" && (
              <div className="flex items-center gap-0.5 ml-auto">
                {[0, 1, 2, 3].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 rounded-full bg-primary"
                    animate={{ height: [8, 20, 8] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                  />
                ))}
              </div>
            )}
          </button>
        </div>

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      </section>

      {/* Features */}
      <section className="px-4 py-12 max-w-2xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-center mb-8">{t.whyTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((f, i) => (
            <div key={i} className="glass-card p-5 flex gap-4 items-start animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-display font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-4 py-12 max-w-2xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-center mb-8">{t.reviewsTitle}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {reviews.map((r, i) => (
            <div key={i} className="glass-card p-5 animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex items-center gap-3 mb-3">
                <img src={r.photo} alt={r.name} className="w-10 h-10 rounded-full bg-secondary" />
                <div>
                  <p className="font-semibold text-sm">{r.name}</p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-3 h-3 text-primary fill-primary" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-12 max-w-xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-center mb-8">{t.faqTitle}</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="glass-card border-none px-4">
              <AccordionTrigger className="text-sm font-semibold text-left hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="px-4 py-12 text-center max-w-md mx-auto">
        <button
          onClick={() => navigate("/auth")}
          className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all hover:opacity-90"
        >
          {t.cta}
        </button>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border text-center text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">{t.footerPrivacy}</button>
          <span>·</span>
          <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">{t.footerTerms}</button>
        </div>
        <p>© {new Date().getFullYear()} {t.footerCopy}</p>
      </footer>
    </div>
  );
};

export default Method;
