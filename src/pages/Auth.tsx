import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import DemoExperience from "@/components/DemoExperience";
import AuthKlarLogo from "@/components/auth/AuthKlarLogo";
import Fireworks from "@/components/auth/Fireworks";
import { Sparkles } from "lucide-react";
import SimpleCaptcha from "@/components/auth/SimpleCaptcha";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
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
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [signupUserId, setSignupUserId] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();
  const logoRef = useRef<HTMLDivElement>(null);
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

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResendCode = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) setError(error.message);
    else {
      setMessage(t("codeSentAgain") || "Код отправлен повторно");
      setResendCooldown(5);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");

    if (failedAttempts >= 3 && !captchaVerified) {
      setError("Решите капчу для продолжения");
      return;
    }

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
      if (error) {
        setError(error.message);
        setFailedAttempts(prev => prev + 1);
        setCaptchaVerified(false);
      }
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
        setFailedAttempts(prev => prev + 1);
        setCaptchaVerified(false);
      } else {
        // Detect already-registered user (Supabase returns empty identities)
        if (signUpData.user && (!signUpData.user.identities || signUpData.user.identities.length === 0)) {
          setError("Аккаунт с этим email уже существует. Попробуйте войти.");
        } else if (signUpData.user) {
          // Save user info for OTP step
          setSignupUserId(signUpData.user.id);
          // Switch to OTP entry screen
          setOtpMode(true);
          setError("");
        }
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


  const handleVerifyOtp = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otpCode,
      type: "signup",
    });
    if (error) {
      setError(error.message);
    } else {
      // Profile update + referral after confirmed
      if (signupUserId) {
        await supabase.from("profiles").update({ display_name: nickname }).eq("user_id", signupUserId);
        if (referralCode.trim()) {
          await supabase.rpc("apply_referral_code", {
            p_referred_id: signupUserId,
            p_code: referralCode.trim(),
          });
        }
      }
      setShowFireworks(true);
    }
    setLoading(false);
  };

  const handleFireworksComplete = () => {
    setFadeOut(true);
    setTimeout(() => navigate("/"), 600);
  };

  // OTP verification screen
  if (otpMode) {
    return (
      <>
        {showFireworks && <Fireworks onComplete={handleFireworksComplete} originRef={logoRef} />}
        <div
          className="h-[100dvh] bg-background flex items-center justify-center px-4 overflow-hidden transition-opacity duration-500"
          style={{ opacity: fadeOut ? 0 : 1 }}
        >
          <div className="w-full max-w-sm">
            <div className="text-center mb-5 animate-auth-fade-up" style={{ animationDelay: "0.1s" }}>
              <div ref={logoRef}>
                <AuthKlarLogo progress={otpCode.length / 6} />
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                {t("enterOtpCode") || "Введите код из письма"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{email}</p>
            </div>

            <div className="glass-card p-5 flex flex-col items-center gap-4 animate-auth-scale-in" style={{ animationDelay: "0.3s" }}>
              <InputOTP
                maxLength={6}
                value={otpCode}
                onChange={setOtpCode}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-success">{message}</p>}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length < 6}
                className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "..." : t("confirm")}
              </button>

              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || resendCooldown > 0}
                className="text-sm text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
              >
                {resendCooldown > 0
                  ? `${t("resendCode")} (${resendCooldown}с)`
                  : t("resendCode")}
              </button>

              <button
                type="button"
                onClick={() => { setOtpMode(false); setOtpCode(""); setError(""); setMessage(""); }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← {t("back")}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {showFireworks && <Fireworks onComplete={handleFireworksComplete} originRef={logoRef} />}
      <div
        className="h-[100dvh] bg-background flex items-center justify-center px-4 overflow-hidden transition-opacity duration-500"
        style={{ opacity: fadeOut ? 0 : 1 }}
      >
      <div className="w-full max-w-sm">
        <div className="text-center mb-5 animate-auth-fade-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex justify-end mb-1">
            <LanguageSwitcher />
          </div>
          <div ref={logoRef}>
            <AuthKlarLogo progress={getProgress()} />
          </div>
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

          {failedAttempts >= 3 && (
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">🔒 Подтвердите, что вы не робот</span>
              <SimpleCaptcha onVerified={setCaptchaVerified} />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}

          <button
            type="submit"
            disabled={loading || (failedAttempts >= 3 && !captchaVerified)}
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
