import { Coins, ShieldCheck, Video, Bot, MessageCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/i18n/translations";

interface Props {
  course: {
    price: number;
    price_coins: number | null;
    total_lessons: number;
    total_hours: number;
    cohort_start_date: string | null;
    thumbnail_url: string | null;
    image_url: string | null;
  };
  isPurchased: boolean;
  purchasing: boolean;
  onPurchase: (method: "coins" | "eur") => void;
  onStart: () => void;
  lang: Lang;
}

const CourseCheckout = ({ course, isPurchased, purchasing, onPurchase, onStart, lang }: Props) => {
  const features = [
    { icon: Video, label: lang === "uk" ? "Відеолекції" : "Видеолекции" },
    { icon: Bot, label: "AI-" + (lang === "uk" ? "практика" : "практика") },
    { icon: MessageCircle, label: lang === "uk" ? "Чат з вчителем" : "Чат с учителем" },
    { icon: Award, label: lang === "uk" ? "Сертифікат" : "Сертификат" },
  ];

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Mini thumbnail */}
      {(course.thumbnail_url || course.image_url) && (
        <div className="aspect-video bg-muted/30">
          <img
            src={course.thumbnail_url || course.image_url!}
            alt=""
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-5 space-y-4">
        {isPurchased ? (
          <>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">
                {lang === "uk" ? "Придбано" : "Куплено"}
              </span>
            </div>
            <Button
              onClick={onStart}
              className="w-full font-display font-bold"
              size="lg"
            >
              {lang === "uk" ? "Почати навчатися" : "Начать учиться"}
            </Button>
          </>
        ) : (
          <>
            {/* Prices */}
            <div className="space-y-2">
              {course.price_coins != null && (
                <Button
                  onClick={() => onPurchase("coins")}
                  disabled={purchasing}
                  className="w-full font-display font-bold"
                  size="lg"
                >
                  <Coins className="w-4 h-4 mr-2" />
                  {lang === "uk" ? "Купити за" : "Купить за"} {course.price_coins} {lang === "uk" ? "монет" : "монет"}
                </Button>
              )}
              {course.price > 0 && (
                <Button
                  onClick={() => onPurchase("eur")}
                  disabled={purchasing}
                  variant="outline"
                  className="w-full font-display font-bold"
                  size="lg"
                >
                  {lang === "uk" ? "Купити за" : "Купить за"} {course.price}€
                </Button>
              )}
            </div>
          </>
        )}

        {/* What's included */}
        <div className="space-y-2.5 pt-2">
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
            {lang === "uk" ? "Що включено" : "Что включено"}
          </p>
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <f.icon className="w-3.5 h-3.5 text-primary/70" />
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        {/* Guarantee */}
        <div className="pt-2 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground text-center">
            🛡️ {lang === "uk" ? "Гарантія повернення 7 днів" : "Гарантия возврата 7 дней"}
          </p>
        </div>

        {/* Cohort */}
        {course.cohort_start_date && (
          <div className="text-center">
            <p className="text-[11px] text-primary font-medium">
              📅 {lang === "uk" ? "Наступний потік:" : "Следующий поток:"}{" "}
              {new Date(course.cohort_start_date).toLocaleDateString(lang === "uk" ? "uk-UA" : "ru-RU")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCheckout;
