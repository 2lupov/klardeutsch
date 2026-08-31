import { useState, useEffect, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Dumbbell,
  Camera,

  Users,
  ClipboardList,
  FileCheck2,
  MessageSquare,
  BarChart3,
  Settings,
  Radio,
  FolderOpen,
  Lock,
  ChevronLeft,
  ExternalLink,
  Moon,
  Sun,
} from "lucide-react";


import DashboardPage from "./pages/DashboardPage";
import CoursesPage from "./pages/CoursesPage";
import CourseBuilderPage from "./pages/CourseBuilderPage";
import ExerciseStudioPage from "./pages/ExerciseStudioPage";
import BookCoursePage from "./pages/BookCoursePage";
import StudentsPage from "./pages/StudentsPage";
import AssignmentsPage from "./pages/AssignmentsPage";
import StandaloneAssignmentsPage from "./pages/StandaloneAssignmentsPage";
import LiveClassPage from "./pages/LiveClassPage";
import MaterialsPage from "./pages/MaterialsPage";
import TutorLogsPage from "./pages/TutorLogsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import { AdminLangProvider, useAdminLang, ADMIN_LANGS } from "./LanguageContext";

type NavKey =
  | "dashboard"
  | "courses"
  | "builder"
  | "studio"
  | "book"
  | "students"
  | "assignments"
  | "standalone"
  | "materials"
  | "live"
  | "tutor"
  | "analytics"
  | "settings";

const NAV: { key: NavKey; label: string; icon: any }[] = [
  { key: "dashboard", label: "Головна", icon: LayoutDashboard },
  { key: "courses", label: "Курси", icon: BookOpen },
  { key: "builder", label: "AI-конструктор курсів", icon: Sparkles },
  { key: "studio", label: "Студія завдань", icon: Dumbbell },
  { key: "book", label: "Курс із книги (фото)", icon: Camera },

  { key: "materials", label: "Банк матеріалів", icon: FolderOpen },
  { key: "live", label: "Живий клас", icon: Radio },
  { key: "students", label: "Учні", icon: Users },
  { key: "assignments", label: "Завдання учнів", icon: ClipboardList },
  { key: "standalone", label: "Індивідуальні завдання", icon: FileCheck2 },
  { key: "tutor", label: "Логи AI-репетитора", icon: MessageSquare },
  { key: "analytics", label: "Аналітика", icon: BarChart3 },
  { key: "settings", label: "Налаштування", icon: Settings },
];

export default function AdminV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [active, setActive] = useState<NavKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("klar-admin-theme") === "dark");

  useEffect(() => {
    localStorage.setItem("klar-admin-theme", dark ? "dark" : "light");
  }, [dark]);


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
        icon={<Lock className="w-10 h-10" style={{ color: "#4F46E5" }} />}
        title="Потрібна авторизація"
        subtitle="Увійдіть з обліковим записом адміністратора"
        cta={{ label: "Увійти", onClick: () => navigate("/auth") }}
      />
    );
  }
  if (isAdmin === null) {
    return (
      <div className="h-[100dvh] flex items-center justify-center" style={{ background: "#F8FAFC" }}>
        <p className="text-slate-500 animate-pulse font-sans">Завантаження…</p>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <GuardScreen
        icon={<Lock className="w-10 h-10 text-red-500" />}
        title="Доступ заборонено"
        subtitle="Потрібна роль адміністратора"
        cta={{ label: "На головну", onClick: () => navigate("/") }}
      />
    );
  }

  const activeItem = NAV.find((n) => n.key === active)!;

  return (
    <div
      className={`h-[100dvh] w-full flex overflow-hidden ${dark ? "admin-dark" : ""}`}
      style={{ background: dark ? "#0B1120" : "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}
    >

      {/* Sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-64"} shrink-0 h-full bg-white border-r border-slate-200 flex flex-col transition-all duration-200`}
      >
        <div className="h-16 flex items-center gap-2 px-4 border-b border-slate-100">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
            style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}
          >
            K
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-slate-900 text-sm">KLAR Academy</span>
              <span className="text-[11px] text-slate-500">Адмін-панель</span>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
          {NAV.map(({ key, label, icon: Icon }) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                onClick={() => setActive(key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                style={isActive ? { background: "#4F46E5" } : undefined}
                title={collapsed ? label : undefined}
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="p-2 border-t border-slate-100 space-y-1">
          <Link
            to="/admin/legacy"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-50"
            title="Стара адмінка"
          >
            <ExternalLink className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Стара адмінка</span>}
          </Link>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-500 hover:bg-slate-50"
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
          <header className="h-16 shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-6 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <activeItem.icon className="w-5 h-5 shrink-0" style={{ color: "#4F46E5" }} />
              <h1 className="text-lg font-semibold text-slate-900 truncate">{activeItem.label}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDark((d) => !d)}
                className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50"
                title={dark ? "Світла тема" : "Темна тема"}
              >
                {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
              <LangSelector />

              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium hidden sm:inline"
                style={{ background: "#FEF3C7", color: "#92400E" }}
              >
                Admin
              </span>
              <Link
                to="/"
                className="text-sm text-slate-500 hover:text-slate-900 transition-colors hidden md:inline"
              >
                До додатку →
              </Link>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-6">
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
        className="appearance-none pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer"
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
      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-xs">▾</span>
    </div>
  );
}

function PageRouter({ active }: { active: NavKey }) {
  switch (active) {
    case "dashboard":
      return <DashboardPage />;
    case "courses":
      return <CoursesPage />;
    case "builder":
      return <CourseBuilderPage />;
    case "studio":
      return <ExerciseStudioPage />;
    case "book":
      return <BookCoursePage />;

    case "materials":
      return <MaterialsPage />;
    case "live":
      return <LiveClassPage />;
    case "students":
      return <StudentsPage />;
    case "assignments":
      return <AssignmentsPage />;
    case "standalone":
      return <StandaloneAssignmentsPage />;
    case "tutor":
      return <TutorLogsPage />;
    case "analytics":
      return <AnalyticsPage />;
    case "settings":
      return <SettingsPage />;
  }
}

function GuardScreen({
  icon,
  title,
  subtitle,
  cta,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  cta: { label: string; onClick: () => void };
}) {
  return (
    <div
      className="h-[100dvh] flex items-center justify-center px-4"
      style={{ background: "#F8FAFC", fontFamily: "Inter, system-ui, sans-serif" }}
    >
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
          {icon}
        </div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        <button
          onClick={cta.onClick}
          className="mt-6 w-full py-2.5 rounded-xl text-white font-medium text-sm"
          style={{ background: "#4F46E5" }}
        >
          {cta.label}
        </button>
      </div>
    </div>
  );
}
