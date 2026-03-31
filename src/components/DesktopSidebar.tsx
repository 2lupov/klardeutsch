import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home, BookOpen, Gamepad2, GraduationCap,
  MessageSquare, Flame, Coins, Star,
  Swords, Menu, X
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

interface SidebarLink {
  to: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
}

const SIDEBAR_W = 260;

const DesktopSidebar = () => {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const { isTelegram } = usePlatform();
  const unread = useUnreadDMs();
  const { balance } = useCoins();
  const { totalXP } = useXP();
  const { streak } = useDailyBonus();
  const { user } = useAuth();
  const [open, setOpen] = useState(true);
  const [hasClicked, setHasClicked] = useState(false);
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
        onClick={() => {}} // keep sidebar open on desktop
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl font-display text-sm font-medium transition-all duration-200 ${
          active
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
        }`}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
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

        <span className="whitespace-nowrap">{item.label}</span>
      </NavLink>
    );
  };

  const displayName = profile?.display_name || "User";
  const avatarUrl = profile?.avatar_url;

  return (
    <>
      {/* Toggle button — always visible top-left */}
      <button
        onClick={() => { if (!hasClicked) setHasClicked(true); setOpen(!open); }}
        className={`hidden lg:flex fixed top-4 left-4 z-50 w-9 h-9 rounded-xl bg-card/80 backdrop-blur-lg border border-border items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-300 ${
          !open && !hasClicked ? "animate-pulse-glow" : ""
        }`}
      >
        {open ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Overlay when sidebar is open */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setOpen(false)}
            className="hidden lg:block fixed inset-0 bg-background/30 backdrop-blur-sm z-30"
          />
        )}
      </AnimatePresence>

      {/* Sidebar drawer */}
      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ x: -SIDEBAR_W }}
            animate={{ x: 0 }}
            exit={{ x: -SIDEBAR_W }}
            transition={{ type: "spring", stiffness: 350, damping: 35 }}
            className="hidden lg:flex fixed left-0 top-0 bottom-0 flex-col z-40 border-r border-border bg-card/95 backdrop-blur-2xl overflow-hidden"
            style={{ width: SIDEBAR_W }}
          >
            {/* Logo header */}
            <div className="flex items-center justify-center px-5 pt-5 pb-4 border-b border-border">
              <KlarLogo progress={totalProgress} completed={allCompleted} size="md" />
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 flex flex-col gap-0.5 overflow-y-auto mt-1">
              {sectionLabel(lang === "uk" ? "Навчання" : "Обучение")}
              {learnLinks.map(renderLink)}

              <div className="h-px bg-border mx-2 mt-2" />
              {sectionLabel(lang === "uk" ? "Спільнота" : "Сообщество")}
              {socialLinks.map(renderLink)}
            </nav>

            {/* Footer links — web only */}
            {!isTelegram && (
              <div className="px-3 py-2 border-t border-border space-y-0.5 flex-shrink-0">
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

            {/* Profile widget at bottom */}
            <NavLink
              to="/profile"
              className="mx-2 mb-2 p-3 rounded-xl border border-border bg-muted/30 hover:bg-muted/60 transition-colors"
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
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default DesktopSidebar;
