import { useState, useEffect } from "react";
import { Gift, Flame, Sparkles } from "lucide-react";
import { useDailyBonus, BonusReward } from "@/hooks/useDailyBonus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DailyBonusDialog = () => {
  const { canClaim, streak, loading, claim } = useDailyBonus();
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
            Ежедневный бонус
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Streak indicator */}
          <div className="flex items-center gap-2 text-sm">
            <Flame className="w-4 h-4 text-primary" />
            <span className="font-display font-bold text-foreground">
              {streak} {streak === 1 ? "день" : streak < 5 ? "дня" : "дней"} подряд
            </span>
          </div>

          {!claimed ? (
            <>
              {/* Gift box animation */}
              <div className="relative">
                <span className="text-6xl block animate-bounce" role="img" aria-label="gift">🎁</span>
                <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-primary animate-pulse" />
              </div>

              <p className="text-sm text-muted-foreground text-center">
                Забери свой ежедневный подарок!
              </p>

              <button
                onClick={handleClaim}
                disabled={claiming}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {claiming ? "Открываю..." : "🎉 Забрать подарок"}
              </button>
            </>
          ) : (
            <>
              {/* Reward reveal */}
              <span className="text-6xl block animate-scale-in" role="img" aria-label="reward">
                {claimed.emoji}
              </span>

              <div className="text-center">
                <p className="font-display font-bold text-lg text-foreground">
                  {claimed.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Приходи завтра за новым бонусом!
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
