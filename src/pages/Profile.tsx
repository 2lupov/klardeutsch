import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { BookOpen, Brain, Flame, RotateCcw, TrendingUp, Calendar, LogOut, Camera, Pencil, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Achievements, { type AchievementStats } from "@/components/Achievements";

interface ProgressRow {
  level: string;
  category: string;
  exercise_id: string;
  score: number | null;
  completed: boolean | null;
  data: any;
  updated_at: string;
}

interface ProfileData {
  display_name: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { isMobile } = usePlatform();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [progress, setProgress] = useState<ProgressRow[]>([]);
  const [totalCards, setTotalCards] = useState(0);
  const [customWordsCount, setCustomWordsCount] = useState(0);
  const [savedWordsCount, setSavedWordsCount] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [profile, setProfile] = useState<ProfileData>({ display_name: null, avatar_url: null });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: prog }, { count }, { data: prof }, { count: customCount }, { count: savedCount }] = await Promise.all([
        supabase.from("user_progress").select("*").eq("user_id", user.id),
        supabase.from("vocab_cards").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).single(),
        supabase.from("custom_words").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("saved_words").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      setProgress(prog ?? []);
      setTotalCards(count ?? 0);
      setCustomWordsCount(customCount ?? 0);
      setSavedWordsCount(savedCount ?? 0);
      if (prof) setProfile({ display_name: prof.display_name, avatar_url: prof.avatar_url });
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

  const achievementStats: AchievementStats = useMemo(() => {
    const levels = ["A1", "A2", "B1", "B2"];
    const levelsCompleted = levels.filter((lvl) => {
      const cats = ["vocabulary", "grammar", "reading"];
      return cats.every((cat) => progress.some((p) => p.level === lvl && p.category === cat && p.completed));
    }).length;

    const grammarEntries = progress.filter((p) => p.category === "grammar" && p.score !== null);
    const grammarAvgScore = grammarEntries.length > 0
      ? grammarEntries.reduce((s, p) => s + (p.score ?? 0), 0) / grammarEntries.length
      : 0;

    const readingCompleted = progress.filter((p) => p.category === "reading" && p.completed).length;

    return {
      wordsLearned: savedWordsCount,
      lessonsCompleted: completedLessons,
      streak,
      levelsCompleted,
      grammarAvgScore,
      readingCompleted,
      customWordsAdded: customWordsCount,
      difficultWordsReviewed: 0,
    };
  }, [progress, savedWordsCount, customWordsCount, completedLessons, streak]);
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    // Remove old avatar if exists
    await supabase.storage.from("avatars").remove([path]);

    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;

    await supabase.from("profiles").update({ avatar_url }).eq("user_id", user.id);
    setProfile((p) => ({ ...p, avatar_url }));
    setUploading(false);
  };

  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = editName.trim();
    await supabase.from("profiles").update({ display_name: trimmed || null }).eq("user_id", user.id);
    setProfile((p) => ({ ...p, display_name: trimmed || null }));
    setEditing(false);
    toast({ title: t("profileSaved") });
  };

  const startEdit = () => {
    setEditName(profile.display_name ?? "");
    setEditing(true);
  };

  if (!user || fetching) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }

  const displayName = profile.display_name || user.email?.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

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
      {isMobile && (
        <button
          onClick={signOut}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t("signOut")}
        </button>
      )}

      {/* Profile header with avatar */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative group">
          <Avatar className="w-16 h-16 border-2 border-primary/20">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt={displayName} />
            ) : null}
            <AvatarFallback className="text-lg font-display font-bold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarUpload}
          />
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="flex-1 min-w-0 bg-muted/50 border border-border rounded-lg px-3 py-1.5 text-sm font-display font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t("nickname")}
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
              <button onClick={handleSaveName} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                <Check className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-foreground truncate">{displayName}</h1>
              <button onClick={startEdit} className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <StatCard icon={<BookOpen className="w-5 h-5" />} value={wordsLearned} label={t("wordsLearned")} />
        <StatCard icon={<Brain className="w-5 h-5" />} value={completedLessons} label={t("lessonsCompleted")} />
        <StatCard icon={<Flame className="w-5 h-5" />} value={streak} label={t("streakDays")} />
      </div>

      {/* Achievements */}
      <div className="mb-6">
        <Achievements stats={achievementStats} />
      </div>

      <div className={isMobile ? "space-y-5" : "grid grid-cols-2 gap-5"}>
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

        {recommendation && (
          <section className="glass-card p-5 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <h2 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {t("recommendationSection")}
            </h2>
            <p className="text-sm text-muted-foreground">{recommendationText(recommendation)}</p>
          </section>
        )}

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
