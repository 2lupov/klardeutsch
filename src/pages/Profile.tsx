import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Brain, Flame, RotateCcw, TrendingUp, Calendar, LogOut } from "lucide-react";

interface ProgressRow {
  level: string;
  category: string;
  exercise_id: string;
  score: number | null;
  completed: boolean | null;
  data: any;
  updated_at: string;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { isMobile } = usePlatform();
  const navigate = useNavigate();
  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: prog }, { count }] = await Promise.all([
        supabase.from("user_progress").select("*").eq("user_id", user.id),
        supabase.from("vocab_cards").select("*", { count: "exact", head: true }),
      ]);
      setProgress(prog ?? []);
      setTotalCards(count ?? 0);
      setFetching(false);
    };
    load();
  }, [user]);

  const completedLessons = useMemo(() => progress.filter((p) => p.completed).length, [progress]);
  const wordsLearned = useMemo(() => progress.filter((p) => p.category === "vocabulary" && p.completed).length, [progress]);

  const streak = useMemo(() => {
    if (!progress.length) return 0;
    const days = new Set(progress.map((p) => new Date(p.updated_at).toISOString().slice(0, 10)));
    let count = 0;
    const d = new Date();
    while (days.has(d.toISOString().slice(0, 10))) {
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [progress]);

  const weakAreas = useMemo(() => {
    return progress
      .filter((p) => p.category === "grammar" && p.score !== null && p.score < 80)
      .map((r) => ({ level: r.level, score: r.score ?? 0 }));
  }, [progress]);

  const recommendation = useMemo(() => {
    if (!progress.length) return null;
    const grammar = progress.filter((p) => p.category === "grammar");
    const avgScore = grammar.length > 0 ? grammar.reduce((s, p) => s + (p.score ?? 0), 0) / grammar.length : 100;
    if (avgScore < 60) return "pullUpGrammar";
    const vocab = progress.filter((p) => p.category === "vocabulary" && p.completed);
    if (vocab.length * 5 < totalCards * 0.3) return "learnMoreWords";
    const reading = progress.filter((p) => p.category === "reading" && p.completed);
    if (reading.length === 0) return "tryReading";
    return "keepGoing";
  }, [progress, totalCards]);

  const recentActivity = useMemo(
    () => [...progress].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).slice(0, 10),
    [progress]
  );

  if (!user || fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }

  const categoryLabel = (cat: string) => {
    switch (cat) {
      case "vocabulary": return t("vocabSublabel");
      case "grammar": return t("grammarSublabel");
      case "reading": return t("readingSublabel");
      default: return cat;
    }
  };

  const recommendationText = (key: string | null) => {
    switch (key) {
      case "pullUpGrammar": return t("recGrammar");
      case "learnMoreWords": return t("recVocab");
      case "tryReading": return t("recReading");
      case "keepGoing": return t("recKeepGoing");
      default: return "";
    }
  };

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      {/* Mobile: sign out button */}
      {isMobile && (
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t("signOut")}
        </button>
      )}

      <h1 className="font-display text-2xl font-bold text-foreground mb-6">{t("profileTitle")}</h1>

      {/* Stat cards */}
      <div className={`grid gap-3 mb-8 ${isMobile ? "grid-cols-3" : "grid-cols-3"}`}>
        <StatCard icon={<BookOpen className="w-5 h-5" />} value={wordsLearned} label={t("wordsLearned")} />
        <StatCard icon={<Brain className="w-5 h-5" />} value={completedLessons} label={t("lessonsCompleted")} />
        <StatCard icon={<Flame className="w-5 h-5" />} value={streak} label={t("streakDays")} />
      </div>

      {/* Desktop: two-column layout for sections */}
      <div className={isMobile ? "space-y-5" : "grid grid-cols-2 gap-5"}>
        {/* Weak areas */}
        {weakAreas.length > 0 && (
          <section className="glass-card p-5 animate-slide-up">
            <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-destructive" />
              {t("mistakesSection")}
            </h2>
            <ul className="space-y-2">
              {weakAreas.map((w, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t("grammarSublabel")} · {w.level}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gradient font-display font-semibold">{w.score}%</span>
                    <button onClick={() => navigate("/")} className="text-xs text-primary hover:underline">{t("retry")}</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Recommendation */}
        {recommendation && (
          <section className="glass-card p-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t("recommendationSection")}
            </h2>
            <p className="text-sm text-muted-foreground">{recommendationText(recommendation)}</p>
          </section>
        )}

        {/* Activity history */}
        {recentActivity.length > 0 && (
          <section className={`glass-card p-5 animate-slide-up ${!isMobile ? "col-span-2" : ""}`} style={{ animationDelay: "0.2s" }}>
            <h2 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              {t("activityHistory")}
            </h2>
            <ul className="space-y-2">
              {recentActivity.map((a, i) => (
                <li key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{categoryLabel(a.category)} · {a.level}</span>
                  <span className="text-xs text-muted-foreground/60">{new Date(a.updated_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
};

const StatCard = ({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) => (
  <div className="glass-card p-4 flex flex-col items-center gap-1.5 text-center">
    <div className="text-muted-foreground">{icon}</div>
    <span className="text-2xl font-display font-bold text-gradient">{value}</span>
    <span className="text-[11px] text-muted-foreground leading-tight">{label}</span>
  </div>
);

export default Profile;
