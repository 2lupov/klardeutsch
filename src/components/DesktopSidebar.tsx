import { NavLink, useLocation } from "react-router-dom";
import { Home, User, LogOut, BookOpen, BarChart3, ShoppingBag, Swords, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import KlarLogo from "@/components/KlarLogo";
import { useLevelProgress } from "@/hooks/useLevelProgress";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const DesktopSidebar = () => {
  const { signOut } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const a1 = useLevelProgress("A1");
  const a2 = useLevelProgress("A2");
  const b1 = useLevelProgress("B1");
  const b2 = useLevelProgress("B2");
  const c1 = useLevelProgress("C1");
  const totalProgress = Math.round((a1.progress + a2.progress + b1.progress + b2.progress + c1.progress) / 5);
  const allCompleted = a1.completed && a2.completed && b1.completed && b2.completed && c1.completed;

  const links = [
    { to: "/", icon: Home, label: t("navHome") },
    { to: "/profile", icon: User, label: t("myProfile") },
    { to: "/stats", icon: BarChart3, label: t("navStats") },
    { to: "/dictionary", icon: BookOpen, label: t("navDictionary") },
    { to: "/shop", icon: ShoppingBag, label: t("navShop") },
    { to: "/challenges", icon: Swords, label: t("navChallenges") },
    { to: "/dialogues", icon: MessageCircle, label: t("navDialogues") },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-border bg-card/50 backdrop-blur-xl">
      {/* Logo */}
      <div className="p-6 flex flex-col items-center gap-2 border-b border-border">
        <KlarLogo progress={totalProgress} completed={allCompleted} />
        <p className="text-xs text-muted-foreground">{t("appSubtitle")}</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 flex flex-col gap-1">
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
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border space-y-1">
        <NavLink
          to="/method"
          className={`flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${
            location.pathname === "/method" ? "text-foreground" : ""
          }`}
        >
          О методе KLAR
        </NavLink>
        <NavLink
          to="/privacy"
          className={`flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${
            location.pathname === "/privacy" ? "text-foreground" : ""
          }`}
        >
          Конфиденциальность
        </NavLink>
        <NavLink
          to="/terms"
          className={`flex items-center gap-2 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors ${
            location.pathname === "/terms" ? "text-foreground" : ""
          }`}
        >
          Оферта
        </NavLink>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
        >
          <LogOut className="w-4 h-4" />
          {t("signOut")}
        </button>
      </div>
    </aside>
  );
};

export default DesktopSidebar;
