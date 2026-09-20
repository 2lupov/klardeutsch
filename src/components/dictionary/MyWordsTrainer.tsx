import { useMemo, useState } from "react";
import { X, RotateCcw, Check, Repeat } from "lucide-react";
import type { MyWord } from "./AddMyWordForm";

const ARTICLE_COLOR: Record<string, string> = {
  der: "text-blue-500",
  die: "text-pink-500",
  das: "text-emerald-500",
};

const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/** Карточковий тренажер по власних словах учня. */
export default function MyWordsTrainer({
  words,
  title,
  onClose,
}: {
  words: MyWord[];
  title?: string;
  onClose: () => void;
}) {
  const [deck, setDeck] = useState<MyWord[]>(() => shuffle(words));
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<string[]>([]);
  const [again, setAgain] = useState<string[]>([]);

  const card = deck[i];
  const done = i >= deck.length;
  const progress = useMemo(() => (deck.length ? Math.round((Math.min(i, deck.length) / deck.length) * 100) : 0), [i, deck.length]);

  const next = (ok: boolean) => {
    if (!card) return;
    if (ok) setKnown((k) => [...k, card.id]);
    else setAgain((a) => [...a, card.id]);
    setFlipped(false);
    setI((n) => n + 1);
  };

  const restart = (onlyAgain: boolean) => {
    const base = onlyAgain ? words.filter((w) => again.includes(w.id)) : words;
    setDeck(shuffle(base.length ? base : words));
    setI(0);
    setFlipped(false);
    setKnown([]);
    setAgain([]);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-background/95 backdrop-blur flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-primary font-bold">Карточки</p>
          <h2 className="font-display font-black text-lg leading-tight">{title ?? "Мої слова"}</h2>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Закрити">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="h-1 bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-8 flex flex-col items-center justify-center gap-6">
        {done ? (
          <div className="text-center space-y-4">
            <p className="text-5xl">🎉</p>
            <p className="font-display font-black text-xl">Готово!</p>
            <p className="text-sm text-muted-foreground">
              Знаю: {known.length} · Ще вчити: {again.length}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {again.length > 0 && (
                <button
                  onClick={() => restart(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
                >
                  <Repeat className="w-4 h-4" /> Повторити складні
                </button>
              )}
              <button
                onClick={() => restart(false)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border font-bold text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Спочатку
              </button>
              <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-border font-bold text-sm">
                Закрити
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground font-bold">
              {i + 1} / {deck.length}
            </p>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="w-full max-w-md min-h-56 rounded-3xl border border-border bg-card p-6 flex flex-col items-center justify-center gap-3 text-center"
            >
              {flipped ? (
                <>
                  <p className="font-display text-2xl font-black">{card.russian || "—"}</p>
                  {card.example && <p className="text-sm italic text-muted-foreground">{card.example}</p>}
                </>
              ) : (
                <>
                  <p className="font-display text-3xl font-black">
                    {card.article && (
                      <span className={`${ARTICLE_COLOR[card.article] ?? "text-primary"} mr-2`}>{card.article}</span>
                    )}
                    {card.german}
                  </p>
                  <p className="text-xs text-muted-foreground">Натисніть, щоб побачити переклад</p>
                </>
              )}
            </button>

            <div className="flex gap-2 w-full max-w-md">
              <button
                onClick={() => next(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-border font-bold text-sm"
              >
                <Repeat className="w-4 h-4" /> Ще вчити
              </button>
              <button
                onClick={() => next(true)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm"
              >
                <Check className="w-4 h-4" /> Знаю
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
