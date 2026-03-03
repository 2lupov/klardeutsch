import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, Medal, Award } from "lucide-react";
import UserProfileDialog from "@/components/UserProfileDialog";

interface LeaderboardEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  rank: number;
}

const Leaderboard = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<LeaderboardEntry | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("get_leaderboard", { p_limit: 50 });
      setEntries((data as LeaderboardEntry[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="text-muted-foreground text-sm">{t("loading")}</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="glass-card p-5 text-center">
        <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{t("leaderboardEmpty")}</p>
      </div>
    );
  }

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-primary" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-muted-foreground" />;
    if (rank === 3) return <Award className="w-5 h-5 text-accent-foreground" />;
    return <span className="w-5 text-center text-xs font-bold text-muted-foreground">{rank}</span>;
  };

  return (
    <div className="flex flex-col gap-1.5">
      {entries.map((entry) => {
        const isMe = entry.user_id === user?.id;
        const name = entry.display_name || "User";
        const initials = name.slice(0, 2).toUpperCase();

        return (
          <button
            key={entry.user_id}
            onClick={() => setSelectedUser(entry)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-left ${
              isMe ? "bg-primary/10 border border-primary/20" : "glass-card hover:border-primary/20"
            }`}
          >
            <div className="w-6 flex items-center justify-center shrink-0">
              {rankIcon(entry.rank)}
            </div>
            <Avatar className="w-8 h-8 shrink-0">
              {entry.avatar_url ? <AvatarImage src={entry.avatar_url} alt={name} /> : null}
              <AvatarFallback className="text-xs font-display font-bold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className={`flex-1 text-sm font-display font-medium truncate ${isMe ? "text-primary" : "text-foreground"}`}>
              {name} {isMe && "⭐"}
            </span>
            <span className="text-sm font-display font-bold text-gradient shrink-0">
              {entry.total_xp} XP
            </span>
          </button>
        );
      })}

      <UserProfileDialog
        userId={selectedUser?.user_id ?? null}
        displayName={selectedUser?.display_name ?? null}
        avatarUrl={selectedUser?.avatar_url ?? null}
        totalXp={selectedUser?.total_xp ?? 0}
        open={!!selectedUser}
        onOpenChange={(open) => !open && setSelectedUser(null)}
      />
    </div>
  );
};

export default Leaderboard;
