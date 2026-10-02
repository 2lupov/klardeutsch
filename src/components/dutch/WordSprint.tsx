import { useEffect, useMemo, useState } from "react";
import { Loader2, Volume2, Check, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DAYS, dutchAi, speak, useLocal, type Level, type Word } from "@/lib/dutch";
import { toast } from "sonner";

const store = useLocal<Record<number, Word[]>>("klar-dutch-words", {});
const known = useLocal<string[]>("klar-dutch-known", []);

const artClass = (a: string) => (a === "het" ? "text-emerald-400" : a === "de" ? "text-sky-400" : "text-muted-foreground");

export default function WordSprint({ level }: { level: Level }) {
  const [day, setDay] = useState(1);
  const [all, setAll] = useState(store.read());
  const [knownSet, setKnown] = useState(new Set(known.read()));
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"list" | "cards">("list");
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);

  const words = all[day] ?? [];
  const toLearn = useMemo(() => words.filter((w) => !knownSet.has(w.nl)), [words, knownSet]);
  const totalKnown = knownSet.size;

  useEffect(() => { setIdx(0); setFlip(false); }, [day, mode]);

  const generate = async () => {
    setBusy(true);
    try {
      const d = DAYS[day - 1];
      const res = await dutchAi<{ words: Word[] }>({ action: "words", level, topic: d.topic, count: 60, known: words.map((w) => w.nl) });
      const next = { ...all, [day]: [...words, ...(res.words || [])] };
      setAll(next); store.write(next);
      toast.success(`+${res.words?.length ?? 0} слов`);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const mark = (w: Word, ok: boolean) => {
    const s = new Set(knownSet);
    ok ? s.add(w.nl) : s.delete(w.nl);
    setKnown(s); known.write([...s]);
    setFlip(false);
    setIdx((i) => i + 1);
  };

  const card = toLearn[idx];

  return (
    <div className="grid lg:grid-cols-[260px_1fr] gap-4 h-full min-h-0">
      <aside className="overflow-y-auto space-y-1 pr-1 min-h-0">
        <p className="text-xs text-muted-foreground px-2 pb-2">Выучено всего: <b className="text-foreground">{totalKnown}</b></p>
        {DAYS.map((d) => {
          const n = (all[d.day] ?? []).length;
          return (
            <button key={d.day} onClick={() => setDay(d.day)}
              className={`w-full text-left rounded-xl px-3 py-2 text-sm transition ${day === d.day ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <span className="opacity-70">День {d.day}</span> · {d.title}
              {n > 0 && <span className="block text-xs opacity-70">{n} слов</span>}
            </button>
          );
        })}
      </aside>

      <section className="flex flex-col min-h-0 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <h2 className="text-lg font-semibold mr-auto">День {day}: {DAYS[day - 1].title}</h2>
          <Button variant={mode === "list" ? "default" : "outline"} size="sm" onClick={() => setMode("list")}>Список</Button>
          <Button variant={mode === "cards" ? "default" : "outline"} size="sm" onClick={() => setMode("cards")} disabled={!words.length}>Карточки</Button>
          <Button size="sm" variant="secondary" onClick={generate} disabled={busy} className="gap-1">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} +60 слов
          </Button>
        </div>

        {!words.length ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
            <p>Сгенерируй первую порцию слов на тему «{DAYS[day - 1].title}». Нажимай несколько раз — до 150–200 за день.</p>
            <Button onClick={generate} disabled={busy}>{busy ? "Генерирую…" : "Сгенерировать слова"}</Button>
          </div>
        ) : mode === "list" ? (
          <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-border">
            {words.map((w, i) => (
              <div key={i} className="py-2 flex items-start gap-3">
                <button onClick={() => speak(w.article ? `${w.article} ${w.nl}` : w.nl).catch((e) => toast.error(e.message))} className="mt-1 text-muted-foreground hover:text-primary">
                  <Volume2 className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">
                    {w.article && <span className={artClass(w.article)}>{w.article} </span>}{w.nl}
                    <span className="text-muted-foreground font-normal"> — {w.ru}</span>
                    {w.de && <span className="text-xs text-muted-foreground"> · 🇩🇪 {w.de}</span>}
                  </p>
                  {w.example && <p className="text-sm text-muted-foreground italic">{w.example} <span className="not-italic">({w.example_ru})</span></p>}
                </div>
                {knownSet.has(w.nl) && <Check className="h-4 w-4 text-emerald-400 mt-1" />}
              </div>
            ))}
          </div>
        ) : card ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <p className="text-sm text-muted-foreground">{idx + 1} / {toLearn.length}</p>
            <button onClick={() => setFlip(!flip)} className="w-full max-w-md min-h-56 rounded-2xl border border-border bg-background p-6 text-center">
              <p className="text-3xl font-bold">{card.article && <span className={artClass(card.article)}>{card.article} </span>}{card.nl}</p>
              {flip ? (
                <div className="mt-4 space-y-1">
                  <p className="text-xl">{card.ru}</p>
                  {card.de && <p className="text-muted-foreground">🇩🇪 {card.de}</p>}
                  <p className="text-sm italic text-muted-foreground mt-3">{card.example}</p>
                </div>
              ) : <p className="mt-4 text-sm text-muted-foreground">нажми, чтобы перевернуть</p>}
            </button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => speak(card.article ? `${card.article} ${card.nl}. ${card.example}` : `${card.nl}. ${card.example}`).catch(() => {})}><Volume2 className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => mark(card, false)} className="gap-1"><X className="h-4 w-4" /> Ещё учу</Button>
              <Button onClick={() => mark(card, true)} className="gap-1"><Check className="h-4 w-4" /> Знаю</Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">Всё выучено в этом наборе 🎉 Добавь ещё слов.</div>
        )}
      </section>
    </div>
  );
}
