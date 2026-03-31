import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, User, BookOpen, BarChart3, Gamepad2, GraduationCap,
  MessageSquare, Flame, Coins, Star, ChevronLeft, ChevronRight,
  Swords
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import KlarLogo from "@/components/KlarLogo";
import { useLevelProgress } from "@/hooks/useLevelProgress";
import { useUnreadDMs } from "@/hooks/useUnreadDMs";
import { useCoins } from "@/hooks/useCoins";
import { useXP } from "@/hooks/useXP";
import { useDailyBonus } from "@/hooks/useDailyBonus";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SidebarLink {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

const DesktopSidebar = () => {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const { isTelegram } = usePlatform();
  const unread = useUnreadDMs();
  const { balance } = useCoins();
  const { totalXP } = useXP();
  const { streak } = useDailyBonus();
  const { user } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
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
      .then(({ data }) => {
        if (data) setProfile(data);
      });
  }, [user]);

  const learnLinks: SidebarLink[] = [
    { to: "/", icon: Home, label: t("navHome") },
    { to: "/academy", icon: GraduationCap, label: lang === "uk" ? "Академія" : "Академия" },
    { to: "/dictionary", icon: BookOpen, label: t("navDictionary") },
    { to: "/games", icon: Gamepad2, label: lang === "uk" ? "Ігри" : "Игры" },
  ];

  const socialLinks: SidebarLink[] = [
    { to: "/chat", icon: MessageSquare, label: lang === "uk" ? "Чат" : "Чат", badge: unread },
    { to: "/challenges", icon: Swords, label: lang === "uk" ? "Дуелі" : "Дуэли" },
  ];

  const profileLinks: SidebarLink[] = [
    { to: "/profile", icon: User, label: t("myProfile") },
    { to: "/stats", icon: BarChart3, label: t("navStats") },
  ];

  const sectionLabel = (text: string) => (
    <AnimatePresence>
      {!collapsed && (
        <motion.p
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider px-3 pt-4 pb-1"
        >
          {text}
        </motion.p>
      )}
    </AnimatePresence>
  );

  const renderLink = (item: SidebarLink) => {
    const active = location.pathname === item.to || 
      (item.to !== "/" && location.pathname.startsWith(item.to));

    const linkContent = (
      <NavLink
        key={item.to}
        to={item.to}
        className={`group relative flex items-center gap-3 rounded-xl font-display text-sm font-medium transition-all duration-200 ${
          collapsed ? "justify-center px-2 py-3" : "px-3 py-2.5"
        } ${
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        {/* Active indicator bar */}
        {active && (
          <motion.div
            layoutId="sidebar-indicator"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
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

        <AnimatePresence>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </NavLink>
    );

    if (collapsed) {
      return (
        <TooltipProvider key={item.to} delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
            <TooltipContent side="right" className="font-display text-xs">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return <div key={item.to}>{linkContent}</div>;
  };

  const displayName = profile?.display_name || "User";
  const avatarUrl = profile?.avatar_url;

  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : 256 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="hidden lg:flex flex-col h-screen sticky top-0 border-r border-border bg-card/60 backdrop-blur-2xl overflow-hidden z-20"
    >
      {/* Logo + Collapse toggle */}
      <div className={`relative flex items-center border-b border-border ${collapsed ? "justify-center py-4 px-2" : "p-5 gap-3"}`}>
        <div className={collapsed ? "scale-75" : ""}>
          <KlarLogo progress={totalProgress} completed={allCompleted} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col min-w-0"
            >
              <span className="text-sm font-display font-bold text-foreground">KLAR</span>
              <span className="text-[10px] text-muted-foreground truncate">{t("appSubtitle")}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute ${collapsed ? "-right-3" : "right-3"} top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-30`}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* User profile widget */}
      <NavLink
        to="/profile"
        className={`mx-2 mt-3 rounded-xl transition-colors hover:bg-muted/50 ${collapsed ? "p-2 flex justify-center" : "p-3"}`}
      >
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
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
            {/* Online dot */}
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-card" />
          </div>

          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="min-w-0 overflow-hidden"
              >
                <p className="text-sm font-display font-bold text-foreground truncate">{displayName}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </NavLink>

      {/* Navigation sections */}
      <nav className="flex-1 px-2 flex flex-col gap-0.5 overflow-y-auto mt-1">
        {/* Learning */}
        {!collapsed && <div className="h-px bg-border mx-2 mt-2" />}
        {sectionLabel(lang === "uk" ? "Навчання" : "Обучение")}
        {learnLinks.map(renderLink)}

        {/* Social */}
        {!collapsed && <div className="h-px bg-border mx-2 mt-2" />}
        {sectionLabel(lang === "uk" ? "Спільнота" : "Сообщество")}
        {socialLinks.map(renderLink)}

        {/* Profile & Stats */}
        {!collapsed && <div className="h-px bg-border mx-2 mt-2" />}
        {sectionLabel(lang === "uk" ? "Профіль" : "Профиль")}
        {profileLinks.map(renderLink)}
      </nav>

      {/* Footer — web only */}
      {!isTelegram && !collapsed && (
        <div className="p-3 border-t border-border space-y-0.5 flex-shrink-0">
          {[
            { to: "/method", label: lang === "uk" ? "Про метод KLAR" : "О методе KLAR" },
            { to: "/privacy", label: lang === "uk" ? "Конфіденційність" : "Конфиденциальность" },
            { to: "/terms", label: lang === "uk" ? "Оферта" : "Оферта" },
          ].map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={`block px-3 py-1 text-[10px] rounded-md transition-colors ${
                location.pathname === item.to
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </motion.aside>
  );
};

export default DesktopSidebar;
