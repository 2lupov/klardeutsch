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
import { getNicknameAuthError, getSignupPasswordError, PASSWORD_RULES } from "@/lib/nickname-auth";

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
  const [nickname, setNickname] = useState(() => {
    try { return localStorage.getItem("klar_last_login") ?? ""; } catch { return ""; }
  });
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
      const emailPart = Math.min(nickname.length / 3, 1) * 0.5;
      const passPart = Math.min(password.length / 6, 1) * 0.5;
      return emailPart + passPart;
    }
    const emailPart = email.length > 0 ? Math.min(email.length / 5, 1) * 0.1 : 0.1;
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

  // In TMA, show loading while auto-auth is in progress
  if (isTelegram && authLoading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <span className="text-muted-foreground animate-pulse font-display text-lg">KLAR</span>
      </div>
    );
  }

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
      const id = email.trim().toLowerCase();
      if (id.includes("@")) {
        const { error } = await supabase.auth.resetPasswordForEmail(id, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) setError(translateAuthError(error.message));
        else setMessage(t("resetPasswordSent"));
      } else if (!/^[a-z0-9_]{3,24}$/.test(id)) {
        setError("Введіть нікнейм або email");
      } else {
        const { data } = await supabase.functions.invoke("nickname-auth", {
          body: { action: "request-reset", nickname: id, origin: window.location.origin },
        });
        setMessage(data?.message || "Якщо акаунт має прив'язаний Telegram, ми надіслали туди посилання.");
      }
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
        const validationError = getNicknameAuthError({ nickname, password });
        if (validationError) {
          setError(validationError);
          setFailedAttempts(prev => prev + 1);
          setCaptchaVerified(false);
        } else {
          const { data, error } = await supabase.functions.invoke("nickname-auth", {
            body: { action: "login", nickname: nickname.trim().toLowerCase(), password },
          });
          if (error || !data?.access_token) {
            setError(data?.error || "Неправильний нікнейм або пароль");
            setFailedAttempts(prev => prev + 1);
            setCaptchaVerified(false);
          } else {
            await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
            try { localStorage.setItem("klar_last_login", nickname.trim().toLowerCase()); } catch { /* ignore */ }
            setShowFireworks(true);
          }
        }
      }
    } else {
      const validationError = getNicknameAuthError({ nickname, password, email }) || getSignupPasswordError(password);
      if (validationError) {
        setError(validationError);
        setFailedAttempts(prev => prev + 1);
        setCaptchaVerified(false);
      } else {
        const { data, error } = await supabase.functions.invoke("nickname-auth", {
          body: {
            action: "register",
            nickname: nickname.trim().toLowerCase(),
            password,
            email: email.trim().toLowerCase(),
          },
        });
        if (error || !data?.access_token || !data?.user_id) {
          let serverMsg: string | undefined = data?.error;
          try { serverMsg = serverMsg || (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
          setError(serverMsg || "Не вдалося створити акаунт");
          setFailedAttempts(prev => prev + 1);
          setCaptchaVerified(false);
        } else {
          await supabase.auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
          if (referralCode.trim() && referralValid) {
            const { data: refApplied } = await supabase.rpc("apply_referral_code", {
              p_referred_id: data.user_id,
              p_code: referralCode.trim(),
            });
            if (refApplied) {
              toast({
                title: "🎉 Реферальний бонус активовано!",
                description: "Тобі й другу нараховано по 50 монет + 20 XP",
              });
            }
          }
          setShowFireworks(true);
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


  const handleFireworksComplete = () => {
    setFadeOut(true);
    setTimeout(() => navigate("/"), 150);
  };

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
          {!forgotMode ? (
            <input
              type="text"
              name="username"
              id="username"
              autoComplete="username"
              placeholder={studentMode ? "Нікнейм учня" : isLogin ? "Нікнейм або email" : "Нікнейм"}
              value={nickname}
              onChange={(e) => setNickname(e.target.value.toLowerCase().replace(/\s/g, ""))}
              required
              minLength={3}
              maxLength={isLogin && !studentMode ? 255 : 24}
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
            />
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Нікнейм або email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
              />
              <p className="text-xs text-muted-foreground">
                За нікнеймом посилання прийде в Telegram від @klar_deutsch_bot (якщо Telegram прив'язаний). Також можна просто увійти через Telegram.
              </p>
            </div>
          )}
          {!isLogin && !forgotMode && (
            <input
              type="email"
              placeholder="Email для відновлення (необов’язково)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              maxLength={255}
              autoCapitalize="none"
              autoCorrect="off"
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
              name="password"
              autoComplete={isLogin ? "current-password" : "new-password"}
              placeholder={t("password")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={studentMode && isLogin ? 1 : 6}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
            />
          )}
          {!forgotMode && !isLogin && (
            <p className="text-xs text-muted-foreground -mt-1 px-1">{PASSWORD_RULES}</p>
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
