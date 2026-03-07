import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { loginWithTelegramWidget } from "@/hooks/useTelegramAuth";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import DemoExperience from "@/components/DemoExperience";
import AuthKlarLogo from "@/components/auth/AuthKlarLogo";
import Fireworks from "@/components/auth/Fireworks";
import { Sparkles } from "lucide-react";
import SimpleCaptcha from "@/components/auth/SimpleCaptcha";
import { lovable } from "@/integrations/lovable/index";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

/** Translate common Supabase Auth error messages to Russian */
function translateAuthError(msg: string): string {
  const map: Record<string, string> = {
    "Invalid login credentials": "Неверный email или пароль",
    "Email not confirmed": "Email не подтверждён. Проверьте почту",
    "User already registered": "Пользователь уже зарегистрирован",
    "Password should be at least 6 characters": "Пароль должен быть не менее 6 символов",
    "For security purposes, you can only request this once every 60 seconds": "Подождите 60 секунд перед повторной попыткой",
    "Unable to validate email address: invalid format": "Неверный формат email",
    "Signup requires a valid password": "Введите пароль",
    "Token has expired or is invalid": "Код истёк или неверен",
    "User not found": "Пользователь не найден",
    "Invalid Refresh Token: Refresh Token Not Found": "Сессия истекла, войдите заново",
    "New password should be different from the old password.": "Новый пароль должен отличаться от старого",
    "Auth session missing!": "Сессия не найдена",
    "Invalid login widget data": "Ошибка входа через Telegram. Попробуйте снова",
    "Auth failed": "Ошибка авторизации",
  };
  for (const [en, ru] of Object.entries(map)) {
    if (msg.includes(en)) return ru;
  }
  return msg;
}

/** Injects the official Telegram Login Widget script */
const TelegramLoginButton = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current || containerRef.current.hasChildNodes()) return;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", "klar_deutsch_bot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    script.onload = () => setWidgetLoaded(true);
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} className="flex justify-center" />
      {!widgetLoaded && (
        <a
          href="https://t.me/klar_deutsch_bot?start=login"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
          style={{ backgroundColor: "#54a9eb", color: "#fff" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
          Войти через Telegram
        </a>
      )}
    </div>
  );
};

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
  const [tgWidgetLoading, setTgWidgetLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const logoRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();
  const { t } = useLanguage();
  const { isTelegram } = usePlatform();

  // Calculate logo fill progress based on form completion
  const getProgress = () => {
    if (forgotMode) {
      return email.length >= 5 ? 1 : email.length / 5;
    }
    if (isLogin) {
      const emailPart = Math.min(email.length / 5, 1) * 0.5;
      const passPart = Math.min(password.length / 6, 1) * 0.5;
      return emailPart + passPart;
    }
    const emailPart = Math.min(email.length / 5, 1) * 0.3;
    const nickPart = Math.min(nickname.length / 2, 1) * 0.25;
    const passPart = Math.min(password.length / 6, 1) * 0.35;
    const refPart = referralCode.length > 0 ? 0.1 : 0;
    return Math.min(emailPart + nickPart + passPart + refPart, 1);
  };

  // If user is already logged in, redirect
  useEffect(() => {
    if (user && !showFireworks) navigate("/");
  }, [user, navigate, showFireworks]);

  // Telegram Login Widget callback
  useEffect(() => {
    (window as any).onTelegramAuth = async (tgUser: any) => {
      setTgWidgetLoading(true);
      setError("");
      try {
        // Only include fields that Telegram actually sent (non-empty)
        // Adding empty fields breaks the HMAC signature
        const widgetData: Record<string, string> = {
          id: String(tgUser.id),
          auth_date: String(tgUser.auth_date),
          hash: tgUser.hash,
        };
        if (tgUser.first_name) widgetData.first_name = tgUser.first_name;
        if (tgUser.last_name) widgetData.last_name = tgUser.last_name;
        if (tgUser.username) widgetData.username = tgUser.username;
        if (tgUser.photo_url) widgetData.photo_url = tgUser.photo_url;

        await loginWithTelegramWidget(widgetData);
        setShowFireworks(true);
      } catch (err: any) {
        setError(translateAuthError(err.message));
      } finally {
        setTgWidgetLoading(false);
      }
    };

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // In TMA, show loading while auto-auth is in progress
  if (isTelegram && authLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <span className="text-muted-foreground animate-pulse font-display text-lg">KLAR</span>
      </div>
    );
  }

  const handleResendCode = async () => {
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email });
    if (error) setError(translateAuthError(error.message));
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
      if (error) setError(translateAuthError(error.message));
      else setMessage(t("resetPasswordSent"));
      setLoading(false);
      return;
    }

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(translateAuthError(error.message));
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
        setError(translateAuthError(error.message));
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
      setError(translateAuthError(error.message));
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
                <AuthKlarLogo progress={otpCode.length / 8} />
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                {t("enterOtpCode") || "Введите код из письма"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{email}</p>
            </div>

            <div className="glass-card p-5 flex flex-col items-center gap-4 animate-auth-scale-in" style={{ animationDelay: "0.3s" }}>
              <InputOTP
                maxLength={8}
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
                  <InputOTPSlot index={6} />
                  <InputOTPSlot index={7} />
                </InputOTPGroup>
              </InputOTP>

              {error && <p className="text-sm text-destructive">{error}</p>}
              {message && <p className="text-sm text-success">{message}</p>}

              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading || otpCode.length < 8}
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
          <div ref={logoRef} className={showFireworks ? "animate-klar-explode" : ""}>
            <AuthKlarLogo progress={showFireworks ? 1 : getProgress()} />
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

        {/* Social Login */}
        {!isTelegram && (
          <div className="mt-3 animate-auth-fade-up" style={{ animationDelay: "0.7s" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{t("orDivider")}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Telegram Login */}
            {tgWidgetLoading ? (
              <p className="text-sm text-center text-muted-foreground animate-pulse">
                {t("telegramAuthLoading")}
              </p>
            ) : (
              <TelegramLoginButton />
            )}
            {error && tgWidgetLoading && <p className="text-sm text-destructive text-center mt-1">{error}</p>}
          </div>
        )}

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
