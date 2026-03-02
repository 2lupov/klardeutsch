import { NavLink, useLocation } from "react-router-dom";
import { Home, User, BookOpen } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

const MobileBottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const items = [
    { to: "/", icon: Home, label: t("navHome") },
    { to: "/dictionary", icon: BookOpen, label: t("navDictionary") },
    { to: "/profile", icon: User, label: t("myProfile") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const active = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-4 py-1.5 transition-colors ${
                active ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-display font-medium">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
