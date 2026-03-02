import { NavLink, useLocation } from "react-router-dom";
import { Home, User, BookOpen, BarChart3, ShoppingBag } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import LofiRadio from "@/components/LofiRadio";

const MobileBottomNav = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const items = [
    { to: "/", icon: Home, label: t("navHome") },
    { to: "/profile", icon: User, label: t("myProfile") },
    { to: "/stats", icon: BarChart3, label: t("navStats") },
    { to: "/dictionary", icon: BookOpen, label: t("navDictionary") },
    { to: "/shop", icon: ShoppingBag, label: t("navShop") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/90 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center justify-around flex-1 h-14">
          {items.map((item) => {
            const active = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] font-display font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
      <div className="flex justify-center pb-1">
        <LofiRadio />
      </div>
    </nav>
  );
};

export default MobileBottomNav;
