import { useState, useEffect, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardList,
  BarChart3,
  Settings,
  Radio,
  FolderOpen,
  BookMarked,
  Layers,
  Lock,
  ChevronLeft,
  Moon,
  Sun,
} from "lucide-react";

import DashboardPage from "./pages/DashboardPage";
import CoursesSection from "./pages/CoursesSection";
import BooksSection from "./pages/BooksSection";
import AssignmentsSection from "./pages/AssignmentsSection";
import AnalyticsSection from "./pages/AnalyticsSection";
import ContentPage from "./pages/ContentPage";
import StudentsPage from "./pages/StudentsPage";
import LiveClassPage from "./pages/LiveClassPage";
import MaterialsPage from "./pages/MaterialsPage";
import SettingsPage from "./pages/SettingsPage";
import { AdminLangProvider, useAdminLang, ADMIN_LANGS } from "./LanguageContext";

type NavKey =
  | "dashboard"
  | "courses"
  | "books"
  | "live"
  | "assignments"
  | "students"
  | "materials"
  | "content"
  | "analytics"
  | "settings";

/** Old flat nav keys still dispatched from inner pages → new section keys. */
const LEGACY_KEYS: Record<string, NavKey> = {
  builder: "courses",
  studio: "assignments",
  book: "courses",
  standalone: "assignments",
  interactive: "books",
  tutor: "analytics",
};

const NAV: { key: NavKey; label: string; icon: any }[] = [
  { key: "dashboard", label: "Головна", icon: LayoutDashboard },
  { key: "courses", label: "Курси", icon: BookOpen },
  { key: "books", label: "Підручники", icon: BookMarked },
  { key: "live", label: "Живий клас", icon: Radio },
  { key: "assignments", label: "Завдання", icon: ClipboardList },
  { key: "students", label: "Учні", icon: Users },
  { key: "materials", label: "Банк матеріалів", icon: FolderOpen },
  { key: "content", label: "Контент", icon: Layers },
  { key: "analytics", label: "Аналітика", icon: BarChart3 },
  { key: "settings", label: "Налаштування", icon: Settings },
];

const ACTIVE_KEY = "klar-admin-section";

