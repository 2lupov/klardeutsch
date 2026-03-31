import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PlacementTest from "@/components/onboarding/PlacementTest";
import GoalSelector from "@/components/onboarding/GoalSelector";
import DailyGoalPicker from "@/components/onboarding/DailyGoalPicker";
import FirstLesson from "@/components/onboarding/FirstLesson";

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [level, setLevel] = useState("A1");
  const [goal, setGoal] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(15);
  const { user } = useAuth();
  const navigate = useNavigate();

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
    setStep(3);
  };

  const handleComplete = async () => {
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true } as any)
        .eq("user_id", user.id);
      // Award first lesson bonus
      await supabase.rpc("award_xp", { p_user_id: user.id, p_amount: 10 });
      await supabase.rpc("award_coins", { p_user_id: user.id, p_amount: 5, p_reason: "onboarding" });
    }
    navigate("/", { replace: true });
  };

  const steps = [
    <PlacementTest key="test" onComplete={handlePlacement} />,
    <GoalSelector key="goal" onComplete={handleGoal} />,
    <DailyGoalPicker key="daily" onComplete={handleDailyGoal} />,
    <FirstLesson key="lesson" level={level} onComplete={handleComplete} />,
  ];

  // Step dots
  const dots = [0, 1, 2, 3];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6">
      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {dots.map((d) => (
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
