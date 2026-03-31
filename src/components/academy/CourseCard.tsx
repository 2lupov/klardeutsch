import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, BookOpen, ChevronRight, Play, Coins } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Lang } from "@/i18n/translations";

interface CourseData {
  id: string;
  title: string;
  description: string | null;
  level: string;
  price: number;
  price_coins: number | null;
  image_url: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  instructor_avatar: string | null;
  total_modules: number;
  total_lessons: number;
  total_hours: number;
  difficulty: string | null;
  is_featured: boolean;
}

interface Props {
  course: CourseData;
  lang: Lang;
  isPurchased: boolean;
  progress?: number; // 0-100
}

const levelColors: Record<string, string> = {
  A1: "bg-emerald-500/20 text-emerald-400",
  A2: "bg-sky-500/20 text-sky-400",
  B1: "bg-amber-500/20 text-amber-400",
  B2: "bg-orange-500/20 text-orange-400",
  C1: "bg-rose-500/20 text-rose-400",
};

const CourseCard = ({ course, lang, isPurchased, progress }: Props) => {
  const navigate = useNavigate();
  const difficulty = course.difficulty ?? course.level;
  const colorClass = levelColors[difficulty] ?? "bg-primary/20 text-primary";

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      onClick={() => navigate(`/academy/${course.id}`)}
      className="group relative flex flex-col rounded-2xl border border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden text-left hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted/30 overflow-hidden">
        {(course.thumbnail_url || course.image_url) ? (
          <img
            src={course.thumbnail_url || course.image_url!}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
            <BookOpen className="w-10 h-10 text-primary/30" />
          </div>
        )}

        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-xl">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
          </div>
        </div>

        {/* Level badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold ${colorClass}`}>
          {difficulty}
        </div>

        {/* Featured badge */}
        {course.is_featured && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-primary/90 text-primary-foreground text-[11px] font-bold">
            ⭐ {lang === "uk" ? "Топ" : "Топ"}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <h3 className="font-display text-sm font-bold text-foreground line-clamp-2 leading-snug">
          {course.title}
        </h3>

        {course.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {course.description}
          </p>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {course.total_modules > 0 && (
            <span>{course.total_modules} {lang === "uk" ? "модулів" : "модулей"}</span>
          )}
          {course.total_hours > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {course.total_hours} {lang === "uk" ? "год" : "ч"}
            </span>
          )}
        </div>

        {/* Instructor */}
        {course.instructor_name && (
          <div className="flex items-center gap-2">
            {course.instructor_avatar ? (
              <img src={course.instructor_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                {course.instructor_name[0]}
              </div>
            )}
            <span className="text-[11px] text-muted-foreground">{course.instructor_name}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer */}
        {isPurchased ? (
          <div className="space-y-2">
            <Progress value={progress ?? 0} className="h-1.5" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                {progress ?? 0}% {lang === "uk" ? "пройдено" : "пройдено"}
              </span>
              <span className="text-xs font-semibold text-primary flex items-center gap-1">
                {lang === "uk" ? "Продовжити" : "Продолжить"}
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between pt-1 border-t border-border/20">
            <div className="flex items-center gap-2">
              {course.price_coins != null && (
                <span className="flex items-center gap-1 text-sm font-bold text-primary">
                  <Coins className="w-4 h-4" />
                  {course.price_coins}
                </span>
              )}
              {course.price > 0 && course.price_coins != null && (
                <span className="text-muted-foreground/50 text-[11px]">/</span>
              )}
              {course.price > 0 && (
                <span className="text-xs font-semibold text-foreground/80">
                  {course.price}€
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
              {lang === "uk" ? "Детальніше" : "Подробнее"}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </div>
        )}
      </div>
    </motion.button>
  );
};

export default CourseCard;
