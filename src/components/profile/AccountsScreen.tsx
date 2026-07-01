import { useEffect, useRef, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { ArrowLeft, Link2, Mail, Send, Check, Unlink2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/hooks/use-toast";

interface Props {
  user: User;
  session: Session | null;
  profile: {
    telegram_chat_id: number | null;
    display_name: string | null;
  };
  onBack: () => void;
  onProfileChange: (patch: { telegram_chat_id?: number | null }) => void;
  lang: string;
  isMobile: boolean;
}

/** Telegram Login Widget that fires a callback instead of navigating */
function TelegramLinkWidget({ onAuth, disabled }: { onAuth: (u: any) => void; disabled?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const canonicalTelegramDomain = "klar.academy";
  const host = window.location.hostname.replace(/^www\./, "");
  const canUseWidget = host === canonicalTelegramDomain;
  const canonicalProfileUrl = `https://${canonicalTelegramDomain}/profile`;

  useEffect(() => {
    (window as any).onTelegramLinkAuth = (u: any) => onAuth(u);
  }, [onAuth]);

  useEffect(() => {
    if (!canUseWidget || !containerRef.current || containerRef.current.hasChildNodes()) return;
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", "klar_deutsch_bot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-onauth", "onTelegramLinkAuth(user)");
    script.setAttribute("data-request-access", "write");
    script.async = true;
    script.onload = () => setLoaded(true);
    containerRef.current.appendChild(script);
  }, [canUseWidget]);

  if (!canUseWidget) {
    return (
      <a
        href={canonicalProfileUrl}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#54a9eb", color: "#fff" }}
      >
        <Send className="w-4 h-4" />
        Відкрити на klar.academy
      </a>
    );
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <div ref={containerRef} />
      {!loaded && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
    </div>
  );
}

export default function AccountsScreen({ user, session, profile, onBack, onProfileChange, lang, isMobile }: Props) {
  const [busy, setBusy] = useState<null | "telegram" | "google">(null);
  const identities = (user as any).identities || [];
  const hasEmail = !!user.email && !user.email.endsWith("@telegram.klar.local");
  const hasGoogle = identities.some((i: any) => i.provider === "google");
  const hasTelegram = !!profile.telegram_chat_id;

  const linkGoogle = async () => {
    setBusy("google");
    try {
      // Supabase auth linkIdentity works even when a session exists
      const { error } = await (supabase.auth as any).linkIdentity({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/profile` },
      });
      if (error) throw error;
    } catch (e: any) {
      toast({ title: "Не вдалося прив'язати Google", description: e.message, variant: "destructive" });
      setBusy(null);
    }
  };

  const unlinkGoogle = async () => {
    setBusy("google");
    try {
      const googleIdentity = identities.find((i: any) => i.provider === "google");
      if (!googleIdentity) return;
      const { error } = await (supabase.auth as any).unlinkIdentity(googleIdentity);
      if (error) throw error;
      toast({ title: "Google відв'язано" });
      // reload user
      await supabase.auth.refreshSession();
    } catch (e: any) {
      toast({ title: "Не вдалося відв'язати Google", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const linkTelegram = async (tgUser: any) => {
    setBusy("telegram");
    try {
      // Build loginWidget payload (only non-empty fields — HMAC signed)
      const payload: Record<string, string> = {};
      for (const k of ["id", "first_name", "last_name", "username", "photo_url", "auth_date", "hash"]) {
        if (tgUser[k] !== undefined && tgUser[k] !== null && String(tgUser[k]).length > 0) {
          payload[k] = String(tgUser[k]);
        }
      }
      const { data, error } = await supabase.functions.invoke("link-telegram", {
        body: { loginWidget: payload },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
      onProfileChange({ telegram_chat_id: (data as any).telegram_chat_id });
      toast({ title: "Telegram прив'язано ✅" });
    } catch (e: any) {
      toast({ title: "Не вдалося прив'язати Telegram", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const unlinkTelegram = async () => {
    setBusy("telegram");
    try {
      const { data, error } = await supabase.functions.invoke("link-telegram", { body: { action: "unlink" } });
      if (error) throw new Error(error.message);
      onProfileChange({ telegram_chat_id: null });
      toast({ title: "Telegram відв'язано" });
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`w-full mx-auto px-4 py-4 h-full flex flex-col ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" />
        {lang === "uk" ? "Назад" : "Назад"}
      </button>

      <h2 className="font-display text-lg font-bold text-foreground mb-1 flex items-center gap-2">
        <Link2 className="w-5 h-5 text-primary" />
        {lang === "uk" ? "Прив'язані акаунти" : "Привязанные аккаунты"}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">
        {lang === "uk"
          ? "Підключіть Telegram і Google до одного профілю, щоб входити будь-яким способом без дублювання."
          : "Подключите Telegram и Google к одному профилю, чтобы входить любым способом без дублирования."}
      </p>

      <div className="space-y-3">
        {/* Email row */}
        <section className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Email</p>
              <p className="text-xs text-muted-foreground truncate">{user.email || "—"}</p>
            </div>
            {hasEmail && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                <Check className="w-3.5 h-3.5" /> {lang === "uk" ? "активний" : "активен"}
              </span>
            )}
          </div>
        </section>

        {/* Google row */}
        <section className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Google</p>
              <p className="text-xs text-muted-foreground">
                {hasGoogle
                  ? (lang === "uk" ? "Прив'язано" : "Привязано")
                  : (lang === "uk" ? "Не прив'язано" : "Не привязано")}
              </p>
            </div>
            {hasGoogle && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          {hasGoogle ? (
            <button
              disabled={busy === "google"}
              onClick={unlinkGoogle}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
            >
              {busy === "google" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink2 className="w-3.5 h-3.5" />}
              {lang === "uk" ? "Відв'язати Google" : "Отвязать Google"}
            </button>
          ) : (
            <button
              disabled={busy === "google"}
              onClick={linkGoogle}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {busy === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
              {lang === "uk" ? "Прив'язати Google" : "Привязать Google"}
            </button>
          )}
        </section>

        {/* Telegram row */}
        <section className="glass-card p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#2AABEE]/10 text-[#2AABEE] flex items-center justify-center">
              <Send className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Telegram</p>
              <p className="text-xs text-muted-foreground">
                {hasTelegram
                  ? (lang === "uk" ? `Прив'язано (ID: ${profile.telegram_chat_id})` : `Привязано (ID: ${profile.telegram_chat_id})`)
                  : (lang === "uk" ? "Не прив'язано" : "Не привязано")}
              </p>
            </div>
            {hasTelegram && (
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-500">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          {hasTelegram ? (
            <button
              disabled={busy === "telegram"}
              onClick={unlinkTelegram}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50"
            >
              {busy === "telegram" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink2 className="w-3.5 h-3.5" />}
              {lang === "uk" ? "Відв'язати Telegram" : "Отвязать Telegram"}
            </button>
          ) : (
            <div className="pt-1">
              <TelegramLinkWidget onAuth={linkTelegram} disabled={busy === "telegram"} />
            </div>
          )}
        </section>

        <p className="text-[11px] text-muted-foreground text-center leading-relaxed px-4">
          {lang === "uk"
            ? "Після прив'язки ви зможете входити в цей же акаунт і через Google, і через Telegram — прогрес, XP та монети зберігаються."
            : "После привязки вы сможете входить в этот же аккаунт и через Google, и через Telegram — прогресс, XP и монеты сохраняются."}
        </p>
      </div>
    </div>
  );
}
