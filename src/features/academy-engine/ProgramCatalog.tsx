import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CATALOG } from "./store";
import type { Block } from "./types";

const BLOCKS: { id: Block | "all"; uk: string; ru: string }[] = [
  { id: "all", uk: "Усі", ru: "Все" },
  { id: "K", uk: "Ядро", ru: "Ядро" },
  { id: "AL", uk: "Побут", ru: "Быт" },
  { id: "EX", uk: "Іспити", ru: "Экзамены" },
  { id: "CA", uk: "Кар'єра", ru: "Карьера" },
  { id: "PR", uk: "Професії", ru: "Профессии" },
  { id: "MD", uk: "Медицина", ru: "Медицина" },
  { id: "TC", uk: "Технології", ru: "Технологии" },
  { id: "LG", uk: "Право", ru: "Право" },
];
const LEVELS = ["all", "A1", "A2", "B1", "B2", "C1", "C2"];
const T = {
  uk: { title: "Каталог програм", soon: "Скоро", open: "Відкрити", entry: "Вхід", passport: "Мій паспорт", all: "Усі рівні", final: "Фінал" },
  ru: { title: "Каталог программ", soon: "Скоро", open: "Открыть", entry: "Вход", passport: "Мой паспорт", all: "Все уровни", final: "Финал" },
};

/** Level used for filtering: target sub-level for core, entry level otherwise. */
const levelOf = (c: (typeof CATALOG)[number]) => (c.targetLevel || c.entryLevel);
/** Exact CEFR level match: "A1" matches "A1.1" and "B1 / B2 / C1" only if it contains A1. */
const matchesLevel = (c: (typeof CATALOG)[number], level: string) => {
  const tokens = levelOf(c).match(/[ABC][12]/g) ?? [];
  return tokens.includes(level);
};
const hours = (c: (typeof CATALOG)[number]) =>
  c.hoursUE != null ? `${c.hoursUE} UE` : c.hoursMin != null ? `${c.hoursMin}–${c.hoursMax} UE` : c.hoursRaw;

export default function ProgramCatalog({ lang }: { lang: string }) {
  const k = lang === "uk" ? "uk" : "ru";
  const t = T[k];
  const nav = useNavigate();
  const [block, setBlock] = useState<Block | "all">("all");
  const [level, setLevel] = useState("all");
  const list = CATALOG.filter((c) => (block === "all" || c.block === block) && (level === "all" || matchesLevel(c, level)));

  const chip = (on: boolean) => `shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${on ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary/50"}`;

  return (
    <section className="mb-10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-foreground">{t.title} <span className="text-sm font-normal text-muted-foreground">· {list.length}</span></h2>
        <button onClick={() => nav("/academy/passport")} className="shrink-0 rounded-full border border-primary px-3 py-1.5 text-sm text-primary">{t.passport}</button>
      </div>
      <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
        {BLOCKS.map((b) => <button key={b.id} className={chip(block === b.id)} onClick={() => setBlock(b.id)}>{b[k]}</button>)}
      </div>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {LEVELS.map((l) => <button key={l} className={chip(level === l)} onClick={() => setLevel(l)}>{l === "all" ? t.all : l}</button>)}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((c) => {
          const ready = c.status === "ready";
          return (
            <button key={c.code} disabled={!ready} onClick={() => nav(`/academy/program/${c.code}`)}
              className={`flex min-w-0 flex-col rounded-2xl border p-4 text-left transition ${ready ? "border-primary/60 bg-card hover:border-primary" : "border-border bg-card/40 opacity-80"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-primary">{c.code}</span>
                {!ready && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase text-muted-foreground">{t.soon}</span>}
              </div>
              <h3 className="mt-1 font-display text-base font-semibold text-foreground">{c.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {[c.entryLevel && `${t.entry} ${c.entryLevel}`, hours(c)].filter(Boolean).join(" · ")}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-foreground/80">{c.result}</p>
              {c.finalTask && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{t.final}: {c.finalTask}</p>}
            </button>
          );
        })}
      </div>
    </section>
  );
}
