import { useState } from "react";
import { BarChart3, MessageSquare } from "lucide-react";
import { SubTabs } from "./_ui";
import AnalyticsPage from "./AnalyticsPage";
import TutorLogsPage from "./TutorLogsPage";

type Tab = "stats" | "tutor";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "stats", label: "Показники", icon: BarChart3 },
  { key: "tutor", label: "Логи AI-репетитора", icon: MessageSquare },
];

const KEY = "klar-admin-analytics-tab";

export default function AnalyticsSection() {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem(KEY) as Tab) || "stats");
  const change = (key: Tab) => {
    setTab(key);
    localStorage.setItem(KEY, key);
  };

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={change} />
      {tab === "stats" && <AnalyticsPage />}
      {tab === "tutor" && <TutorLogsPage />}
    </div>
  );
}
