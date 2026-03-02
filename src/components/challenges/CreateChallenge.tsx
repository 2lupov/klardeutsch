import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Brain, Swords, Loader2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface UserEntry {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  onCreated: () => void;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const ROUNDS = 5;

const CreateChallenge = ({ onCreated }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserEntry | null>(null);
  const [type, setType] = useState<"vocab" | "grammar">("vocab");
  const [level, setLevel] = useState("A1");
  const [creating, setCreating] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .neq("user_id", user?.id ?? "")
        .limit(100);
      setUsers(data ?? []);
      setLoadingUsers(false);
    };
    load();
  }, [user]);

  const filtered = users.filter((u) => {
    const name = u.display_name?.toLowerCase() ?? "";
    return name.includes(search.toLowerCase());
  });

  const generateQuestions = async (): Promise<any[]> => {
    if (type === "vocab") {
      const { data } = await supabase
        .from("vocab_cards")
        .select("id, german, russian, article")
        .eq("level", level)
        .limit(50);
      if (!data || data.length < ROUNDS) return [];

      // Shuffle and pick ROUNDS
      const shuffled = data.sort(() => Math.random() - 0.5).slice(0, ROUNDS);
      return shuffled.map((card) => {
        // Generate 3 wrong answers from remaining cards
        const others = data.filter((c) => c.id !== card.id).sort(() => Math.random() - 0.5).slice(0, 3);
        const options = [card.russian, ...others.map((o) => o.russian)].sort(() => Math.random() - 0.5);
        return {
          question: `${card.article ? card.article + " " : ""}${card.german}`,
          options,
          correct_index: options.indexOf(card.russian),
        };
      });
    } else {
      const { data } = await supabase
        .from("grammar_questions")
        .select("question, options, correct_index")
        .eq("level", level)
        .limit(50);
      if (!data || data.length < ROUNDS) return [];
      return data.sort(() => Math.random() - 0.5).slice(0, ROUNDS).map((q) => ({
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
      }));
    }
  };

  const handleCreate = async () => {
    if (!selectedUser || !user) return;
    setCreating(true);

    const questions = await generateQuestions();
    if (questions.length < ROUNDS) {
      toast({ title: t("notEnoughQuestions"), variant: "destructive" });
      setCreating(false);
      return;
    }

    const { error } = await supabase.from("challenges").insert({
      challenger_id: user.id,
      opponent_id: selectedUser.user_id,
      challenge_type: type,
      level,
      status: "pending",
      questions,
      xp_reward: 50,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setCreating(false);
      return;
    }

    onCreated();
  };

  return (
    <div className="flex flex-col gap-4 flex-1">
      <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
        <Swords className="w-5 h-5 text-primary" />
        {t("newChallenge")}
      </h2>

      {/* Type selector */}
      <div>
        <label className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          {t("challengeType")}
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => setType("vocab")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-display font-medium transition-colors ${
              type === "vocab" ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            {t("vocabSublabel")}
          </button>
          <button
            onClick={() => setType("grammar")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-display font-medium transition-colors ${
              type === "grammar" ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground"
            }`}
          >
            <Brain className="w-4 h-4" />
            {t("grammarSublabel")}
          </button>
        </div>
      </div>

      {/* Level selector */}
      <div>
        <label className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          {t("levelLabel")}
        </label>
        <div className="flex gap-1.5">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`flex-1 py-2 rounded-lg text-xs font-display font-bold transition-colors ${
                level === l ? "bg-primary text-primary-foreground" : "glass-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Opponent selector */}
      <div className="flex-1 flex flex-col min-h-0">
        <label className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
          {t("selectOpponent")}
        </label>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchUsers")}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {loadingUsers ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t("noUsersFound")}</p>
          ) : (
            filtered.map((u) => {
              const name = u.display_name || "User";
              const initials = name.slice(0, 2).toUpperCase();
              const selected = selectedUser?.user_id === u.user_id;
              return (
                <button
                  key={u.user_id}
                  onClick={() => setSelectedUser(u)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    selected ? "bg-primary/10 border border-primary/20" : "glass-card hover:border-primary/10"
                  }`}
                >
                  <Avatar className="w-8 h-8">
                    {u.avatar_url ? <AvatarImage src={u.avatar_url} /> : null}
                    <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">{initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-display font-medium text-foreground">{name}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Create button */}
      <button
        onClick={handleCreate}
        disabled={!selectedUser || creating}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
        {creating ? t("loading") : t("sendChallenge")}
      </button>
    </div>
  );
};

export default CreateChallenge;
