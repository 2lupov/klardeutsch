import { useEffect, useMemo, useState } from "react";
import BackButton from "@/components/BackButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { computeStatus, type SkillStatus } from "./passport";
import { CATALOG, fetchAttempts, type AttemptRow } from "./store";
import { RUBRIC_CRITERIA } from "./types";

const T = {
  uk: {
    title: "Мій паспорт навичок", empty: "Ще немає спроб. Виконайте фінальну задачу уроку й оцініть її за рубрикою.",
    note: "Паспорт не дорівнює сертифікату: навичка показана у зв'язку з підрівнем курсу.",
    history: "Історія спроб", support: "з опорою", solo: "без опор", newSit: "нова ситуація",
    st: { none: "Не розпочато", supported: "З опорою", independent: "Самостійно", transfer: "У новій ситуації" },
  },
  ru: {
    title: "Мой паспорт навыков", empty: "Пока нет попыток. Выполните финальную задачу урока и оцените её по рубрике.",
    note: "Паспорт не равен сертификату: навык показан в связи с подуровнем курса.",
    history: "История попыток", support: "с опорой", solo: "без опор", newSit: "новая ситуация",
    st: { none: "Не начато", supported: "С опорой", independent: "Самостоятельно", transfer: "В новой ситуации" },
  },
};
const STEP: SkillStatus[] = ["supported", "independent", "transfer"];

export default function PassportPage() {
  const { lang: l } = useLanguage();
  const t = T[l === "uk" ? "uk" : "ru"];
  const { user } = useAuth();
  const [rows, setRows] = useState<AttemptRow[]>([]);
  useEffect(() => { if (user) fetchAttempts(user.id).then(setRows); }, [user]);

  const groups = useMemo(() => {
    const m = new Map<string, AttemptRow[]>();
    rows.forEach((r) => m.set(r.course_code, [...(m.get(r.course_code) ?? []), r]));
    return [...m.entries()];
  }, [rows]);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 md:px-6">
      <BackButton to="/academy" />
      <h1 className="mt-4 font-display text-2xl font-bold text-foreground">{t.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t.note}</p>
      {groups.length === 0 && <p className="mt-8 text-muted-foreground">{t.empty}</p>}
      <div className="mt-6 space-y-4">
        {groups.map(([code, list]) => {
          const meta = CATALOG.find((c) => c.code === code);
          const status = computeStatus(list);
          const idx = STEP.indexOf(status);
          return (
            <div key={code} className="rounded-2xl border border-border bg-card/50 p-4">
              <p className="text-xs font-semibold text-primary">{code}</p>
              <h2 className="font-display text-lg font-semibold text-foreground">{meta?.title}</h2>
              <p className="text-sm text-muted-foreground">{meta?.result}</p>
              <div className="mt-3 grid grid-cols-3 gap-1">
                {STEP.map((s, i) => (
                  <div key={s} className={`rounded-md px-2 py-1.5 text-center text-xs ${i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{t.st[s]}</div>
                ))}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-foreground">{t.history} ({list.length})</summary>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {list.map((a) => (
                    <li key={a.id} className="flex flex-wrap gap-x-2">
                      <span>{new Date(a.created_at).toLocaleString()}</span>
                      <span>· {a.with_support ? t.support : t.solo}{a.new_situation ? ` · ${t.newSit}` : ""}</span>
                      <span>· {RUBRIC_CRITERIA.map((c) => a.rubric[c] ?? "–").join("/")}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
