import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Swords, BookOpen, Star, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface UserProfileDialogProps {
  userId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  totalXp: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserStats {
  wordsLearned: number;
  lessonsCompleted: number;
  duelsWon: number;
  challengesPlayed: number;
}

const UserProfileDialog = ({
  userId,
  displayName,
  avatarUrl,
  totalXp,
  open,
  onOpenChange,
}: UserProfileDialogProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(false);

  const isMe = userId === user?.id;
  const name = displayName || "User";
  const initials = name.slice(0, 2).toUpperCase();

  useEffect(() => {
    if (!open || !userId) return;
    setLoading(true);
    const load = async () => {
      // Check if this is a demo user
      const { data: demoUser } = await supabase
        .from("demo_leaderboard")
        .select("words_learned, lessons_completed, duels_won, duels_played")
        .eq("id", userId)
        .maybeSingle();

      if (demoUser) {
        setStats({
          wordsLearned: (demoUser as any).words_learned ?? 0,
          lessonsCompleted: (demoUser as any).lessons_completed ?? 0,
          duelsWon: (demoUser as any).duels_won ?? 0,
          challengesPlayed: (demoUser as any).duels_played ?? 0,
        });
      } else {
        const [duelsRes, challengesRes] = await Promise.all([
          supabase
            .from("challenges")
            .select("id", { count: "exact", head: true })
            .eq("winner_id", userId),
          supabase
            .from("challenges")
            .select("id", { count: "exact", head: true })
            .or(`challenger_id.eq.${userId},opponent_id.eq.${userId}`)
            .eq("status", "done"),
        ]);
        setStats({
          wordsLearned: 0,
          lessonsCompleted: 0,
          duelsWon: duelsRes.count ?? 0,
          challengesPlayed: challengesRes.count ?? 0,
        });
      }
      setLoading(false);
    };
    load();
  }, [open, userId]);

  const handleChallenge = () => {
    onOpenChange(false);
    // Navigate to games page with challenges screen and pre-selected opponent
    navigate("/games", {
      state: {
        screen: "challenges",
        challengeUser: {
          user_id: userId,
          display_name: displayName,
          avatar_url: avatarUrl,
        },
      },
    });
  };

  // XP level calculation
  const level = Math.floor(totalXp / 100) + 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-border/50 bg-background">
        <DialogTitle className="sr-only">Профиль {name}</DialogTitle>
        {/* Header with gradient */}
        <div className="relative h-24 bg-gradient-to-br from-primary/30 via-primary/10 to-accent/20">
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2">
            <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
              <AvatarFallback className="text-lg font-display font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div className="pt-12 pb-5 px-5 flex flex-col items-center gap-4">
          {/* Name & level */}
          <div className="text-center">
            <h3 className="font-display text-lg font-bold text-foreground">
              {name} {isMe && "⭐"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Уровень {level} · {totalXp} XP
            </p>
          </div>

          {/* Stats grid */}
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : stats ? (
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="glass-card p-3 flex flex-col items-center gap-1">
                <Trophy className="w-4 h-4 text-primary" />
                <span className="text-lg font-display font-bold text-foreground">{totalXp}</span>
                <span className="text-[10px] text-muted-foreground">XP</span>
              </div>
              <div className="glass-card p-3 flex flex-col items-center gap-1">
                <Swords className="w-4 h-4 text-primary" />
                <span className="text-lg font-display font-bold text-foreground">{stats.duelsWon}</span>
                <span className="text-[10px] text-muted-foreground">Дуэлей выиграно</span>
              </div>
              <div className="glass-card p-3 flex flex-col items-center gap-1">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-lg font-display font-bold text-foreground">{stats.wordsLearned}</span>
                <span className="text-[10px] text-muted-foreground">Слов изучено</span>
              </div>
              <div className="glass-card p-3 flex flex-col items-center gap-1">
                <Star className="w-4 h-4 text-primary" />
                <span className="text-lg font-display font-bold text-foreground">{stats.challengesPlayed}</span>
                <span className="text-[10px] text-muted-foreground">Дуэлей сыграно</span>
              </div>
            </div>
          ) : null}

          {/* Challenge button — only show for other users */}
          {!isMe && userId && (
            <button
              onClick={handleChallenge}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
            >
              <Swords className="w-4 h-4" />
              Вызвать на дуэль
            </button>
          )}

          {isMe && (
            <p className="text-xs text-muted-foreground text-center">Это ты! 🎉</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileDialog;
