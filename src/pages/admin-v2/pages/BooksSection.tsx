import { useState } from "react";
import { BookMarked, Sparkles } from "lucide-react";
import { SubTabs } from "./_ui";
import BooksPage from "./BooksPage";
import InteractivePagesPage from "./InteractivePagesPage";

type Tab = "books" | "interactive";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "books", label: "Підручники", icon: BookMarked },
  { key: "interactive", label: "Інтерактивні сторінки", icon: Sparkles },
];

const KEY = "klar-admin-books-tab";

export default function BooksSection() {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem(KEY) as Tab) || "books");
  const change = (key: Tab) => {
    setTab(key);
    localStorage.setItem(KEY, key);
  };

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={change} />
      {tab === "books" && <BooksPage />}
      {tab === "interactive" && <InteractivePagesPage />}
    </div>
  );
}
