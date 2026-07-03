import { Coins, ShieldCheck, Video, Bot, MessageCircle, Award } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  onPurchase: (method: "coins" | "uah") => void;
  onStart: () => void;
}

const CourseCheckout = ({ course, isPurchased, purchasing, onPurchase, onStart }: Props) => {
  const features = [
    { icon: Video, label: "Відеолекції" },
    { icon: Bot, label: "AI-практика" },
    { icon: MessageCircle, label: "Чат з вчителем" },
    { icon: Award, label: "Сертифікат" },
  ];

  return (
    <div className="rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden">
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
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary">Придбано</span>
            </div>
            <Button onClick={onStart} className="w-full font-display font-bold" size="lg">
              Почати навчання
            </Button>
          </>
        ) : (
          <div className="space-y-2">
            {course.price > 0 && (
              <Button
                onClick={() => onPurchase("uah")}
                disabled={purchasing}
                className="w-full font-display font-bold"
                size="lg"
              >
                Купити за ₴{course.price}
              </Button>
            )}
            {course.price_coins != null && (
              <Button
                onClick={() => onPurchase("coins")}
                disabled={purchasing}
                variant="outline"
                className="w-full font-display font-bold"
                size="lg"
              >
                <Coins className="w-4 h-4 mr-2" />
                Купити за {course.price_coins} монет
              </Button>
            )}
          </div>
        )}

        <div className="space-y-2.5 pt-2">
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">
            Що включено
          </p>
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <f.icon className="w-3.5 h-3.5 text-primary/70" />
              <span>{f.label}</span>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border/20">
          <p className="text-[10px] text-muted-foreground text-center">
            🛡️ Гарантія повернення 7 днів
          </p>
        </div>

        {course.cohort_start_date && (
          <div className="text-center">
            <p className="text-[11px] text-primary font-medium">
              📅 Наступний потік:{" "}
              {new Date(course.cohort_start_date).toLocaleDateString("uk-UA")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseCheckout;
