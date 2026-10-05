import { useNavigate } from "react-router-dom";
import { ChevronRight, GraduationCap, Target } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { A2_PRICE_UAH } from "@/features/german-a2/pricing";

const T = {
  uk: {
    title: "Deutsch A2",
    text: "Два способи пройти A2: інтерактивний курс або тренажер до екзамену telc.",
    course: "Інтерактивний курс Perfekt",
    courseText: "Відео, слова, граматика, читання, аудіювання, письмо й тест",
    price: `${A2_PRICE_UAH} грн, доступ назавжди`,
    telc: "Тренажер telc A2",
    telcText: "17 модулів, 119 уроків, словник і 3 пробні іспити",
  },
  ru: {
    title: "Deutsch A2",
    text: "Два способа пройти A2: интерактивный курс или тренажёр к экзамену telc.",
    course: "Интерактивный курс Perfekt",
    courseText: "Видео, слова, грамматика, чтение, аудирование, письмо и тест",
    price: `${A2_PRICE_UAH} грн, доступ навсегда`,
    telc: "Тренажёр telc A2",
    telcText: "17 модулей, 119 уроков, словарь и 3 пробных экзамена",
  },
} as const;

const Row = ({ icon: Icon, title, text, meta, onClick }: { icon: any; title: string; text: string; meta?: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="group flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
  >
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
      <Icon className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-display text-sm font-bold text-foreground">{title}</span>
      <span className="block text-xs text-muted-foreground">{text}</span>
      {meta && <span className="mt-0.5 block text-xs font-semibold text-primary">{meta}</span>}
    </span>
    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
  </button>
);

const GermanA2Banner = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const t = T[lang === "uk" ? "uk" : "ru"];

  return (
    <section className="mb-8 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card/60 to-transparent p-4 md:p-5">
      <h2 className="font-display text-lg font-bold text-foreground">{t.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.text}</p>
      <div className="mt-3 grid gap-1 md:grid-cols-2 md:gap-3">
        <Row icon={GraduationCap} title={t.course} text={t.courseText} meta={t.price} onClick={() => navigate("/course/a2")} />
        <Row icon={Target} title={t.telc} text={t.telcText} onClick={() => navigate("/a2")} />
      </div>
    </section>
  );
};

export default GermanA2Banner;
