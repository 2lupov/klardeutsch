import { NavLink, useLocation } from "react-router-dom";
import { Home, User, BookOpen, BarChart3, ShoppingBag, Gamepad2, MessageCircle, GraduationCap, MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import KlarLogo from "@/components/KlarLogo";
import { useLevelProgress } from "@/hooks/useLevelProgress";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useUnreadDMs } from "@/hooks/useUnreadDMs";

const DesktopSidebar = () => {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const { isTelegram } = usePlatform();
  const unread = useUnreadDMs();

  const a1 = useLevelProgress("A1");
  const a2 = useLevelProgress("A2");
  const b1 = useLevelProgress("B1");
  const b2 = useLevelProgress("B2");
  const c1 = useLevelProgress("C1");
  const totalProgress = Math.round((a1.progress + a2.progress + b1.progress + b2.progress + c1.progress) / 5);
  const allCompleted = a1.completed && a2.completed && b1.completed && b2.completed && c1.completed;

  const links = [
    { to: "/", icon: Home, label: t("navHome"), badge: 0 },
    { to: "/academy", icon: GraduationCap, label: lang === "uk" ? "Академія" : "Академия", badge: 0 },
    { to: "/profile", icon: User, label: t("myProfile"), badge: 0 },
    { to: "/stats", icon: BarChart3, label: t("navStats"), badge: 0 },
    { to: "/dictionary", icon: BookOpen, label: t("navDictionary"), badge: 0 },
    { to: "/shop", icon: ShoppingBag, label: t("navShop"), badge: 0 },
    { to: "/games", icon: Gamepad2, label: "Игры", badge: 0 },
    { to: "/chat", icon: MessageSquare, label: lang === "uk" ? "Чат" : "Чат", badge: unread },
    { to: "/dialogues", icon: MessageCircle, label: t("navDialogues"), badge: 0 },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 border-r border-border bg-card/50 backdrop-blur-xl overflow-hidden">
      {/* Logo */}
      <div className="p-6 flex flex-col items-center gap-2 border-b border-border">
        <KlarLogo progress={totalProgress} completed={allCompleted} />
        <p className="text-xs text-muted-foreground">{t("appSubtitle")}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto">
        {links.map((item) => {
          const active = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg font-display text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <div className="relative">
                <item.icon className="w-4 h-4" />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer — web only */}
      {!isTelegram && (
        <div className="p-4 border-t border-border space-y-1 flex-shrink-0">
          <NavLink
            to="/method"
            className={`flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${
              location.pathname === "/method" ? "text-foreground" : ""
            }`}
          >
          {lang === "uk" ? "Про метод KLAR" : "О методе KLAR"}
        </NavLink>
        <NavLink
            to="/privacy"
            className={`flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${
              location.pathname === "/privacy" ? "text-foreground" : ""
            }`}
          >
          {lang === "uk" ? "Конфіденційність" : "Конфиденциальность"}
        </NavLink>
        <NavLink
            to="/terms"
            className={`flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${
              location.pathname === "/terms" ? "text-foreground" : ""
            }`}
          >
          {lang === "uk" ? "Оферта" : "Оферта"}
          </NavLink>
        </div>
      )}
    </aside>
  );
};

export default DesktopSidebar;
