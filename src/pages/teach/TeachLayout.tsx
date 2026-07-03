import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Calendar, Library, Users, ClipboardCheck, LayoutDashboard, PlayCircle, LayoutList, UsersRound, CheckSquare, Wallet } from "lucide-react";

const NAV = [
  { to: "/teach", icon: LayoutDashboard, label: "Огляд", end: true },
  { to: "/teach/schedule", icon: Calendar, label: "Розклад" },
  { to: "/teach/library", icon: Library, label: "Бібліотека" },
  { to: "/teach/lessons", icon: LayoutList, label: "Уроки" },
  { to: "/teach/class", icon: PlayCircle, label: "Клас" },
  { to: "/teach/groups", icon: UsersRound, label: "Групи" },
  { to: "/teach/students", icon: Users, label: "Учні" },
  { to: "/teach/attendance", icon: CheckSquare, label: "Відвідуваність" },
  { to: "/teach/finance", icon: Wallet, label: "Фінанси" },
  { to: "/teach/homework", icon: ClipboardCheck, label: "Домашнє" },
];

export default function TeachLayout() {
  const loc = useLocation();
  return (
    <div className="min-h-[100dvh] bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary">KLAR · Teach</p>
            <h1 className="font-display text-2xl font-bold text-foreground">Робочий простір вчителя</h1>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
          <nav className="lg:sticky lg:top-6 h-max rounded-2xl border border-border bg-card/60 p-2">
            {NAV.map((n) => {
              const active = n.end ? loc.pathname === n.to : loc.pathname.startsWith(n.to);
              return (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-display font-medium transition ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <n.icon className="w-[18px] h-[18px]" />
                  {n.label}
                </NavLink>
              );
            })}
          </nav>

          <main className="min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
