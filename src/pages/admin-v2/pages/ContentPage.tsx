import { useState } from "react";
import {
  FolderOpen,
  BookOpen,
  Languages,
  BookText,
  Headphones,
  ShoppingBag,
  Gamepad2,
  Users,
  Globe,
  MessageCircle,
  ScanSearch,
  FileText,
  Bot,
  Sparkles,
} from "lucide-react";
import { SectionHeader, SubTabs, Card } from "./_ui";
import TopicsEditor from "@/components/admin/TopicsEditor";
import ListeningEditor from "@/components/admin/ListeningEditor";
import ShopEditor from "@/components/admin/ShopEditor";
import UsersEditor from "@/components/admin/UsersEditor";
import ContentGenerator from "@/components/admin/ContentGenerator";
import TranslationChecker from "@/components/admin/TranslationChecker";
import AllTextsEditor from "@/components/admin/AllTextsEditor";
import AdminChats from "@/components/admin/AdminChats";
import StuffOnlyTab from "@/components/admin/StuffOnlyTab";
import {
  VocabEditor,
  GrammarEditor,
  ReadingEditor,
  GamesEditor,
  TranslationsLauncher,
  type Level,
} from "@/components/admin/LegacyEditors";

type Tab =
  | "topics"
  | "vocabulary"
  | "grammar"
  | "reading"
  | "listening"
  | "games"
  | "shop"
  | "generator"
  | "users"
  | "translations"
  | "checker"
  | "alltexts"
  | "chats"
  | "stuffonly";

const TABS: { key: Tab; label: string; icon: any; needsLevel?: boolean }[] = [
  { key: "topics", label: "Топіки", icon: FolderOpen },
  { key: "vocabulary", label: "Слова", icon: BookOpen, needsLevel: true },
  { key: "grammar", label: "Граматика", icon: Languages, needsLevel: true },
  { key: "reading", label: "Читання", icon: BookText, needsLevel: true },
  { key: "listening", label: "Аудіювання", icon: Headphones, needsLevel: true },
  { key: "games", label: "Ігри", icon: Gamepad2, needsLevel: true },
  { key: "shop", label: "Магазин", icon: ShoppingBag },
  { key: "generator", label: "AI-генератор", icon: Sparkles, needsLevel: true },
  { key: "users", label: "Користувачі", icon: Users },
  { key: "translations", label: "Переклади", icon: Globe },
  { key: "checker", label: "AI-перевірка", icon: ScanSearch },
  { key: "alltexts", label: "Усі тексти", icon: FileText },
  { key: "chats", label: "Чати", icon: MessageCircle },
  { key: "stuffonly", label: "Stuff Only", icon: Bot },
];

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];
const TAB_KEY = "klar-admin-content-tab";
const LEVEL_KEY = "klar-admin-content-level";

export default function ContentPage() {
  const [tab, setTab] = useState<Tab>(
    () => (localStorage.getItem(TAB_KEY) as Tab) || "topics",
  );
  const [level, setLevel] = useState<Level>(
    () => (localStorage.getItem(LEVEL_KEY) as Level) || "A1",
  );

  const change = (key: Tab) => {
    setTab(key);
    localStorage.setItem(TAB_KEY, key);
  };
  const changeLevel = (l: Level) => {
    setLevel(l);
    localStorage.setItem(LEVEL_KEY, l);
  };

  const current = TABS.find((t) => t.key === tab);

  return (
    <div className="space-y-4">
      <SectionHeader
        title="Контент"
        subtitle="Матеріали школи: топіки, слова, граматика, тексти, магазин, переклади"
      />

      <SubTabs tabs={TABS} active={tab} onChange={change} />

      {current?.needsLevel && (
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => changeLevel(l)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                level === l
                  ? "bg-admin-primary text-admin-primary-fg"
                  : "border border-admin-border text-admin-muted hover:text-admin-fg"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      )}

      <Card className="p-5">
        {tab === "topics" && <TopicsEditor />}
        {tab === "vocabulary" && <VocabEditor level={level} />}
        {tab === "grammar" && <GrammarEditor level={level} />}
        {tab === "reading" && <ReadingEditor level={level} />}
        {tab === "listening" && <ListeningEditor level={level} />}
        {tab === "games" && <GamesEditor level={level} />}
        {tab === "shop" && <ShopEditor />}
        {tab === "generator" && <ContentGenerator level={level} />}
        {tab === "users" && <UsersEditor />}
        {tab === "translations" && <TranslationsLauncher />}
        {tab === "checker" && <TranslationChecker />}
        {tab === "alltexts" && <AllTextsEditor />}
        {tab === "chats" && <AdminChats />}
        {tab === "stuffonly" && <StuffOnlyTab />}
      </Card>
    </div>
  );
}
