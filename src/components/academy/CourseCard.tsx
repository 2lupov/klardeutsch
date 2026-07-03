import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Clock, BookOpen, ChevronRight, Play, Coins } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Lang } from "@/i18n/translations";
import pandaCourseDefault from "@/assets/panda-course-default.jpg";

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
  A1: "bg-primary/20 text-primary border border-primary/30",
  A2: "bg-primary/20 text-primary border border-primary/30",
  B1: "bg-accent/20 text-accent border border-accent/30",
  B2: "bg-accent/20 text-accent border border-accent/30",
  C1: "bg-accent/25 text-accent border border-accent/40",
};

const CourseCard = ({ course, lang, isPurchased, progress }: Props) => {
  const navigate = useNavigate();
  const difficulty = course.difficulty ?? course.level;
  const colorClass = levelColors[difficulty] ?? "bg-primary/20 text-primary border border-primary/30";

  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      onClick={() => navigate(`/academy/${course.id}`)}
      className="group relative flex flex-col rounded-2xl border border-border/40 bg-card/70 backdrop-blur-sm overflow-hidden text-left hover:border-accent/50 hover:shadow-[0_20px_60px_-20px_hsl(var(--accent)/0.35)] transition-all"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted/30 overflow-hidden">
        {(course.thumbnail_url || course.image_url) ? (
          <img
            src={course.thumbnail_url || course.image_url!}
            alt={course.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="relative w-full h-full">
            <img
              src={pandaCourseDefault}
              alt={course.title}
              loading="lazy"
              width={1280}
              height={768}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-accent uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5" />
                {lang === "uk" ? "Курс KLAR" : "Курс KLAR"}
              </div>
              <p className="font-display text-sm font-bold text-foreground line-clamp-2 leading-tight mt-1">
                {course.title}
              </p>
            </div>
          </div>
        )}

        {/* Play icon overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-background/40 backdrop-blur-[2px]">
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center shadow-[0_10px_30px_-5px_hsl(var(--accent)/0.6)]">
            <Play className="w-5 h-5 text-accent-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Level badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur ${colorClass}`}>
          {difficulty}
        </div>

        {/* Featured badge */}
        {course.is_featured && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-accent text-accent-foreground text-[11px] font-bold shadow-lg">
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
          <div className="flex items-center justify-between pt-2 border-t border-border/30">
            <div className="flex items-center gap-2">
              {course.price_coins != null && (
                <span className="flex items-center gap-1 text-sm font-bold text-accent">
                  <Coins className="w-4 h-4" />
                  {course.price_coins}
                </span>
              )}
              {course.price > 0 && course.price_coins != null && (
                <span className="text-muted-foreground/50 text-[11px]">/</span>
              )}
              {course.price > 0 && (
                <span className="text-xs font-semibold text-foreground/80">
                  ₴{course.price}
                </span>
              )}
            </div>
            <span className="text-xs font-semibold text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
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
