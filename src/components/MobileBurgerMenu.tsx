import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Menu, Home, BookOpen, Gamepad2, GraduationCap, MessageSquare,
  Sparkles, Bug, Swords, ClipboardList, Star, Coins, Flame, LogOut,
} from "lucide-react";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadDMs } from "@/hooks/useUnreadDMs";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/hooks/useCoins";
import { useXP } from "@/hooks/useXP";
import { useDailyBonus } from "@/hooks/useDailyBonus";
import { useLevelProgress } from "@/hooks/useLevelProgress";
import { supabase } from "@/integrations/supabase/client";
import KlarLogo from "@/components/KlarLogo";
import TargetLanguageSwitcher from "@/components/TargetLanguageSwitcher";

interface SidebarLink {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

const MobileBurgerMenu = () => {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const unread = useUnreadDMs();
  const { user, signOut } = useAuth();
  const { balance } = useCoins();
  const { totalXP } = useXP();
  const { streak } = useDailyBonus();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<{ display_name?: string; avatar_url?: string } | null>(null);

  const a1 = useLevelProgress("A1");
  const a2 = useLevelProgress("A2");
  const b1 = useLevelProgress("B1");
  const b2 = useLevelProgress("B2");
  const c1 = useLevelProgress("C1");
  const totalProgress = Math.round((a1.progress + a2.progress + b1.progress + b2.progress + c1.progress) / 5);
  const allCompleted = a1.completed && a2.completed && b1.completed && b2.completed && c1.completed;

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  // Hide burger on chat page to avoid keyboard conflicts
  if (location.pathname === "/chat") return null;
  // Hide on guest landing
  if (!user && location.pathname === "/") return null;

  const learnLinks: SidebarLink[] = [
    { to: "/", icon: Home, label: t("navHome") },
    { to: "/academy", icon: GraduationCap, label: lang === "uk" ? "Академія" : "Академия" },
    { to: "/assistant", icon: Sparkles, label: lang === "uk" ? "Асистент" : "Ассистент" },
    { to: "/assignments", icon: ClipboardList, label: lang === "uk" ? "Завдання" : "Задания" },
    { to: "/dictionary", icon: BookOpen, label: t("navDictionary") },
    { to: "/games", icon: Gamepad2, label: lang === "uk" ? "Ігри" : "Игры" },
  ];

  const socialLinks: SidebarLink[] = [
    { to: "/chat", icon: MessageSquare, label: lang === "uk" ? "Чат" : "Чат", badge: unread },
    { to: "/challenges", icon: Swords, label: lang === "uk" ? "Дуелі" : "Дуэли" },
  ];

  const sectionLabel = (text: string) => (
    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-3 pt-5 pb-1.5">
      {text}
    </p>
  );

  const renderLink = (item: SidebarLink) => {
    const active = location.pathname === item.to ||
      (item.to !== "/" && location.pathname.startsWith(item.to));

    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={() => setOpen(false)}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-display text-sm font-medium transition-all duration-200 ${
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        {active && (
          <motion.div
            layoutId="mobile-sidebar-active"
            className="absolute left-0 inset-y-1.5 w-[3px] rounded-r-full bg-primary"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}

        <div className="relative shrink-0">
          <item.icon className={`w-[18px] h-[18px] transition-colors ${active ? "text-primary" : "group-hover:text-foreground"}`} />
          {(item.badge ?? 0) > 0 && (
            <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
              {(item.badge ?? 0) > 99 ? "99+" : item.badge}
            </span>
          )}
        </div>

        <span className="whitespace-nowrap">{item.label}</span>
      </NavLink>
    );
  };

  const displayName = profile?.display_name || "User";
  const avatarUrl = profile?.avatar_url;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Menu"
          className="lg:hidden fixed top-3 left-3 z-50 w-11 h-11 rounded-full bg-card/90 backdrop-blur-xl border border-border flex items-center justify-center text-foreground shadow-md hover:bg-card transition"
        >
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[260px] p-0 flex flex-col border-r border-border bg-card/95 backdrop-blur-2xl"
      >
        {/* Logo header — matches desktop */}
        <div className="flex items-center justify-between pl-16 pr-5 pt-5 pb-4 border-b border-border gap-2">
          <KlarLogo progress={totalProgress} completed={allCompleted} size="md" />
          <TargetLanguageSwitcher variant="compact" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 flex flex-col gap-0.5 overflow-y-auto mt-1">
          {sectionLabel(lang === "uk" ? "Навчання" : "Обучение")}
          {learnLinks.map(renderLink)}

          <div className="h-px bg-border mx-2 mt-2" />
          {sectionLabel(lang === "uk" ? "Спільнота" : "Сообщество")}
          {socialLinks.map(renderLink)}
        </nav>

        {/* Report error link */}
        <button
          onClick={() => {
            setOpen(false);
            const evt = new CustomEvent("open-report-error");
            window.dispatchEvent(evt);
          }}
          className="mx-2 mb-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm font-display font-medium"
        >
          <Bug className="w-[18px] h-[18px]" />
          <span>{lang === "uk" ? "Повідомити про помилку" : "Сообщить об ошибке"}</span>
        </button>

        {user ? (
          <>
            <NavLink
              to="/profile"
              onClick={() => setOpen(false)}
              className="mx-2 mb-1 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={displayName}
                      className="w-9 h-9 rounded-full object-cover border-2 border-primary/20"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-display font-bold text-foreground truncate">{displayName}</p>
                  <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-0.5">
                      <Star className="w-3 h-3 text-primary" /> {totalXP}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Coins className="w-3 h-3 text-yellow-500" /> {balance}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-orange-500" /> {streak}
                    </span>
                  </div>
                </div>
              </div>
            </NavLink>
            <button
              onClick={async () => {
                setOpen(false);
                await signOut();
              }}
              className="mx-2 mb-2 flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm font-display font-medium"
            >
              <LogOut className="w-[18px] h-[18px]" />
              <span>{lang === "uk" ? "Вийти" : "Выйти"}</span>
            </button>
          </>
        ) : (
          <NavLink
            to="/auth"
            onClick={() => setOpen(false)}
            className="mx-2 mb-2 p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition text-center font-display font-bold text-sm"
          >
            {lang === "uk" ? "Увійти / Реєстрація" : "Войти / Регистрация"}
          </NavLink>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MobileBurgerMenu;
