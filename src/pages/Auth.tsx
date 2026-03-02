import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Flashcard from "@/components/Flashcard";
import { Sparkles } from "lucide-react";
import type { VocabCard } from "@/data/lessons";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [demoMode, setDemoMode] = useState<"off" | "loading" | "playing" | "finished">("off");
  const [demoCards, setDemoCards] = useState<VocabCard[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const startDemo = async () => {
    setDemoMode("loading");
    const { data } = await supabase
      .from("vocab_cards")
      .select("*")
      .eq("level", "A1")
      .order("sort_order")
      .limit(5);
    const cards: VocabCard[] = (data ?? []).map((v) => ({
      id: v.id,
      german: v.german,
      russian: v.russian,
      example: v.example ?? undefined,
      article: v.article ?? undefined,
    }));
    setDemoCards(cards);
    setDemoMode(cards.length > 0 ? "playing" : "off");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else navigate("/");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else setMessage(t("checkEmail"));
    }
    setLoading(false);
  };

  if (demoMode === "loading") {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center overflow-hidden">
        <span className="text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }

  if (demoMode === "playing") {
    return (
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <div className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col overflow-y-auto overscroll-none">
          <button
            onClick={() => setDemoMode("off")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            {t("backToLogin")}
          </button>
          <Flashcard cards={demoCards} onComplete={() => setDemoMode("finished")} />
        </div>
      </div>
    );
  }

  if (demoMode === "finished") {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center px-4 overflow-hidden">
        <div className="w-full max-w-sm animate-slide-up text-center flex flex-col items-center gap-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary/10 glow-yellow">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-display font-bold">{t("demoFinished")}</h2>
          <button
            onClick={() => { setDemoMode("off"); setIsLogin(false); }}
            className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all hover:opacity-90"
          >
            {t("startLearning")}
          </button>
          <button
            onClick={() => setDemoMode("off")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t("backToLogin")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="flex justify-end mb-1">
            <LanguageSwitcher />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            <span className="text-gradient">KLAR</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? t("loginTitle") : t("signupTitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-5 flex flex-col gap-3">
          <input
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
          />
          <input
            type="password"
            placeholder={t("password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : isLogin ? t("login") : t("signup")}
          </button>

          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin ? t("noAccount") : t("hasAccount")}
          </button>
        </form>

        <button
          onClick={startDemo}
          className="w-full mt-3 px-5 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary font-semibold text-sm transition-all hover:bg-primary/10 hover:border-primary/50 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          {t("tryDemo")}
        </button>
      </div>
    </div>
  );
};

export default Auth;
