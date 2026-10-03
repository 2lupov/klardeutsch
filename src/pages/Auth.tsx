import { useState, useEffect, useRef } from "react";
import { toast } from "@/hooks/use-toast";
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

const TELEGRAM_BOT_ID = "8739617282";
const TELEGRAM_BOT_USERNAME = "klar_deutsch_bot";

/** Our own Ukrainian-labelled button that opens the Telegram login popup */
const TelegramLoginButton = () => {
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== "undefined" && !!(window as any).Telegram?.Login,
  );
  const canonicalTelegramDomain = "klar.academy";
  const host = window.location.hostname.replace(/^www\./, "");
  const isCanonicalHost = host === canonicalTelegramDomain;

  useEffect(() => {
    if (scriptReady) return;
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://oauth.telegram.org/js/telegram-login.js"]',
    );
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://oauth.telegram.org/js/telegram-login.js?6";
    script.async = true;
    script.onload = () => setScriptReady(true);
    document.body.appendChild(script);
  }, [scriptReady]);

  const handleClick = () => {
    // On non-canonical hosts (preview / secondary domains) Telegram rejects the
    // popup origin, so send the user to the canonical domain instead.
    if (!isCanonicalHost) {
      window.location.href = `https://${canonicalTelegramDomain}${window.location.pathname}${window.location.search}${window.location.hash}`;
      return;
    }
    const login = (window as any).Telegram?.Login;
    if (!login) {
      window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=login`, "_blank", "noopener");
      return;
    }
    login.auth(
      { client_id: Number(TELEGRAM_BOT_ID), scope: ["profile", "write"], lang: "uk" },
      (result: any) => {
        if (result?.id_token) (window as any).onTelegramAuth?.(result);
      },
    );
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
      style={{ backgroundColor: "#54a9eb", color: "#fff" }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
      Увійти через Telegram
    </button>
  );
};


const Auth = () => {
  const [isLogin, setIsLogin] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    return mode !== "signup" && mode !== "register";
  });
  const [studentMode, setStudentMode] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [referralCode, setReferralCode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("ref") ?? "";
  });
  const [referralValid, setReferralValid] = useState<boolean | null>(null);
  const [referralChecking, setReferralChecking] = useState(false);
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

  // Validate referral code with debounce
  useEffect(() => {
    if (!referralCode.trim() || referralCode.length < 6) {
      setReferralValid(null);
      return;
    }
    setReferralChecking(true);
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("referral_codes")
        .select("id")
        .eq("code", referralCode.toUpperCase())
        .maybeSingle();
      setReferralValid(!!data);
      setReferralChecking(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [referralCode]);
  const navigate = useNavigate();
  const logoRef = useRef<HTMLDivElement>(null);
  const { user, loading: authLoading } = useAuth();
  const { t, setLang } = useLanguage();
  useEffect(() => { setLang("uk"); }, [setLang]);
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

  // If user is already logged in, redirect (honour ?next=)
  useEffect(() => {
    if (user && !showFireworks) {
      const params = new URLSearchParams(window.location.search);
      const next = params.get("next");
      navigate(next && next.startsWith("/") ? next : "/");
    }
  }, [user, navigate, showFireworks]);

  // Telegram Login Widget callback
  useEffect(() => {
    (window as any).onTelegramAuth = async (tgUser: any) => {
      setTgWidgetLoading(true);
      setError("");
      try {
        await loginWithTelegramWidget({ id_token: String(tgUser.id_token) });
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
      if (studentMode) {
        const { data, error } = await supabase.functions.invoke("student-login", {
          body: { nickname, password },
        });
        if (error || !data?.access_token) {
          setError(data?.error || "Неверный никнейм или пароль");
          setFailedAttempts(prev => prev + 1);
          setCaptchaVerified(false);
        } else {
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });
          setShowFireworks(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(translateAuthError(error.message));
          setFailedAttempts(prev => prev + 1);
          setCaptchaVerified(false);
        }
        else {
          setShowFireworks(true);
        }
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
        if (referralCode.trim() && referralValid) {
          const { data: refApplied } = await supabase.rpc("apply_referral_code", {
            p_referred_id: signupUserId,
            p_code: referralCode.trim(),
          });
          if (refApplied) {
            toast({
              title: "🎉 Реферальный бонус активирован!",
              description: "Тебе и другу начислено по 50 монет + 20 XP",
            });
          }
        }
      }
      setShowFireworks(true);
    }
    setLoading(false);
  };

  const handleFireworksComplete = () => {
    setFadeOut(true);
    setTimeout(() => navigate("/"), 150);
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
          <div ref={logoRef} className={`pt-8 ${showFireworks ? "animate-klar-explode" : ""}`}>
            <AuthKlarLogo progress={showFireworks ? 1 : getProgress()} />
          </div>
          <p className="text-muted-foreground text-sm mt-1 animate-auth-fade-up" style={{ animationDelay: "0.7s" }}>
            {forgotMode ? t("resetPasswordTitle") : isLogin ? t("loginTitle") : t("signupTitle")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="glass-card p-5 flex flex-col gap-3 animate-auth-scale-in" style={{ animationDelay: "0.5s" }}>
          {isLogin && !forgotMode && (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">Хто ти?</span>
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary border border-border">
                <button
                  type="button"
                  onClick={() => { setStudentMode(false); setError(""); setMessage(""); }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    !studentMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Звичайний юзер
                </button>
                <button
                  type="button"
                  onClick={() => { setStudentMode(true); setError(""); setMessage(""); }}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    studentMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Учень
                </button>
              </div>
              {studentMode && (
                <p className="text-xs text-muted-foreground">
                  Вхід за нікнеймом і паролем, які видав викладач.
                </p>
              )}
            </div>
          )}
          {studentMode && isLogin && !forgotMode ? (

            <input
              type="text"
              placeholder="Никнейм ученика"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              maxLength={32}
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
            />
          ) : (
            <input
              type="email"
              placeholder={t("email")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
            />
          )}
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
            <div className="relative">
              <input
                type="text"
                placeholder={t("referralCodePlaceholder") || "Код друга (необязательно)"}
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                maxLength={9}
                className={`w-full px-4 py-3 pr-10 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border transition-colors font-mono tracking-wider focus:outline-none ${
                  referralValid === true ? "border-green-500 focus:border-green-500" :
                  referralValid === false ? "border-destructive focus:border-destructive" :
                  "border-border focus:border-primary"
                }`}
              />
              {referralCode.length >= 6 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-lg">
                  {referralChecking ? "⏳" : referralValid === true ? "✅" : referralValid === false ? "❌" : ""}
                </span>
              )}
            </div>
          )}
          {!forgotMode && (
            <input
              type="password"
              placeholder={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={studentMode && isLogin ? 1 : 6}
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

          {isLogin && !forgotMode && !studentMode && (
            <button
              type="button"
              onClick={() => { setForgotMode(true); setError(""); setMessage(""); }}
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              {t("forgotPassword")}
            </button>
          )}

          {!studentMode && (
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
          )}
        </form>

        {/* Social Login */}
        {!isTelegram && !studentMode && (

          <div className="mt-3 animate-auth-fade-up" style={{ animationDelay: "0.7s" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{t("orDivider")}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Google Login */}
            <button
              onClick={async () => {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: `${window.location.origin}/auth/callback`,
                });
                if (result.error) {
                  toast({ title: "Помилка входу через Google", description: String((result.error as any)?.message ?? result.error), variant: "destructive" });
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 mb-3"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Увійти через Google
            </button>

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

      </div>
    </div>
    </>
  );
};

export default Auth;
