import { useState } from "react";
import { GRAMMAR } from "@/lib/dutch";

export const BRIDGE = [
  ["au → ui / ou", "Haus → huis, Frau → vrouw, kaufen → kopen"],
  ["ei → ij", "Zeit → tijd, bleiben → blijven, schreiben → schrijven"],
  ["ch → k", "machen → maken, Buch → boek, suchen → zoeken"],
  ["ss / ß / z → t", "Wasser → water, essen → eten, zwei → twee"],
  ["pf → p", "Apfel → appel, Pfeffer → peper"],
];
export const FALSE = [["slim", "умный (не schlimm)"], ["klaar", "готово"], ["bellen", "звонить"], ["wie", "кто"], ["hoe", "как"], ["durven", "осмелиться"], ["monster", "образец"], ["raar", "странный"], ["eng", "жуткий / страшный"], ["bekomen", "оправиться"]];

export default function GrammarBridge() {
  const [t, setT] = useState(0);
  const [ans, setAns] = useState<Record<string, number>>({});
  const topic = GRAMMAR[t];

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 h-full min-h-0">
      <aside className="overflow-y-auto space-y-1 min-h-0">
        {GRAMMAR.map((g, i) => (
          <button key={i} onClick={() => setT(i)} className={`w-full text-left text-sm rounded-xl px-3 py-2 ${i === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{g.title}</button>
        ))}
        <button onClick={() => setT(-1)} className={`w-full text-left text-sm rounded-xl px-3 py-2 ${t === -1 ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>🇩🇪→🇳🇱 Немецкий мост</button>
      </aside>
      <section className="rounded-2xl border border-border bg-card p-4 overflow-y-auto min-h-0">
        {t === -1 ? (
          <div className="space-y-6">
            <div><h2 className="text-lg font-semibold mb-2">Звуковые переходы</h2>
              {BRIDGE.map(([a, b]) => <p key={a} className="py-1"><b className="text-primary">{a}</b> — {b}</p>)}</div>
            <div><h2 className="text-lg font-semibold mb-2">Ложные друзья</h2>
              <div className="grid sm:grid-cols-2 gap-2">{FALSE.map(([a, b]) => <p key={a} className="rounded-lg bg-muted/40 px-3 py-2"><b>{a}</b> — {b}</p>)}</div></div>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{topic.title}</h2>
            <p className="rounded-xl bg-muted/40 p-3 text-sm">{topic.rule}</p>
            {topic.items.map((it, i) => {
              const key = `${t}-${i}`;
              const sel = ans[key];
              return (
                <div key={key}>
                  <p className="mb-1">{it.q}</p>
                  <div className="flex flex-wrap gap-2">
                    {it.options.map((o, j) => {
                      const cls = sel === undefined ? "" : j === it.answer ? "border-emerald-500 bg-emerald-500/15" : sel === j ? "border-destructive bg-destructive/15" : "";
                      return <button key={j} onClick={() => setAns({ ...ans, [key]: j })} className={`rounded-lg border border-border px-3 py-1.5 text-sm ${cls}`}>{o}</button>;
                    })}
                  </div>
                  {sel !== undefined && <p className="text-xs text-muted-foreground mt-1">{it.why}</p>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
