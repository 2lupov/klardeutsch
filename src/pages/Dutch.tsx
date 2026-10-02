import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Curriculum from "@/components/dutch/Curriculum";
import Reader from "@/components/dutch/Reader";
import Review from "@/components/dutch/Review";
import WordSprint from "@/components/dutch/WordSprint";
import ListeningLab from "@/components/dutch/ListeningLab";
import DutchBuddy from "@/components/dutch/DutchBuddy";
import GrammarBridge from "@/components/dutch/GrammarBridge";
import DutchDictionary from "@/components/dutch/DutchDictionary";
import type { Level } from "@/lib/dutch";

// "course" — фиксированная программа A0→B2, основной путь (см. src/lib/curriculum.ts).
// "read" и "review" — свободная практика сверху программы (доп. объём + SRS).
// Остальное — вспомогательные инструменты.
const TABS = [
  { key: "course", label: "🎓 Курс" },
  { key: "read", label: "📖 Свободное чтение" },
  { key: "review", label: "🔁 Повторение" },
  { key: "listen", label: "🎧 Аудирование" },
  { key: "buddy", label: "💬 Daan" },
  { key: "dict", label: "🔤 Словарь" },
  { key: "grammar", label: "🧩 Грамматика" },
  { key: "words", label: "📚 Темы (старое)" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default function Dutch() {
  const { user, loading } = useAuth() as any;
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem("klar-dutch-tab") as Tab) || "course");
  const [level, setLevel] = useState<Level>(() => (localStorage.getItem("klar-dutch-level") as Level) || "A1");

  useEffect(() => { document.title = "KLAR Dutch — от A0 до B2"; }, []);
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

  return (
    <div className="dark h-[100dvh] flex flex-col bg-background text-foreground overflow-hidden">
      <header className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
        <Link to="/admin" className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="font-bold text-lg mr-2">🇳🇱 KLAR Dutch</h1>
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm ${tab === t.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{t.label}</button>
          ))}
        </nav>
        <div className="ml-auto flex gap-1">
          {(["A1", "A2", "B1", "B2"] as Level[]).map((l) => (
            <button key={l} onClick={() => setLevel(l)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${level === l ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>{l}</button>
          ))}
        </div>
      </header>
      <main className="flex-1 min-h-0 p-4">
        {tab === "course" && <Curriculum />}
        {tab === "read" && <Reader level={level} />}
        {tab === "review" && <Review />}
        {tab === "words" && <WordSprint level={level} />}
        {tab === "dict" && <DutchDictionary />}
        {tab === "listen" && <ListeningLab level={level} />}
        {tab === "buddy" && <DutchBuddy level={level} />}
        {tab === "grammar" && <GrammarBridge />}
      </main>
    </div>
  );
}
