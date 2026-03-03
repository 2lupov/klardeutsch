import { useLanguage } from "@/contexts/LanguageContext";
import { Brain, Sparkles, Target, Zap, Star, ChevronDown, ArrowLeft, Volume2, Loader2, Pause } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useCallback } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const testimonials = [
  {
    name: "Анна К.",
    photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Anna",
    text: "За 3 месяца с KLAR я сдала Goethe A2! Карточки и квизы — просто огонь 🔥",
  },
  {
    name: "Дмитрий П.",
    photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Dmitry",
    text: "Наконец-то немецкий не кажется скучным. Система прогресса мотивирует заниматься каждый день.",
  },
  {
    name: "Олена В.",
    photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Olena",
    text: "Мені подобається, що все ясно і без зайвого. AI-розбір помилок — це геніально!",
  },
  {
    name: "Максим Т.",
    photo: "https://api.dicebear.com/9.x/avataaars/svg?seed=Max",
    text: "Аудирование с ElevenLabs — как живой преподаватель. Рекомендую всем, кто учит немецкий!",
  },
];

const motivationText: Record<string, string> = {
  ru: "Привет! Я — KLAR, твой помощник в изучении немецкого языка. Забудь скучные учебники и бесконечную зубрёжку. Здесь всё по-другому: короткие уроки, умные карточки, квизы и аудирование — всего 5–10 минут в день. Искусственный интеллект анализирует именно твои ошибки и подсказывает, над чем работать. А система XP, достижений и дуэлей с друзьями превращает учёбу в увлекательную игру. От A1 до C1 — ясно, просто и бесплатно. Начни прямо сейчас!",
  uk: "Привіт! Я — KLAR, твій помічник у вивченні німецької мови. Забудь нудні підручники та нескінченне зубріння. Тут все інакше: короткі уроки, розумні картки, квізи та аудіювання — лише 5–10 хвилин на день. Штучний інтелект аналізує саме твої помилки і підказує, над чим працювати. А система XP, досягнень та дуелей з друзями перетворює навчання на захопливу гру. Від A1 до C1 — ясно, просто і безкоштовно. Починай прямо зараз!",
};

const voiceIdMap: Record<string, string> = {
  ru: "ycbyWsnf4hqZgdpKHqiU",
  uk: "2OXYbN1uGomXXJtv9Dq6",
};

const faqItems = [
  {
    q: "Как работает подписка?",
    a: "KLAR полностью бесплатен. Все уровни (A1–C1), карточки, квизы, аудирование и AI-разбор ошибок доступны без ограничений. Мы развиваем проект за счёт магазина авторских заданий.",
  },
  {
    q: "Как установить KLAR на iPhone?",
    a: "Откройте klardeutsch.org в Safari → нажмите кнопку «Поделиться» (внизу) → «На экран Домой». Приложение появится как обычная иконка.",
  },
  {
    q: "Как установить KLAR на Android?",
    a: "Откройте klardeutsch.org в Chrome → нажмите три точки (⋮) → «Добавить на главный экран» или дождитесь всплывающего баннера «Установить».",
  },
  {
    q: "Работает ли KLAR без интернета?",
    a: "Да! После первой загрузки основные карточки и интерфейс кэшируются. Вы можете повторять слова офлайн. Для AI-функций и аудирования нужен интернет.",
  },
  {
    q: "Чем KLAR отличается от Duolingo?",
    a: "KLAR создан специально для русско/украиноговорящих. Объяснения на вашем языке, AI разбирает именно ваши ошибки, а система уровней соответствует Goethe-Institut (A1–C1).",
  },
];

const features = [
  { icon: Target, title: "Ясность", desc: "Простые объяснения без лишней воды. Каждый урок — конкретный результат." },
  { icon: Brain, title: "AI-технологии", desc: "Искусственный интеллект анализирует ваши ошибки и подсказывает, над чем работать." },
  { icon: Zap, title: "Скорость", desc: "5–10 минут в день. Карточки, квизы и аудирование в удобном темпе." },
  { icon: Sparkles, title: "Мотивация", desc: "XP, достижения, дуэли с друзьями и магазин заданий — учиться интересно." },
];

const Method = () => {
  const { lang, t } = useLanguage();
  const navigate = useNavigate();
  const [audioState, setAudioState] = useState<"idle" | "loading" | "playing">("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playMotivation = useCallback(async () => {
    if (audioState === "playing" && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setAudioState("idle");
      return;
    }

    setAudioState("loading");
    try {
      const text = motivationText[lang] || motivationText.ru;
      const voiceId = voiceIdMap[lang] || voiceIdMap.ru;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text, voiceId }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setAudioState("idle");
      await audio.play();
      setAudioState("playing");
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
            Метод <span className="text-gradient">KLAR</span>
          </h1>
          <p className="text-muted-foreground text-lg mb-8">
            Немецкий язык — ясно и просто.<br />
            От A1 до C1 с AI-поддержкой.
          </p>

          {/* Audio motivation */}
          <button
            onClick={playMotivation}
            className="glass-card max-w-md mx-auto flex items-center gap-4 px-6 py-5 mb-4 cursor-pointer hover:border-primary/30 transition-all group"
          >
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
              {audioState === "loading" ? (
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              ) : audioState === "playing" ? (
                <Pause className="w-6 h-6 text-primary" />
              ) : (
                <Volume2 className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="text-left">
              <p className="font-display font-semibold text-sm">
                {lang === "uk" ? "🎧 Послухай мотивацію KLAR" : "🎧 Послушай мотивацию KLAR"}
              </p>
              <p className="text-xs text-muted-foreground">
                {audioState === "loading"
                  ? lang === "uk" ? "Завантаження..." : "Загрузка..."
                  : audioState === "playing"
                    ? lang === "uk" ? "Зараз грає — натисни щоб зупинити" : "Сейчас играет — нажми чтобы остановить"
                    : lang === "uk" ? "Натисни, щоб почути" : "Нажми, чтобы услышать"}
              </p>
            </div>
          </button>
        </div>

        {/* ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      </section>

      {/* Features */}
      <section className="px-4 py-12 max-w-2xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-center mb-8">Почему KLAR?</h2>
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
        <h2 className="text-2xl font-display font-bold text-center mb-8">Отзывы учеников</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {testimonials.map((t, i) => (
            <div key={i} className="glass-card p-5 animate-slide-up" style={{ animationDelay: `${i * 0.08}s` }}>
              <div className="flex items-center gap-3 mb-3">
                <img src={t.photo} alt={t.name} className="w-10 h-10 rounded-full bg-secondary" />
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-3 h-3 text-primary fill-primary" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-12 max-w-xl mx-auto">
        <h2 className="text-2xl font-display font-bold text-center mb-8">Частые вопросы</h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqItems.map((item, i) => (
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
          Начать бесплатно
        </button>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 border-t border-border text-center text-xs text-muted-foreground space-y-2">
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => navigate("/privacy")} className="hover:text-foreground transition-colors">Политика конфиденциальности</button>
          <span>·</span>
          <button onClick={() => navigate("/terms")} className="hover:text-foreground transition-colors">Оферта</button>
        </div>
        <p>© {new Date().getFullYear()} KLAR — Немецкий язык ясно и просто</p>
      </footer>
    </div>
  );
};

export default Method;
