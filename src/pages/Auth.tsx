import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import DemoExperience from "@/components/DemoExperience";
import AuthKlarLogo from "@/components/auth/AuthKlarLogo";
import Fireworks from "@/components/auth/Fireworks";
import { Sparkles } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [referralCode, setReferralCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ref") ?? "";
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [demoMode, setDemoMode] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [showFireworks, setShowFireworks] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Calculate logo fill progress based on form completion
  const getProgress = () => {
    if (forgotMode) {
      return email.length >= 5 ? 1 : email.length / 5;
    }
    if (isLogin) {
      // 2 fields: email + password
      const emailPart = Math.min(email.length / 5, 1) * 0.5;
      const passPart = Math.min(password.length / 6, 1) * 0.5;
      return emailPart + passPart;
    }
    // Signup: 3 required fields (email, nickname, password) + optional referral
    const emailPart = Math.min(email.length / 5, 1) * 0.3;
    const nickPart = Math.min(nickname.length / 2, 1) * 0.25;
    const passPart = Math.min(password.length / 6, 1) * 0.35;
    const refPart = referralCode.length > 0 ? 0.1 : 0;
    return Math.min(emailPart + nickPart + passPart + refPart, 1);
  };

  useEffect(() => {
    if (user && !showFireworks) navigate("/");
  }, [user, navigate, showFireworks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (forgotMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) setError(error.message);
      else setMessage(t("resetPasswordSent"));
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      else {
        setShowFireworks(true);
      }
    } else {
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) {
        setError(error.message);
      } else {
        if (signUpData.user) {
          await supabase.from("profiles").update({ display_name: nickname }).eq("user_id", signUpData.user.id);
          if (referralCode.trim()) {
            await supabase.rpc("apply_referral_code", {
              p_referred_id: signUpData.user.id,
              p_code: referralCode.trim(),
            });
          }
        }
        setMessage(t("checkEmail"));
      }
    }
    setLoading(false);
  };

  // Demo mode
  if (demoMode) {
    return (
      <DemoExperience
        onBack={() => setDemoMode(false)}
        onSignup={() => { setDemoMode(false); setIsLogin(false); }}
      />
    );
  }


  const handleFireworksComplete = () => {
    setFadeOut(true);
    setTimeout(() => navigate("/"), 600);
  };

  return (
    <>
      {showFireworks && <Fireworks onComplete={handleFireworksComplete} />}
      <div
        className="h-[100dvh] bg-background flex items-center justify-center px-4 overflow-hidden transition-opacity duration-500"
        style={{ opacity: fadeOut ? 0 : 1 }}
      >
      <div className="w-full max-w-sm">
        <div className="text-center mb-5 animate-auth-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex justify-end mb-1">
            <LanguageSwitcher />
          </div>
          <AuthKlarLogo progress={getProgress()} />
          <p className="text-muted-foreground text-sm mt-1 animate-auth-fade-up" style={{ animationDelay: "0.7s" }}>
            {forgotMode ? t("resetPasswordTitle") : isLogin ? t("loginTitle") : t("signupTitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-5 flex flex-col gap-3 animate-auth-scale-in" style={{ animationDelay: "0.5s" }}>
          <input
            type="email"
            placeholder={t("email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
          />
          {!isLogin && !forgotMode && (
            <input
              type="text"
              placeholder={t("nickname") || "Никнейм"}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
            />
          )}
          {!isLogin && !forgotMode && (
            <input
              type="text"
              placeholder={t("referralCodePlaceholder") || "Код друга (необязательно)"}
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              maxLength={9}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors font-mono tracking-wider"
            />
          )}
          {!forgotMode && (
            <input
              type="password"
              placeholder={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
            />
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "..." : forgotMode ? t("sendResetLink") : isLogin ? t("login") : t("signup")}
          </button>

          {isLogin && !forgotMode && (
            <button
              type="button"
              onClick={() => { setForgotMode(true); setError(""); setMessage(""); }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {t("forgotPassword")}
            </button>
          )}

          <button
            type="button"
            onClick={() => { 
              if (forgotMode) {
                setForgotMode(false);
              } else {
                setIsLogin(!isLogin);
              }
              setError(""); 
              setMessage(""); 
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {forgotMode ? t("hasAccount") : isLogin ? t("noAccount") : t("hasAccount")}
          </button>
        </form>

        <button
          onClick={() => setDemoMode(true)}
          className="w-full mt-3 px-5 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary font-semibold text-sm transition-all hover:bg-primary/10 hover:border-primary/50 flex items-center justify-center gap-2 animate-auth-fade-up"
          style={{ animationDelay: "0.8s" }}
        >
          <Sparkles className="w-4 h-4" />
          {t("tryDemo")}
        </button>
      </div>
    </div>
    </>
  );
};

export default Auth;
