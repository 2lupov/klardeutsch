import { NavLink, useLocation } from "react-router-dom";
import { Home, User, BookOpen, Gamepad2, MessageSquare, GraduationCap, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadDMs } from "@/hooks/useUnreadDMs";

const MobileBottomNav = () => {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const unread = useUnreadDMs();

  // Hide bottom nav on chat page to avoid keyboard conflicts
  if (location.pathname === "/chat") return null;

  const items = [
    { to: "/", icon: Home, label: t("navHome"), badge: 0 },
    { to: "/academy", icon: GraduationCap, label: lang === "uk" ? "Академія" : "Академия", badge: 0 },
    { to: "/assistant", icon: Sparkles, label: lang === "uk" ? "Асистент" : "Ассистент", badge: 0 },
    { to: "/games", icon: Gamepad2, label: lang === "uk" ? "Ігри" : "Игры", badge: 0 },
    { to: "/chat", icon: MessageSquare, label: "Чат", badge: unread },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors relative ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-display font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
