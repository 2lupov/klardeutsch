import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Menu,
  Home,
  BookOpen,
  Gamepad2,
  MessageSquare,
  GraduationCap,
  Sparkles,
  LogIn,
  LogOut,
  User,
  ShoppingBag,
  Trophy,
  Settings,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUnreadDMs } from "@/hooks/useUnreadDMs";
import { useAuth } from "@/contexts/AuthContext";

const MobileBurgerMenu = () => {
  const { t, lang } = useLanguage();
  const location = useLocation();
  const unread = useUnreadDMs();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // Hide burger on chat page to avoid keyboard conflicts
  if (location.pathname === "/chat") return null;

  const items = user
    ? [
        { to: "/", icon: Home, label: t("navHome"), badge: 0 },
        { to: "/academy", icon: GraduationCap, label: lang === "uk" ? "Академія" : "Академия", badge: 0 },
        { to: "/assistant", icon: Sparkles, label: lang === "uk" ? "Асистент" : "Ассистент", badge: 0 },
        { to: "/games", icon: Gamepad2, label: lang === "uk" ? "Ігри" : "Игры", badge: 0 },
        { to: "/dictionary", icon: BookOpen, label: t("navDictionary"), badge: 0 },
        { to: "/chat", icon: MessageSquare, label: "Чат", badge: unread },
        { to: "/leaderboard", icon: Trophy, label: lang === "uk" ? "Рейтинг" : "Рейтинг", badge: 0 },
        { to: "/shop", icon: ShoppingBag, label: lang === "uk" ? "Магазин" : "Магазин", badge: 0 },
        { to: "/profile", icon: User, label: lang === "uk" ? "Профіль" : "Профиль", badge: 0 },
        { to: "/settings", icon: Settings, label: lang === "uk" ? "Налаштування" : "Настройки", badge: 0 },
      ]
    : [
        { to: "/", icon: Home, label: t("navHome"), badge: 0 },
        { to: "/dictionary", icon: BookOpen, label: t("navDictionary"), badge: 0 },
        { to: "/games", icon: Gamepad2, label: lang === "uk" ? "Ігри" : "Игры", badge: 0 },
        { to: "/auth", icon: LogIn, label: lang === "uk" ? "Увійти" : "Войти", badge: 0 },
      ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Menu"
          className="fixed top-3 left-3 z-50 w-11 h-11 rounded-full bg-card/90 backdrop-blur-xl border border-border flex items-center justify-center text-foreground shadow-md hover:bg-card transition"
        >
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
          <SheetTitle className="font-display text-2xl tracking-tight">KLAR</SheetTitle>
        </SheetHeader>
        <nav className="flex-1 overflow-y-auto py-2">
          {items.map((item) => {
            const active = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-5 py-3 text-sm font-display transition-colors ${
                  active
                    ? "bg-primary/10 text-primary border-l-2 border-primary"
                    : "text-foreground hover:bg-muted border-l-2 border-transparent"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="flex-1">{item.label}</span>
                {item.badge > 0 && (
                  <span className="bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
        {user && (
          <button
            onClick={async () => {
              setOpen(false);
              await signOut();
            }}
            className="flex items-center gap-3 px-5 py-4 text-sm font-display text-muted-foreground hover:text-destructive hover:bg-muted border-t border-border transition"
          >
            <LogOut className="w-5 h-5" />
            {lang === "uk" ? "Вийти" : "Выйти"}
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default MobileBurgerMenu;
