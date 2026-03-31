import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import PlacementTest from "@/components/onboarding/PlacementTest";
import GoalSelector from "@/components/onboarding/GoalSelector";
import DailyGoalPicker from "@/components/onboarding/DailyGoalPicker";
import FirstLesson from "@/components/onboarding/FirstLesson";

const Onboarding = () => {
  const [step, setStep] = useState(-1); // -1 = loading/intro
  const [level, setLevel] = useState("A1");
  const [goal, setGoal] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const [isExisting, setIsExisting] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!user) return;
    // Detect if existing user (has progress or account older than 2 minutes)
    const checkExisting = async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("created_at")
        .eq("user_id", user.id)
        .single();

      const { count } = await supabase
        .from("user_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);

      const createdAt = profile?.created_at ? new Date(profile.created_at).getTime() : Date.now();
      const isOld = Date.now() - createdAt > 2 * 60 * 1000; // > 2 min old
      const hasProgress = (count ?? 0) > 0;

      if (isOld || hasProgress) {
        setIsExisting(true);
        setShowIntro(true);
      } else {
        setStep(0);
      }
    };
    checkExisting();
  }, [user]);

  const handlePlacement = (recommendedLevel: string) => {
    setLevel(recommendedLevel);
    if (user) {
      supabase
        .from("profiles")
        .update({ recommended_level: recommendedLevel } as any)
        .eq("user_id", user.id)
        .then();
    }
    setStep(1);
  };

  const handleGoal = (g: string) => {
    setGoal(g);
    if (user) {
      supabase
        .from("profiles")
        .update({ learning_goal: g } as any)
        .eq("user_id", user.id)
        .then();
    }
    setStep(2);
  };

  const handleDailyGoal = (minutes: number) => {
    setDailyMinutes(minutes);
    if (user) {
      supabase
        .from("profiles")
        .update({ daily_goal_minutes: minutes } as any)
        .eq("user_id", user.id)
        .then();
    }
    if (isExisting) {
      // Existing users skip the first lesson step
      handleComplete();
    } else {
      setStep(3);
    }
  };

  const handleComplete = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);
      if (!isExisting) {
        await supabase.rpc("award_xp", { p_user_id: user.id, p_amount: 10 });
        await supabase.rpc("award_coins", { p_user_id: user.id, p_amount: 5, p_reason: "onboarding" });
      }
    }
    navigate("/", { replace: true });
  };

  // Intro screen for existing users
  if (showIntro) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <p className="text-5xl mb-4">🙈</p>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            {lang === "uk" ? "Ой, вибач!" : "Упс, извини!"}
          </h2>
          <p className="text-muted-foreground mb-2">
            {lang === "uk"
              ? "Ми додали нову систему — хочемо краще підібрати контент під твій рівень."
              : "Мы добавили новую систему — хотим лучше подобрать контент под твой уровень."}
          </p>
          <p className="text-muted-foreground mb-6 text-sm">
            {lang === "uk"
              ? "Пройди 3 коротких кроки — займе менше хвилини! 🚀"
              : "Пройди 3 коротких шага — займёт меньше минуты! 🚀"}
          </p>
          <button
            onClick={() => { setShowIntro(false); setStep(0); }}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-lg"
          >
            {lang === "uk" ? "Давай! 💪" : "Давай! 💪"}
          </button>
          <button
            onClick={handleComplete}
            className="w-full py-2 mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {lang === "uk" ? "Пропустити" : "Пропустить"}
          </button>
        </motion.div>
      </div>
    );
  }

  if (step === -1) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <span className="text-muted-foreground animate-pulse font-display">KLAR</span>
      </div>
    );
  }

  const steps = [
    <PlacementTest key="test" onComplete={handlePlacement} />,
    <GoalSelector key="goal" onComplete={handleGoal} />,
    <DailyGoalPicker key="daily" onComplete={handleDailyGoal} />,
    ...(!isExisting ? [<FirstLesson key="lesson" level={level} onComplete={handleComplete} />] : []),
  ];

  const totalSteps = isExisting ? 3 : 4;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
      <div className="flex gap-2 mb-8">
        {Array.from({ length: totalSteps }).map((_, d) => (
          <div
            key={d}
            className={`h-2 rounded-full transition-all ${
              d === step ? "w-8 bg-primary" : d < step ? "w-2 bg-primary/60" : "w-2 bg-white/20"
            }`}
          />
        ))}
      </div>

      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -30 }}
            transition={{ duration: 0.3 }}
          >
            {steps[step]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Onboarding;