export default function AdminV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [active, setActive] = useState<NavKey>(
    () => (localStorage.getItem(ACTIVE_KEY) as NavKey) || "dashboard",
  );
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("klar-admin-theme") === "dark");

  useEffect(() => {
    localStorage.setItem("klar-admin-theme", dark ? "dark" : "light");
  }, [dark]);

  const go = (key: NavKey) => {
    setActive(key);
    localStorage.setItem(ACTIVE_KEY, key);
  };

  useEffect(() => {
    const h = (e: Event) => {
      const raw = (e as CustomEvent).detail?.key as string | undefined;
      if (!raw) return;
      const key = (NAV.some((n) => n.key === raw) ? raw : LEGACY_KEYS[raw]) as NavKey | undefined;
      if (key) go(key);
    };
    window.addEventListener("admin-v2:navigate", h);
    return () => window.removeEventListener("admin-v2:navigate", h);
  }, []);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    (async () => {
      const { data } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
    })();
  }, [user]);

  if (!user) {
    return (
      <GuardScreen
        icon={<Lock className="w-10 h-10 text-admin-fg" />}
        title="Потрібна авторизація"
        subtitle="Увійдіть з обліковим записом адміністратора"
        cta={{ label: "Увійти", onClick: () => navigate("/auth") }}
        dark={dark}
      />
    );
  }
  if (isAdmin === null) {
    return (
      <div className={`klar-admin ${dark ? "dark" : ""} h-[100dvh] flex items-center justify-center bg-admin-bg`}>
        <p className="text-admin-muted animate-pulse">Завантаження…</p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <GuardScreen
        icon={<Lock className="w-10 h-10 text-admin-danger" />}
        title="Доступ заборонено"
        subtitle="Потрібна роль адміністратора"
        cta={{ label: "На головну", onClick: () => navigate("/") }}
        dark={dark}
      />
    );
  }

  const activeItem = NAV.find((n) => n.key === active) ?? NAV[0];

  return (
    <div className={`klar-admin ${dark ? "dark" : ""} h-[100dvh] w-full flex overflow-hidden bg-admin-bg text-admin-fg`}>
      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-64"} shrink-0 h-full bg-admin-surface border-r border-admin-border flex flex-col transition-all duration-200`}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-admin-border">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-admin-accent text-admin-accent-fg font-bold shrink-0">
            K
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-admin-fg text-sm">KLAR Academy</span>
              <span className="text-[11px] text-admin-muted">Адмін-панель</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV.map(({ key, label, icon: Icon }) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                onClick={() => go(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-admin-primary text-admin-primary-fg shadow-sm"
                    : "text-admin-muted hover:bg-admin-fg/5 hover:text-admin-fg"
                }`}
                title={collapsed ? label : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-admin-border">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-admin-muted hover:bg-admin-fg/5"
          >
            <ChevronLeft
              className={`w-4 h-4 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`}
            />
            {!collapsed && <span>Згорнути</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 h-full flex flex-col overflow-hidden">
        <AdminLangProvider>
          <header className="h-16 shrink-0 border-b border-admin-border bg-admin-surface flex items-center justify-between px-6 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <activeItem.icon className="w-5 h-5 shrink-0 text-admin-muted" />
              <h1 className="text-lg font-semibold text-admin-fg truncate">{activeItem.label}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDark((d) => !d)}
                className="w-9 h-9 rounded-xl border border-admin-border flex items-center justify-center text-admin-muted hover:bg-admin-fg/5"
                title={dark ? "Світла тема" : "Темна тема"}
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <LangSelector />
              <span className="text-xs px-2.5 py-1 rounded-full font-medium hidden sm:inline bg-admin-accent/20 text-admin-fg">
                Admin
              </span>
              <Link
                to="/"
                className="text-sm text-admin-muted hover:text-admin-fg transition-colors hidden md:inline"
              >
                До додатку →
              </Link>
            </div>
          </header>

          <div id="admin-scroll" className="flex-1 overflow-y-auto p-6">
            <PageRouter active={active} />
          </div>
        </AdminLangProvider>
      </main>
    </div>
  );
}

function LangSelector() {
  const { lang, setLang, meta } = useAdminLang();
  return (
    <div className="relative">
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        className="appearance-none pl-9 pr-8 py-1.5 rounded-xl border border-admin-border bg-admin-surface text-sm font-medium text-admin-fg focus:outline-none focus:ring-2 focus:ring-admin-accent/40 cursor-pointer"
        title="Мова курсів"
      >
        {ADMIN_LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.flag} {l.label}
          </option>
        ))}
      </select>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base pointer-events-none">
        {meta.flag}
      </span>
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-admin-muted pointer-events-none text-xs">
        ▾
      </span>
    </div>
  );
}

function PageRouter({ active }: { active: NavKey }) {
  switch (active) {
    case "dashboard":
      return <DashboardPage />;
    case "courses":
      return <CoursesSection />;
    case "books":
      return <BooksSection />;
    case "live":
      return <LiveClassPage />;
    case "assignments":
      return <AssignmentsSection />;
    case "students":
      return <StudentsPage />;
    case "materials":
      return <MaterialsPage />;
    case "content":
      return <ContentPage />;
    case "analytics":
      return <AnalyticsSection />;
    case "settings":
      return <SettingsPage />;
  }
}

function GuardScreen({
  icon,
  title,
  subtitle,
  cta,
  dark,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  cta: { label: string; onClick: () => void };
  dark?: boolean;
}) {
  return (
    <div
      className={`klar-admin ${dark ? "dark" : ""} h-[100dvh] flex items-center justify-center px-4 bg-admin-bg`}
    >
      <div className="bg-admin-card rounded-2xl shadow-sm border border-admin-border p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-admin-fg/5 flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h1 className="text-xl font-semibold text-admin-fg">{title}</h1>
        <p className="text-sm text-admin-muted mt-1">{subtitle}</p>
        <button
          onClick={cta.onClick}
          className="mt-6 w-full py-2.5 rounded-xl bg-admin-primary text-admin-primary-fg font-medium text-sm"
        >
          {cta.label}
        </button>
      </div>
    </div>
  );
}
