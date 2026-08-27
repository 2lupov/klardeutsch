import { useEffect, useState } from "react";
import { ArrowRight, MessagesSquare, BookOpen, PenLine, Sparkles } from "lucide-react";
import WordRain from "@/components/klar/WordRain";
import WortschatzJar from "@/components/klar/WortschatzJar";
import LeadModal from "@/components/klar/LeadModal";
import FortuneWheel from "@/components/klar/FortuneWheel";
import { useReveal, stagger } from "@/components/klar/useReveal";
import { initMetaPixel } from "@/lib/meta-pixel";
import pandaCoach from "@/assets/panda-coach.png";
import pandaScholar from "@/assets/panda-scholar.png";
import pandaGraduate from "@/assets/mascot/panda-graduate.png";
import pandaWaving from "@/assets/mascot/panda-waving.png";
import pandaCelebrating from "@/assets/mascot/panda-celebrating.png";


const TESTIMONIALS = [
  {
    name: "Олена",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=160&fit=crop",
    text: "Я вчила німецьку в групах роками і майже не говорила. Тут говорю з першого заняття — спочатку страшно, потім звично.",
  },
  {
    name: "Дмитро",
    photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=160&fit=crop",
    text: "Готувався до роботи в Німеччині. Програму зробили під мою сферу, лексика саме та, яка потрібна на співбесіді.",
  },
  {
    name: "Марія",
    photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=160&h=160&fit=crop",
    text: "Найбільше вразили повторення: слова справді залишаються, а не зникають через тиждень.",
  },
  {
    name: "Ігор",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&h=160&fit=crop",
    text: "Граматику нарешті пояснили людською мовою. Артиклі та порядок слів перестали бути магією.",
  },
];

const BENEFITS = [
  {
    de: "SPRECHEN",
    title: "Говоріть з першого заняття",
    text: "Розмовна практика — основа кожного уроку. Не теорія «на потім», а мова, якою ви користуєтесь одразу.",
    Icon: MessagesSquare,
  },
  {
    de: "WORTSCHATZ",
    title: "Слова, які залишаються",
    text: "Інтервальні повторення замість зубріння. Лексика повертається у потрібний момент і закріплюється.",
    Icon: BookOpen,
  },
  {
    de: "GRAMMATIK",
    title: "Граматика без зубріння",
    text: "Правила зрозумілою мовою, з прикладами з життя. Спочатку логіка, потім вправи.",
    Icon: PenLine,
  },
];

const STEPS = [
  { n: "01", title: "Заявка", text: "Ви залишаєте заявку — я звʼязуюся з вами в Telegram і уточнюю вашу мету." },
  { n: "02", title: "Безкоштовне пробне заняття", text: "60 хвилин онлайн: дивимось рівень, пробуємо формат роботи, говоримо німецькою." },
  { n: "03", title: "Індивідуальний план", text: "Складаю програму під вашу мету: побут, робота, переїзд або іспит. Далі — системна робота." },
];

