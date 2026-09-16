import { useState } from "react";
import { ClipboardList, FileCheck2, Dumbbell } from "lucide-react";
import { SubTabs } from "./_ui";
import AssignmentsPage from "./AssignmentsPage";
import StandaloneAssignmentsPage from "./StandaloneAssignmentsPage";
import ExerciseStudioPage from "./ExerciseStudioPage";

type Tab = "students" | "standalone" | "studio";

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: "students", label: "Завдання учнів", icon: ClipboardList },
  { key: "standalone", label: "Індивідуальні", icon: FileCheck2 },
  { key: "studio", label: "Студія вправ", icon: Dumbbell },
];

const KEY = "klar-admin-assignments-tab";

export default function AssignmentsSection() {
  const [tab, setTab] = useState<Tab>(() => (localStorage.getItem(KEY) as Tab) || "students");
  const change = (key: Tab) => {
    setTab(key);
    localStorage.setItem(KEY, key);
  };

  return (
    <div>
      <SubTabs tabs={TABS} active={tab} onChange={change} />
      {tab === "students" && <AssignmentsPage />}
      {tab === "standalone" && <StandaloneAssignmentsPage />}
      {tab === "studio" && <ExerciseStudioPage />}
    </div>
  );
}
