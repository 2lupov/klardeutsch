import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Shield, Flame, X } from "lucide-react";
import { useDailyBonus, BonusReward } from "@/hooks/useDailyBonus";
import { useLanguage } from "@/contexts/LanguageContext";
import StreakPlant from "@/components/StreakPlant";
import MilestoneCelebration from "@/components/streak/MilestoneCelebration";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const DailyBonusDialog = () => {
  const { canClaim, streak, loading, claim, shields, milestoneStreak, clearMilestone } = useDailyBonus();
  const { lang } = useLanguage();
  const isUk = lang === "uk";
  const [open, setOpen] = useState(false);
  const [claimed, setClaimed] = useState<BonusReward | null>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (canClaim && !loading) {
      const timer = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(timer);
    }
  }, [canClaim, loading]);

  const handleClaim = async () => {
    setClaiming(true);
    const reward = await claim();
    setClaimed(reward);
    setClaiming(false);
  };

  if (loading || (!canClaim && !open && !claimed)) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 border-0 bg-transparent shadow-none max-w-[380px] overflow-visible [&>button.absolute]:hidden">
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
            style={{
              background:
                "radial-gradient(120% 80% at 50% 0%, hsl(var(--primary) / 0.35) 0%, hsl(var(--background)) 55%, hsl(var(--background)) 100%)",
            }}
          >
            {/* Ambient glow orbs */}
            <div className="pointer-events-none absolute -top-20 -left-16 w-56 h-56 rounded-full bg-primary/30 blur-3xl" />
            <div className="pointer-events-none absolute -top-10 -right-12 w-40 h-40 rounded-full bg-amber-400/20 blur-3xl" />

            {/* Close */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative z-10 px-6 pt-8 pb-6 flex flex-col items-center">
              {/* Header pill */}
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <Gift className="w-3.5 h-3.5 text-primary" />
                <span className="text-[11px] font-display font-semibold tracking-wider uppercase text-white/80">
                  {isUk ? "Щоденний бонус" : "Ежедневный бонус"}
                </span>
              </div>

              {/* Streak + shields row */}
              <div className="mt-3 flex items-center gap-2">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/25">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-bold text-orange-300">
                    {streak} {isUk ? (streak === 1 ? "день" : "днів") : (streak === 1 ? "день" : "дней")}
                  </span>
                </div>
                {shields > 0 && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/25">
                    <Shield className="w-3.5 h-3.5 text-sky-300" />
                    <span className="text-xs font-bold text-sky-200">×{shields}</span>
                  </div>
                )}
              </div>

              {/* Panda scene */}
              <div className="mt-5">
                <StreakPlant streak={streak} canClaim={canClaim && !claimed} hideBadges />
              </div>

              <AnimatePresence mode="wait">
                {!claimed ? (
                  <motion.div
                    key="claim"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="mt-6 w-full flex flex-col items-center"
                  >
                    <h3 className="font-display font-bold text-xl text-white text-center leading-tight">
                      {isUk ? "Розбуди панду" : "Разбуди панду"}
                    </h3>
                    <p className="mt-1.5 text-sm text-white/60 text-center">
                      {isUk ? "Забери свою нагороду за сьогодні" : "Забери свою награду за сегодня"}
                    </p>

                    <button
                      onClick={handleClaim}
                      disabled={claiming}
                      className="mt-5 w-full py-3.5 rounded-2xl font-display font-bold text-sm text-primary-foreground bg-primary hover:brightness-110 active:scale-[0.98] transition disabled:opacity-60 shadow-lg shadow-primary/30"
                    >
                      {claiming
                        ? (isUk ? "Будимо панду…" : "Будим панду…")
                        : (isUk ? "🎁 Забрати подарунок" : "🎁 Забрать подарок")}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="reward"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 220, damping: 18 }}
                    className="mt-6 w-full flex flex-col items-center"
                  >
                    <motion.div
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.05 }}
                      className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-amber-400/20 border border-white/10 flex items-center justify-center text-5xl shadow-inner"
                    >
                      <span role="img" aria-label="reward">{claimed.emoji}</span>
                    </motion.div>

                    <p className="mt-4 font-display font-bold text-2xl text-white text-center">
                      {claimed.label}
                    </p>
                    <p className="mt-1 text-xs text-white/60 text-center">
                      {isUk ? "Приходь завтра — панда чекає 🐼" : "Приходи завтра — панда ждёт 🐼"}
                    </p>

                    <button
                      onClick={() => setOpen(false)}
                      className="mt-5 w-full py-3.5 rounded-2xl font-display font-bold text-sm text-primary-foreground bg-primary hover:brightness-110 active:scale-[0.98] transition shadow-lg shadow-primary/30"
                    >
                      {isUk ? "✨ Чудово!" : "✨ Отлично!"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </DialogContent>
      </Dialog>

      {milestoneStreak && (
        <MilestoneCelebration streak={milestoneStreak} lang={lang} onClose={clearMilestone} />
      )}
    </>
  );
};

export default DailyBonusDialog;
