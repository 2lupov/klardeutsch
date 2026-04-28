import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import CourseHero from "@/components/academy/CourseHero";
import CourseFilters from "@/components/academy/CourseFilters";
import CourseCard from "@/components/academy/CourseCard";
import { Construction, Presentation, ChevronRight, Sparkles, ClipboardList } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface CourseRow {
  id: string;
  title: string;
  description: string | null;
  level: string;
  price: number;
  price_coins: number | null;
  available: boolean;
  image_url: string | null;
  thumbnail_url: string | null;
  instructor_name: string | null;
  instructor_avatar: string | null;
  total_modules: number;
  total_lessons: number;
  total_hours: number;
  difficulty: string | null;
  is_featured: boolean;
  tags: string[] | null;
  outcomes: string[] | null;
}

const ALLOWED_NICKNAMES = ["2lupov7"];

const Academy = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setProfileLoaded(true); return; }
    supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? null);
        setProfileLoaded(true);
      });
  }, [user]);

  const hasAccess = ALLOWED_NICKNAMES.includes(displayName ?? "");

  useEffect(() => {
    if (!hasAccess) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("courses")
        .select("*")
        .eq("available", true)
        .order("created_at", { ascending: false });

      setCourses((data as CourseRow[]) ?? []);

      if (user) {
        const { data: purchases } = await supabase
          .from("course_purchases")
          .select("course_id")
          .eq("user_id", user.id);
        setPurchasedIds(new Set((purchases ?? []).map((p) => p.course_id)));
      }
      setLoading(false);
    };
    load();
  }, [user, hasAccess]);

  if (!profileLoaded) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Top entries — visible to all (students access via teacher invite)
  const TopBanners = () => (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 mb-6">
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => navigate("/tutoring")}
        className="w-full text-left relative overflow-hidden rounded-2xl p-5 md:p-6 bg-gradient-to-br from-primary via-primary to-accent shadow-lg group"
      >
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_white,_transparent_60%)]" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center flex-shrink-0">
            <Presentation className="w-6 h-6 md:w-7 md:h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-display font-bold text-white text-base md:text-lg leading-tight">
                {lang === "uk" ? "Уроки з вчителем" : "Уроки с преподавателем"}
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3" /> AI
              </span>
            </div>
            <p className="text-white/85 text-xs md:text-sm leading-snug line-clamp-2">
              {lang === "uk"
                ? "Живі заняття, домашні завдання та аналіз прогресу з персональним викладачем"
                : "Живые занятия, домашние задания и анализ прогресса с личным преподавателем"}
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform flex-shrink-0" />
        </div>
      </motion.button>

      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate("/assignments")}
        className="relative overflow-hidden rounded-2xl p-4 md:p-5 bg-card border border-border hover:border-primary/40 hover:shadow-md transition group flex md:flex-col items-center md:items-start gap-3 md:min-w-[180px]"
      >
        <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-sm md:text-base leading-tight mb-0.5">
            {lang === "uk" ? "Мої завдання" : "Мои задания"}
          </h3>
          <p className="text-xs text-muted-foreground leading-snug">
            {lang === "uk" ? "Тести, ДЗ, вправи" : "Тесты, ДЗ, упражнения"}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
      </motion.button>
    </div>
  );

  const TutoringBanner = TopBanners;

  // Show "under development" for everyone except allowed users — but still expose Tutoring
  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] px-6 py-10 text-center">
        <div className="w-full max-w-md">
          <TutoringBanner />
        </div>
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mt-4">
          <Construction className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-3">
          {lang === "uk" ? "Курси в розробці" : "Курсы в разработке"}
        </h1>
        <p className="text-muted-foreground text-sm max-w-md leading-relaxed">
          {lang === "uk"
            ? "Ми працюємо над курсами для вас. А поки можете записатися на уроки з персональним викладачем вище! 🚀"
            : "Мы работаем над курсами для вас. А пока можете записаться на уроки с персональным преподавателем выше! 🚀"}
        </p>
      </div>
    );
  }

  const levels = ["all", "A1", "A2", "B1", "B2", "C1"];
  const allTags = Array.from(new Set(courses.flatMap((c) => c.tags ?? [])));

  const filtered = courses.filter((c) => {
    if (levelFilter !== "all" && (c.difficulty ?? c.level) !== levelFilter) return false;
    if (tagFilter !== "all" && !(c.tags ?? []).includes(tagFilter)) return false;
    return true;
  });

  return (
    <div className="w-full mx-auto animate-slide-up">
      <CourseHero lang={lang} />

      <div className="max-w-6xl mx-auto px-4 pb-8 pt-4">
        <TutoringBanner />
        <CourseFilters
          lang={lang}
          levels={levels}
          tags={allTags}
          levelFilter={levelFilter}
          tagFilter={tagFilter}
          onLevelChange={setLevelFilter}
          onTagChange={setTagFilter}
        />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-3xl mb-3">📚</p>
            <p className="text-muted-foreground text-sm">
              {lang === "uk" ? "Курсів поки немає" : "Курсов пока нет"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                lang={lang}
                isPurchased={purchasedIds.has(course.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Academy;
