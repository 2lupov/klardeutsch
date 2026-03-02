import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Swords, Plus, ArrowLeft, BookOpen, Brain, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import CreateChallenge from "@/components/challenges/CreateChallenge";
import PlayChallenge from "@/components/challenges/PlayChallenge";

export interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  challenge_type: string;
  level: string;
  status: string;
  challenger_score: number;
  opponent_score: number;
  winner_id: string | null;
  questions: any[];
  challenger_answers: any[];
  opponent_answers: any[];
  xp_reward: number;
  created_at: string;
  // joined from profiles
  challenger_name?: string;
  challenger_avatar?: string;
  opponent_name?: string;
  opponent_avatar?: string;
}

type Screen = "list" | "create" | "play";

const Challenges = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isMobile } = usePlatform();
  const [screen, setScreen] = useState<Screen>("list");
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChallenge, setActiveChallenge] = useState<Challenge | null>(null);

  const loadChallenges = async () => {
    if (!user) return;
    setLoading(true);

    const { data: raw } = await supabase
      .from("challenges")
      .select("*")
      .or(`challenger_id.eq.${user.id},opponent_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(50);

    if (!raw || raw.length === 0) {
      setChallenges([]);
      setLoading(false);
      return;
    }

    // Get all unique user IDs for profiles
    const userIds = [...new Set(raw.flatMap((c: any) => [c.challenger_id, c.opponent_id]))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p]));

    const enriched: Challenge[] = raw.map((c: any) => ({
      ...c,
      questions: c.questions ?? [],
      challenger_answers: c.challenger_answers ?? [],
      opponent_answers: c.opponent_answers ?? [],
      challenger_name: profileMap.get(c.challenger_id)?.display_name ?? t("loading"),
      challenger_avatar: profileMap.get(c.challenger_id)?.avatar_url ?? null,
      opponent_name: profileMap.get(c.opponent_id)?.display_name ?? t("loading"),
      opponent_avatar: profileMap.get(c.opponent_id)?.avatar_url ?? null,
    }));

    setChallenges(enriched);
    setLoading(false);
  };

  useEffect(() => {
    loadChallenges();
  }, [user]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("challenges-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "challenges" }, () => {
        loadChallenges();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const pending = useMemo(() => challenges.filter((c) => c.opponent_id === user?.id && c.status === "challenger_done"), [challenges, user]);
  const _myTurn = useMemo(() => challenges.filter((c) => c.challenger_id === user?.id && c.status === "pending"), [challenges, user]);
  const completed = useMemo(() => challenges.filter((c) => c.status === "completed"), [challenges]);
  const waiting = useMemo(() => challenges.filter((c) =>
    (c.challenger_id === user?.id && c.status === "challenger_done") ||
    (c.opponent_id === user?.id && c.status === "pending")
  ), [challenges, user]);

  const handlePlay = (challenge: Challenge) => {
    setActiveChallenge(challenge);
    setScreen("play");
  };

  const handleChallengeCreated = () => {
    setScreen("list");
    loadChallenges();
    toast({ title: t("challengeSent") });
  };

  const handlePlayFinished = () => {
    setScreen("list");
    setActiveChallenge(null);
    loadChallenges();
  };

  if (!user) return null;

  if (screen === "create") {
    return (
      <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button onClick={() => setScreen("list")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {t("back")}
        </button>
        <CreateChallenge onCreated={handleChallengeCreated} />
      </div>
    );
  }

  if (screen === "play" && activeChallenge) {
    return (
      <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button onClick={() => { setScreen("list"); setActiveChallenge(null); }} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {t("back")}
        </button>
        <PlayChallenge challenge={activeChallenge} onFinished={handlePlayFinished} />
      </div>
    );
  }

  return (
    <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Swords className="w-5 h-5 text-primary" />
          {t("challengesTitle")}
        </h1>
        <button
          onClick={() => setScreen("create")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-display font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {t("newChallenge")}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Incoming challenges */}
            {pending.length > 0 && (
              <Section title={t("incomingChallenges")} icon={<Swords className="w-4 h-4 text-primary" />}>
                {pending.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} userId={user.id} onPlay={handlePlay} t={t} />
                ))}
              </Section>
            )}

            {/* Waiting for opponent */}
            {waiting.length > 0 && (
              <Section title={t("waitingForOpponent")} icon={<Clock className="w-4 h-4 text-muted-foreground" />}>
                {waiting.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} userId={user.id} t={t} />
                ))}
              </Section>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <Section title={t("completedChallenges")} icon={<CheckCircle2 className="w-4 h-4 text-muted-foreground" />}>
                {completed.map((c) => (
                  <ChallengeCard key={c.id} challenge={c} userId={user.id} t={t} />
                ))}
              </Section>
            )}

            {challenges.length === 0 && (
              <div className="text-center py-12">
                <Swords className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{t("noChallenges")}</p>
                <button
                  onClick={() => setScreen("create")}
                  className="mt-3 text-sm text-primary hover:underline font-display font-medium"
                >
                  {t("createFirstChallenge")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const Section = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <div>
    <h2 className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
      {icon} {title}
    </h2>
    <div className="space-y-2">{children}</div>
  </div>
);

const ChallengeCard = ({
  challenge: c,
  userId,
  onPlay,
  t,
}: {
  challenge: Challenge;
  userId: string;
  onPlay?: (c: Challenge) => void;
  t: (key: any) => string;
}) => {
  const isChallenger = c.challenger_id === userId;
  const opponentName = isChallenger ? c.opponent_name : c.challenger_name;
  const opponentAvatar = isChallenger ? c.opponent_avatar : c.challenger_avatar;
  const initials = (opponentName ?? "?").slice(0, 2).toUpperCase();
  const canPlay = (c.status === "challenger_done" && c.opponent_id === userId) ||
                  (c.status === "pending" && c.challenger_id === userId);
  const isCompleted = c.status === "completed";
  const myScore = isChallenger ? c.challenger_score : c.opponent_score;
  const theirScore = isChallenger ? c.opponent_score : c.challenger_score;
  const won = c.winner_id === userId;
  const draw = isCompleted && !c.winner_id;

  return (
    <div className="glass-card px-3 py-3 flex items-center gap-3">
      <Avatar className="w-9 h-9 shrink-0">
        {opponentAvatar ? <AvatarImage src={opponentAvatar} /> : null}
        <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-medium text-foreground truncate">{opponentName}</p>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          {c.challenge_type === "vocab" ? <BookOpen className="w-3 h-3" /> : <Brain className="w-3 h-3" />}
          {c.challenge_type === "vocab" ? t("vocabSublabel") : t("grammarSublabel")} · {c.level}
        </p>
      </div>
      {isCompleted ? (
        <div className="text-right shrink-0">
          <span className={`text-sm font-display font-bold ${won ? "text-primary" : draw ? "text-muted-foreground" : "text-destructive"}`}>
            {myScore}:{theirScore}
          </span>
          <p className="text-[10px] text-muted-foreground">
            {won ? t("won") : draw ? t("draw") : t("lost")}
          </p>
        </div>
      ) : canPlay && onPlay ? (
        <button
          onClick={() => onPlay(c)}
          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-medium hover:bg-primary/90 transition-colors"
        >
          {t("play")}
        </button>
      ) : (
        <span className="text-[10px] text-muted-foreground">{t("waiting")}</span>
      )}
    </div>
  );
};

export default Challenges;
