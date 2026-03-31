import { useState, useEffect } from "react";
import { Gift, Sparkles, Shield } from "lucide-react";
import { useDailyBonus, BonusReward } from "@/hooks/useDailyBonus";
import { useLanguage } from "@/contexts/LanguageContext";
import StreakPlant from "@/components/StreakPlant";
import MilestoneCelebration from "@/components/streak/MilestoneCelebration";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DailyBonusDialog = () => {
  const { canClaim, streak, loading, claim, shields, milestoneStreak, clearMilestone } = useDailyBonus();
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [claimed, setClaimed] = useState<BonusReward | null>(null);
  const [claiming, setClaiming] = useState(false);

  // Auto-open when bonus is available (using useEffect to avoid render-time side effects)
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="glass-card border-primary/20 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-center text-lg flex items-center justify-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            Ежедневный бонус 🐼
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Streak Plant */}
          <StreakPlant streak={streak} canClaim={canClaim && !claimed} />

          {!claimed ? (
            <>
              <p className="text-sm text-muted-foreground text-center">
                Разбуди панду — забери подарок!
              </p>

              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {claiming ? "Будим панду... 🐼" : "🐼 Разбудить и забрать подарок"}
              </button>
            </>
          ) : (
            <>
              {/* Reward reveal */}
              <span className="text-5xl block animate-scale-in" role="img" aria-label="reward">
                {claimed.emoji}
              </span>

              <div className="text-center">
                <p className="font-display font-bold text-lg text-foreground">
                  {claimed.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Приходи завтра — панда ждёт! 🐼
                </p>
              </div>

              <button
                onClick={() => setOpen(false)}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                ✨ Отлично!
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DailyBonusDialog;
