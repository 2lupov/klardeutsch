import { useState } from "react";
import { useReferrals } from "@/hooks/useReferrals";
import { useLanguage } from "@/contexts/LanguageContext";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Copy, Check, Users, Gift, Target, Link2, Sparkles, Share2, MessageCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { QRCodeSVG } from "qrcode.react";

const CHALLENGE_INFO: Record<string, { emoji: string; ru: string; uk: string }> = {
  duels_together: { emoji: "⚔️", ru: "Сыграть 3 дуэли с другом", uk: "Зіграти 3 дуелі з другом" },
  words_together: { emoji: "📚", ru: "Выучить 50 слов вместе", uk: "Вивчити 50 слів разом" },
  level_together: { emoji: "🏆", ru: "Пройти 1 уровень за неделю", uk: "Пройти 1 рівень за тиждень" },
};

const REWARD_INFO: Record<string, { emoji: string; ru: string; uk: string }> = {
  living_german_7day: { emoji: "🎓", ru: "7-дневный курс «Живой немецкий»", uk: "7-денний курс «Живий німецький»" },
  premium_listening: { emoji: "🎧", ru: "Премиум-аудирование", uk: "Преміум-аудіювання" },
  exclusive_theme: { emoji: "💎", ru: "Эксклюзивная тема оформления", uk: "Ексклюзивна тема оформлення" },
};

const Referrals = () => {
  const { code, referrals, challenges, loading, activeCount, milestones } = useReferrals();
  const { lang } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const t = (ru: string, uk: string) => (lang === "uk" ? uk : ru);

  const referralLink = code ? `${window.location.origin}/auth?ref=${code}` : "";
  const shareText = t(
    `🇩🇪 Учи немецкий со мной в KLAR! Получи +50 монет по коду ${code}`,
    `🇩🇪 Вчи німецьку зі мною в KLAR! Отримай +50 монет за кодом ${code}`
  );

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: t("Код скопирован!", "Код скопійовано!") });
    setTimeout(() => setCopied(false), 2000);
  };

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    toast({ title: t("Ссылка скопирована!", "Посилання скопійовано!") });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "KLAR — учи немецкий",
          text: shareText,
          url: referralLink,
        });
      } catch {}
    } else {
      copyLink();
    }
  };

  const shareTelegram = () => {
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground text-sm">{t("Загрузка...", "Завантаження...")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Referral Code Card */}
      <section className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Link2 className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">{t("Твой реферальный код", "Твій реферальний код")}</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 font-mono text-lg font-bold text-center tracking-widest text-foreground">
            {code}
          </div>
          <button
            onClick={copyCode}
            className="p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 text-center">
          {t("Друг вводит этот код при регистрации — вы оба получаете награды", "Друг вводить цей код при реєстрації — ви обидва отримуєте нагороди")}
        </p>

        {/* Share buttons */}
        <div className="mt-3 pt-3 border-t border-border/20 flex gap-2">
          <button
            onClick={shareNative}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Share2 className="w-4 h-4" />
            {t("Поделиться", "Поділитися")}
          </button>
          <button
            onClick={shareTelegram}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#54a9eb] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <MessageCircle className="w-4 h-4" />
            Telegram
          </button>
        </div>

        {/* Unique link */}
        <div className="mt-3 pt-3 border-t border-border/20">
          <p className="text-[11px] text-muted-foreground mb-2">{t("Или скопируй ссылку:", "Або скопіюй посилання:")}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-lg bg-muted/40 border border-border/20 text-[11px] text-muted-foreground truncate font-mono">
              {referralLink}
            </div>
            <button
              onClick={copyLink}
              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
            >
              {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* QR Code */}
        <div className="mt-4 pt-4 border-t border-border/20 flex flex-col items-center gap-3">
          <p className="text-[11px] text-muted-foreground">{t("Покажи QR-код другу:", "Покажи QR-код другу:")}</p>
          <div className="p-4 rounded-2xl bg-white shadow-lg">
            <QRCodeSVG
              value={referralLink}
              size={180}
              level="M"
              bgColor="#ffffff"
              fgColor="#18181b"
            />
          </div>
          <p className="text-[10px] text-muted-foreground/60 text-center max-w-[200px]">
            {t("Друг сканирует — переходит на регистрацию с твоим бонусом", "Друг сканує — переходить на реєстрацію з твоїм бонусом")}
          </p>
        </div>
      </section>

      {/* Milestones */}
      <section className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">{t("Награды за рефералов", "Нагороди за рефералів")}</h3>
          <span className="ml-auto text-xs text-muted-foreground">{activeCount} {t("друзей", "друзів")}</span>
        </div>
        <div className="space-y-2">
          {milestones.map((m) => {
            const reached = activeCount >= m.count;
            return (
              <div
                key={m.count}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  reached ? "bg-primary/10 border border-primary/20" : "bg-muted/30 border border-transparent"
                }`}
              >
                <span className={`text-lg ${reached ? "" : "grayscale opacity-50"}`}>
                  {m.count <= 1 ? "👤" : m.count <= 3 ? "👥" : m.count <= 5 ? "🔗" : "🏆"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                    {m.count} {t("друзей", "друзів")}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{m.reward}</p>
                </div>
                {reached && <Sparkles className="w-4 h-4 text-primary" />}
              </div>
            );
          })}
        </div>
      </section>

      {/* Joint Challenges */}
      {challenges.length > 0 && (
        <section className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="font-display text-sm font-semibold">{t("Совместные челленджи", "Спільні челенджі")}</h3>
          </div>
          <div className="space-y-2">
            {challenges.map((ch) => {
              const info = CHALLENGE_INFO[ch.challenge_type];
              const reward = REWARD_INFO[ch.reward_value];
              const progress = Math.min(ch.current_value / ch.target_value, 1);
              return (
                <div key={ch.id} className="px-3 py-3 rounded-xl bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span>{info?.emoji ?? "🎯"}</span>
                    <span className="text-xs font-semibold text-foreground flex-1">
                      {info ? (lang === "uk" ? info.uk : info.ru) : ch.challenge_type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {ch.partner_name && `с ${ch.partner_name}`}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all ${ch.completed ? "bg-green-500" : "bg-primary"}`}
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {ch.current_value}/{ch.target_value}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {reward?.emoji} {reward ? (lang === "uk" ? reward.uk : reward.ru) : ch.reward_value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Friends List */}
      <section className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">
            {t("Приглашённые друзья", "Запрошені друзі")} ({referrals.length})
          </h3>
        </div>
        {referrals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {t("Пока никого — поделись кодом с друзьями!", "Поки нікого — поділись кодом з друзями!")}
          </p>
        ) : (
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-muted/20">
                <Avatar className="w-8 h-8">
                  {r.avatar_url && <AvatarImage src={r.avatar_url} />}
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {(r.display_name ?? "?").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.display_name ?? "—"}</p>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                    r.status === "active"
                      ? "bg-green-500/15 text-green-600"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.status === "active" ? "✅" : t("Ожидание", "Очікування")}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Referrals;
