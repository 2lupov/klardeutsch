import { useState } from "react";
import { ArrowLeftRight, Loader2, Search, Volume2 } from "lucide-react";
import { dutchAi, speak, useLocal } from "@/lib/dutch";

type Entry = { nl: string; article: string; ru: string; de: string; example: string; example_ru: string; note_ru: string };
type Result = { input: string; detected: string; entries: Entry[] };
type HistoryItem = { q: string; dir: "nl-ru" | "ru-nl"; result: Result };

export default function DutchDictionary() {
  const [q, setQ] = useState("");
  const [dir, setDir] = useState<"nl-ru" | "ru-nl">("nl-ru");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const history = useLocal<HistoryItem[]>("klar-dutch-dict-history", []);
  const [items, setItems] = useState<HistoryItem[]>(history.read);

  const run = async (query: string, direction: "nl-ru" | "ru-nl") => {
    if (!query.trim() || busy) return;
    setBusy(true);
    setErr("");
    try {
      const res = await dutchAi<Result>({ action: "translate", query, direction });
      setResult(res);
      const next = [{ q: query, dir: direction, result: res }, ...items.filter((i) => i.q !== query)].slice(0, 30);
      setItems(next);
      history.write(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка перевода");
    } finally {
      setBusy(false);
    }
  };

  const swap = () => {
    setDir(dir === "nl-ru" ? "ru-nl" : "nl-ru");
    if (result?.entries?.[0]) setQ(dir === "nl-ru" ? result.entries[0].ru : result.entries[0].nl);
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4 overflow-y-auto pb-6">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(q, dir)}
            placeholder={dir === "nl-ru" ? "Нидерландское слово или фраза…" : "Русское слово или фраза…"}
            className="w-full bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <button onClick={swap} title="Поменять направление"
          className="rounded-xl border border-border p-2.5 hover:bg-muted"><ArrowLeftRight className="h-4 w-4" /></button>
        <button onClick={() => run(q, dir)} disabled={busy}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Перевести"}
        </button>
      </div>

      <div className="flex gap-2 text-xs">
        <span className={`rounded-full px-3 py-1 ${dir === "nl-ru" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>🇳🇱 → 🇷🇺</span>
        <span className={`rounded-full px-3 py-1 ${dir === "ru-nl" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>🇷🇺 → 🇳🇱</span>
        <span className="ml-auto self-center text-muted-foreground">живой разговорный перевод с примерами</span>
      </div>

      {err && <p className="text-sm text-destructive">{err}</p>}

      {result && (
        <div className="space-y-3">
          {result.entries.map((e, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-bold">
                    {e.article && <span className={e.article === "het" ? "mr-1 text-emerald-400" : "mr-1 text-sky-400"}>{e.article}</span>}
                    {e.nl}
                  </p>
                  <p className="text-base text-foreground/90">{e.ru}</p>
                  {e.de && <p className="mt-0.5 text-xs text-muted-foreground">🇩🇪 {e.de}</p>}
                </div>
                <button onClick={() => speak(e.nl)} className="rounded-lg p-2 hover:bg-muted" title="Послушать">
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
              {e.note_ru && <p className="mt-2 rounded-lg bg-accent/20 px-3 py-1.5 text-xs text-accent-foreground">💡 {e.note_ru}</p>}
              {e.example && (
                <button onClick={() => speak(e.example)} className="mt-2 block w-full rounded-lg bg-muted/50 px-3 py-2 text-left text-sm hover:bg-muted">
                  <span className="font-medium">{e.example}</span>
                  <span className="block text-xs text-muted-foreground">{e.example_ru}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {!result && items.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Недавние запросы</p>
          <div className="flex flex-wrap gap-2">
            {items.slice(0, 12).map((h, i) => (
              <button key={i} onClick={() => { setQ(h.q); setDir(h.dir); setResult(h.result); }}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">{h.q}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
