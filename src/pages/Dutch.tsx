import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock, GraduationCap, BookMarked, BookOpen, Headphones, MessageCircle, Bookmark, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Curriculum from "@/components/dutch/Curriculum";
import Dictionary from "@/components/dutch/Dictionary";
import Reader from "@/components/dutch/Reader";
import Review from "@/components/dutch/Review";
import ListeningLab from "@/components/dutch/ListeningLab";
import DutchBuddy from "@/components/dutch/DutchBuddy";
import GrammarBridge from "@/components/dutch/GrammarBridge";
import type { Level } from "@/lib/dutch";

// Убрано относительно прошлой версии: "Темы (старое)" (WordSprint) — целиком
// покрыто программой курса + свободным чтением + повторением; и "HTML" —
// общий загрузчик html/svg-документов, не имеющий отношения к изучению языка
// (остался как отдельная возможность платформы, просто не в этом разделе).
// "Курс" и "Словарь" — академическое ядро. "Практика" — дополнительные
// упражнения поверх него. "Справочник" — грамматика, к которой можно
// обратиться вне последовательности модулей, как приложение в конце учебника.
const PRIMARY = [
  { key: "course", label: "Курс", icon: GraduationCap },
  { key: "review", label: "Повторение", icon: RefreshCw },
  { key: "dict", label: "Словарь", icon: BookMarked },
] as const;
const PRACTICE = [
  { key: "read", label: "Свободное чтение", icon: BookOpen },
  { key: "listen", label: "Аудирование", icon: Headphones },
  { key: "buddy", label: "Daan", icon: MessageCircle },
] as const;
const REFERENCE = [{ key: "grammar", label: "Справочник", icon: Bookmark }] as const;
const ALL_TABS = [...PRIMARY, ...PRACTICE, ...REFERENCE] as const;
type Tab = (typeof ALL_TABS)[number]["key"];

const FONT_LINK_ID = "klar-dutch-serif-font";
function useHeadingFont() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,500;8..60,600&display=swap";
    document.head.appendChild(link);
  }, []);
}
const headingFont = { fontFamily: '"Source Serif 4", Georgia, serif' };

function NavGroup({ items, tab, setTab }: { items: readonly { key: Tab; label: string; icon: any }[]; tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <>
      {items.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          onClick={() => setTab(key)}
          className={`w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-left transition ${
            tab === key ? "bg-primary text-primary-foreground" : "text-foreground/80 hover:bg-muted"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </>
  );
}

export default function Dutch() {
  useHeadingFont();
  const { user, loading } = useAuth() as any;
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem("klar-dutch-tab") as Tab) || "course");
  const [level, setLevel] = useState<Level>(() => (localStorage.getItem("klar-dutch-level") as Level) || "A1");

  useEffect(() => { document.title = "KLAR Dutch — курс нидерландского A0→B2"; }, []);
  useEffect(() => { localStorage.setItem("klar-dutch-tab", tab); }, [tab]);
  useEffect(() => { localStorage.setItem("klar-dutch-level", level); }, [level]);
  useEffect(() => {
    if (loading) return;
    if (!user) { setOk(false); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setOk(!!data));
  }, [user, loading]);

  if (ok === null) return <div className="h-[100dvh] flex items-center justify-center bg-background text-muted-foreground">Загрузка…</div>;
  if (!ok) return (
    <div className="h-[100dvh] flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Lock className="h-10 w-10" /><p>Приватная страница</p><Link to="/" className="underline text-sm">На главную</Link>
    </div>
  );

  const needsLevelPicker = tab === "read" || tab === "listen" || tab === "buddy";

  return (
    <div className="dark h-[100dvh] flex bg-background text-foreground overflow-hidden">
      {/* Боковая панель — на планшете и выше. Академический конспект курса,
          а не бегущая строка вкладок: Курс и Словарь всегда на виду,
          практика и справочник — рядом, но визуально подчинены им. */}
      <aside className="hidden md:flex md:w-60 md:flex-col border-r border-border px-3 py-4 gap-6 shrink-0">
        <div className="flex items-center gap-2 px-1">
          <Link to="/admin" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /></Link>
          <h1 className="text-lg font-semibold" style={headingFont}>KLAR Dutch</h1>
        </div>
        <nav className="space-y-1">
          <NavGroup items={PRIMARY} tab={tab} setTab={setTab} />
        </nav>
        <nav className="space-y-1">
          <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Практика</p>
          <NavGroup items={PRACTICE} tab={tab} setTab={setTab} />
        </nav>
        <nav className="space-y-1">
          <NavGroup items={REFERENCE} tab={tab} setTab={setTab} />
        </nav>

        {needsLevelPicker && (
          <div className="mt-auto pt-4 border-t border-border">
            <p className="px-1 pb-1.5 text-[11px] text-muted-foreground">Уровень для практики</p>
            <div className="flex gap-1 px-1">
              {(["A1", "A2", "B1", "B2"] as Level[]).map((l) => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`flex-1 rounded-lg py-1 text-xs font-semibold ${level === l ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>{l}</button>
              ))}
            </div>
          </div>
        )}
      </aside>

      <div className="flex-1 min-h-0 flex flex-col">
        {/* Верхняя панель — только на мобильном, та же навигация горизонтальной лентой */}
        <header className="md:hidden flex items-center gap-2 px-3 py-2.5 border-b border-border overflow-x-auto">
          <Link to="/admin" className="text-muted-foreground shrink-0"><ArrowLeft className="h-4 w-4" /></Link>
          {ALL_TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs whitespace-nowrap ${tab === key ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </header>

        <main className="flex-1 min-h-0 p-4 overflow-hidden">
          {tab === "course" && <Curriculum />}
          {tab === "dict" && <Dictionary />}
          {tab === "read" && <Reader level={level} />}
          {tab === "review" && <Review />}
          {tab === "listen" && <ListeningLab level={level} />}
          {tab === "buddy" && <DutchBuddy level={level} />}
          {tab === "grammar" && <GrammarBridge />}
        </main>
      </div>
    </div>
  );
}