const Section = ({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => {
  const { ref, shown } = useReveal<HTMLElement>();
  return (
    <section
      ref={ref}
      id={id}
      className={`relative z-10 transition-all duration-700 ${
        shown ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      } ${className}`}
    >
      {children}
    </section>
  );
};

const KlarLanding = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [discount, setDiscount] = useState<string | null>(null);

  const open = () => setModalOpen(true);

  useEffect(() => {
    initMetaPixel();
  }, []);



  // Auto-open once per session: exit intent (desktop) or after 40s.
  useEffect(() => {
    if (sessionStorage.getItem("klar_lead_auto")) return;
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      sessionStorage.setItem("klar_lead_auto", "1");
      setModalOpen(true);
    };
    const timer = window.setTimeout(fire, 40000);
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0) fire();
    };
    const desktop = window.matchMedia("(min-width: 768px)").matches;
    if (desktop) document.addEventListener("mouseout", onLeave);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return (
    <div className="standalone-scroll relative min-h-[100dvh] bg-klar-bg font-klar-body text-klar-pearl">
      <WordRain />

      {/* ══ Header ══ */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-klar-aqua/10 bg-klar-bg/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <a href="#top" className="flex items-center gap-2">
            <img
              src={pandaWaving}
              alt="Маскот KLAR — панда"
              className="h-9 w-9 object-contain drop-shadow-[0_2px_8px_hsl(var(--klar-aqua)/0.4)]"
            />
            <span className="font-klar-display text-xl font-bold tracking-tight text-klar-pearl">Клар</span>
          </a>

          <button
            onClick={open}
            className="rounded-xl bg-klar-aqua px-4 py-2 text-sm font-semibold text-klar-bg transition-all hover:shadow-[0_0_24px_hsl(var(--klar-aqua)/0.45)] sm:px-5 sm:py-2.5"
          >
            Залишити заявку
          </button>
        </div>
      </header>

      {/* ══ Hero ══ */}
      <Section id="top" className="px-4 pb-14 pt-28 sm:px-6 sm:pt-36">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2">
          <div>
            <p className="mb-4 text-[11px] uppercase tracking-[0.22em] text-klar-aqua">
              Німецька за авторською методикою
            </p>
            <h1 className="font-klar-display text-[34px] font-semibold leading-[1.12] text-klar-pearl sm:text-5xl lg:text-6xl">
              Німецька, яка нарешті залишається в голові
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-klar-pearl/70 sm:text-base">
              Індивідуальні онлайн-заняття A1–B2. Розмовна практика з першого уроку, Wortschatz
              через інтервальні повторення, граматика зрозумілою мовою та програма під вашу
              мету — побут, робота, переїзд чи іспит.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={open}
                className="group flex items-center gap-2 rounded-xl bg-klar-aqua px-7 py-3.5 font-semibold text-klar-bg transition-all hover:shadow-[0_0_32px_hsl(var(--klar-aqua)/0.5)]"
              >
                Залишити заявку
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
              <span className="text-sm text-klar-pearl/55">Перше пробне заняття — безкоштовно</span>
            </div>
          </div>
          <WortschatzJar />
        </div>
      </Section>

      {/* ══ Price ══ */}
      <Section className="px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-klar-aqua/15 bg-klar-surface/70 px-6 py-10 text-center backdrop-blur-sm sm:px-10">
            <p className="text-[11px] uppercase tracking-[0.22em] text-klar-pearl/45">
              Вартість заняття
            </p>
            <div className="mt-4 flex items-end justify-center gap-4">
              <span className="font-klar-display text-2xl text-klar-pearl/40 line-through">700 ₴</span>
              <span className="font-klar-display text-6xl font-semibold text-klar-sand sm:text-7xl">
                550 ₴
              </span>
            </div>
            <p className="mt-3 text-sm text-klar-pearl/60">за заняття · 60 хвилин · онлайн</p>
            <div className="mt-7 inline-flex animate-klar-pulse items-center gap-2 rounded-full border border-klar-sand/40 bg-klar-sand/10 px-5 py-2.5 text-sm text-klar-sand">
              <Sparkles className="h-4 w-4" />
              Перше пробне заняття — безкоштовно
            </div>
            <div className="mt-8">
              <button
                onClick={open}
                className="rounded-xl border border-klar-aqua/40 px-7 py-3 font-medium text-klar-aqua transition-all hover:bg-klar-aqua/10 hover:shadow-[0_0_24px_hsl(var(--klar-aqua)/0.3)]"
              >
                Записатись на пробне
              </button>
            </div>
          </div>
        </div>
      </Section>

      {/* ══ Benefits ══ */}
      <Section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-klar-display text-3xl text-klar-pearl sm:text-4xl">Що ви отримаєте</h2>
        </div>
        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6 md:mx-auto md:max-w-6xl md:grid md:grid-cols-3 md:overflow-visible">
          {BENEFITS.map((b, i) => (
            <article
              key={b.de}
              style={stagger(i)}
              className="min-w-[82%] snap-center rounded-3xl border border-klar-aqua/15 bg-klar-surface/60 p-7 backdrop-blur-sm transition-colors hover:border-klar-aqua/35 sm:min-w-[60%] md:min-w-0"
            >
              <b.Icon className="h-6 w-6 text-klar-aqua" />
              <p className="mt-5 text-[11px] uppercase tracking-[0.22em] text-klar-aqua/80">{b.de}</p>
              <h3 className="mt-2 font-klar-display text-2xl text-klar-pearl">{b.title}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-klar-pearl/65">{b.text}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ══ Method (light section) ══ */}
      <Section className="relative z-10 bg-klar-pearl px-4 py-16 text-klar-bg sm:px-6 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="font-klar-display text-3xl font-semibold sm:text-4xl">
            Не зубріння, а система
          </h2>
          <p className="mt-5 text-[15px] leading-relaxed text-klar-bg/75 sm:text-base">
            Методика будується на трьох простих речах: ви говорите на кожному занятті, лексика
            повертається за графіком повторень, а граматика подається як логіка мови, а не як
            таблиця для запамʼятовування.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { t: "Індивідуальна програма", d: "Складаю план під вашу мету і темп — без універсальних курсів «для всіх»." },
              { t: "Інтервальні повторення", d: "Слова та конструкції повертаються тоді, коли мозок готовий їх забути." },
              { t: "Матеріали після уроку", d: "Конспект, лексика та завдання — щоб заняття продовжувалось між уроками." },
            ].map((x, i) => (
              <div key={x.t} style={stagger(i)}>
                <h3 className="font-klar-display text-xl font-semibold">{x.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-klar-bg/70">{x.d}</p>
              </div>
            ))}
          </div>
          <p className="mt-10 text-sm text-klar-bg/55">
            Я не обіцяю «вільну німецьку за місяць». Обіцяю чесну системну роботу і зрозумілий
            прогрес, який ви відчуєте на заняттях.
          </p>
        </div>
      </Section>

      {/* ══ Steps ══ */}
      <Section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-klar-display text-3xl text-klar-pearl sm:text-4xl">Як почати</h2>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div
                key={s.n}
                style={stagger(i)}
                className="rounded-3xl border border-klar-aqua/15 bg-klar-surface/50 p-7"
              >
                <span className="font-klar-display text-3xl text-klar-sand">{s.n}</span>
                <h3 className="mt-3 font-klar-display text-2xl text-klar-pearl">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-klar-pearl/65">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ══ Testimonials ══ */}
      <Section className="py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-klar-display text-3xl text-klar-pearl sm:text-4xl">Відгуки учнів</h2>
        </div>
        <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:px-6">
          {TESTIMONIALS.map((t, i) => (
            <figure
              key={t.name}
              style={stagger(i)}
              className="min-w-[85%] snap-center rounded-3xl border border-klar-aqua/15 bg-klar-surface/60 p-7 sm:min-w-[46%] lg:min-w-[31%]"
            >
              <blockquote className="text-[15px] leading-relaxed text-klar-pearl/75">
                «{t.text}»
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <img
                  src={t.photo}
                  alt={`Учениця ${t.name}`}
                  loading="lazy"
                  className="h-11 w-11 rounded-full object-cover"
                />
                <span className="font-klar-display text-lg text-klar-pearl">{t.name}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      {/* ══ Final CTA — wheel ══ */}
      <Section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl rounded-3xl border border-klar-aqua/15 bg-klar-surface/60 px-6 py-12 text-center backdrop-blur-sm sm:px-10">
          <h2 className="font-klar-display text-3xl text-klar-pearl sm:text-4xl">
            Ваша знижка на перший пакет
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-klar-pearl/65">
            Крутіть колесо — знижка автоматично додасться до вашої заявки.
          </p>
          <div className="mt-10">
            <FortuneWheel
              onWin={(d) => {
                setDiscount(d);
                window.setTimeout(() => setModalOpen(true), 900);
              }}
            />
          </div>
        </div>
      </Section>

      {/* ══ Footer ══ */}
      <footer className="relative z-10 border-t border-klar-aqua/10 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-sm text-klar-pearl/55 sm:flex-row sm:justify-between">
          <span className="font-klar-display text-lg text-klar-pearl">Клар</span>
          <span>Клар © 2026</span>
          <a href="/klar-privacy" className="transition-colors hover:text-klar-aqua">
            Політика конфіденційності
          </a>
        </div>
      </footer>

      <LeadModal open={modalOpen} onClose={() => setModalOpen(false)} discount={discount} />
    </div>
  );
};

export default KlarLanding;
