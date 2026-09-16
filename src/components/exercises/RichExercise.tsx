import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { RichPayload, WordImageItem, shuffle } from "./richExercises";

/**
 * Student-facing renderer for the interactive exercise types:
 * picture ↔ word, drag-the-word gaps, matching pairs and sorting into groups.
 * Tap-based (works on phones): pick an item, then tap where it belongs.
 */

interface Props {
  type: string;
  payload: RichPayload;
  revealed?: boolean;
  onResult?: (correct: boolean, done: boolean) => void;
}

/* ─────────── picture helper (private bucket → signed url) ─────────── */

function ItemVisual({ item }: { item: WordImageItem }) {
  const [src, setSrc] = useState<string | null>(item.image_url ?? null);

  useEffect(() => {
    if (item.image_url || !item.image_path) return;
    let cancelled = false;
    supabase.storage
      .from("exercise-images")
      .createSignedUrl(item.image_path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setSrc(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [item.image_url, item.image_path]);

  if (src) {
    return (
      <img
        src={src}
        alt={item.translation || item.word}
        loading="lazy"
        className="w-full aspect-square object-cover rounded-xl"
      />
    );
  }
  return (
    <div className="w-full aspect-square rounded-xl bg-muted/50 flex items-center justify-center text-5xl">
      {item.emoji || "🖼️"}
    </div>
  );
}

/* ─────────── picture ↔ word ─────────── */

function WordImage({ payload, revealed, onResult }: Props) {
  const items = (payload.items || []).filter((i) => i?.word);
  const words = useMemo(() => shuffle(items.map((i) => i.word)), [items.length]);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [active, setActive] = useState<string | null>(null);

  const allDone = Object.keys(picked).length === items.length;
  const correctCount = items.filter((it, i) => picked[i] === it.word).length;
  useEffect(() => {
    if (allDone) onResult?.(correctCount === items.length, true);
  }, [allDone, correctCount, items.length]);

  const place = (idx: number) => {
    if (!active || revealed) return;
    setPicked((p) => {
      const next = { ...p };
      for (const k of Object.keys(next)) if (next[Number(k)] === active) delete next[Number(k)];
      next[idx] = active;
      return next;
    });
    setActive(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {words.map((w) => {
          const used = Object.values(picked).includes(w);
          return (
            <button
              key={w}
              type="button"
              onClick={() => setActive(active === w ? null : w)}
              disabled={used}
              className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition ${
                active === w
                  ? "border-primary bg-primary text-primary-foreground"
                  : used
                    ? "border-border bg-muted/40 text-muted-foreground line-through"
                    : "border-border hover:border-primary/50"
              }`}
            >
              {w}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {items.map((it, i) => {
          const chosen = picked[i];
          const right = chosen === it.word;
          return (
            <button
              key={i}
              type="button"
              onClick={() => place(i)}
              className={`p-2 rounded-2xl border-2 text-left transition ${
                chosen
                  ? right && (revealed || true)
                    ? "border-green-500 bg-green-500/5"
                    : "border-destructive bg-destructive/5"
                  : active
                    ? "border-primary/60 border-dashed"
                    : "border-border"
              }`}
            >
              <ItemVisual item={it} />
              <div className="mt-1.5 min-h-6 text-sm font-medium flex items-center gap-1">
                {chosen ? (
                  <>
                    {right ? <Check className="w-3.5 h-3.5 text-green-600" /> : <X className="w-3.5 h-3.5 text-destructive" />}
                    <span className="truncate">{chosen}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {active ? "Тут" : "?"}
                  </span>
                )}
              </div>
              {revealed && <div className="text-[11px] text-muted-foreground truncate">{it.word}</div>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── drag-the-word gaps ─────────── */

function DragCloze({ payload, revealed, onResult }: Props) {
  const parts = (payload.text || "").split("___");
  const gaps = Math.max(0, parts.length - 1);
  const answers = payload.tokens || [];
  const bank = useMemo(
    () => shuffle([...(payload.tokens || []), ...(payload.distractors || [])]),
    [payload.tokens?.length, payload.distractors?.length],
  );
  const [filled, setFilled] = useState<Record<number, string>>({});
  const [active, setActive] = useState<string | null>(null);

  const allDone = Object.keys(filled).length === gaps && gaps > 0;
  const correctCount = answers.filter((a, i) => (filled[i] || "").trim() === a.trim()).length;
  useEffect(() => {
    if (allDone) onResult?.(correctCount === gaps, true);
  }, [allDone, correctCount, gaps]);

  const fill = (gapIdx: number) => {
    if (revealed) return;
    if (!active) {
      setFilled((f) => {
        const n = { ...f };
        delete n[gapIdx];
        return n;
      });
      return;
    }
    setFilled((f) => {
      const n = { ...f };
      for (const k of Object.keys(n)) if (n[Number(k)] === active) delete n[Number(k)];
      n[gapIdx] = active;
      return n;
    });
    setActive(null);
  };

  return (
    <div className="space-y-3">
      <p className="text-base md:text-lg leading-loose">
        {parts.map((chunk, i) => (
          <span key={i}>
            <span className="whitespace-pre-wrap">{chunk}</span>
            {i < gaps && (
              <button
                type="button"
                onClick={() => fill(i)}
                className={`inline-flex min-w-[84px] justify-center mx-1 px-2 py-0.5 rounded-lg border-2 text-sm font-semibold align-middle transition ${
                  filled[i]
                    ? revealed
                      ? filled[i] === answers[i]
                        ? "border-green-500 bg-green-500/10 text-green-700"
                        : "border-destructive bg-destructive/10 text-destructive"
                      : "border-primary bg-primary/10 text-primary"
                    : "border-dashed border-border text-muted-foreground hover:border-primary/60"
                }`}
              >
                {filled[i] || (revealed ? answers[i] : "＿＿")}
              </button>
            )}
          </span>
        ))}
      </p>
      <div className="flex flex-wrap gap-2">
        {bank.map((tok, i) => {
          const used = Object.values(filled).includes(tok);
          return (
            <button
              key={`${tok}-${i}`}
              type="button"
              onClick={() => setActive(active === tok ? null : tok)}
              disabled={used || revealed}
              className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition ${
                active === tok
                  ? "border-primary bg-primary text-primary-foreground"
                  : used
                    ? "border-border bg-muted/40 text-muted-foreground line-through"
                    : "border-border hover:border-primary/50"
              }`}
            >
              {tok}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── matching pairs ─────────── */

function Matching({ payload, revealed, onResult }: Props) {
  const pairs = (payload.pairs || []).filter((p) => p?.left && p?.right);
  const rights = useMemo(() => shuffle(pairs.map((p) => p.right)), [pairs.length]);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [active, setActive] = useState<string | null>(null);

  const allDone = Object.keys(picked).length === pairs.length && pairs.length > 0;
  const correctCount = pairs.filter((p, i) => picked[i] === p.right).length;
  useEffect(() => {
    if (allDone) onResult?.(correctCount === pairs.length, true);
  }, [allDone, correctCount, pairs.length]);

  const place = (i: number) => {
    if (revealed) return;
    if (!active) {
      setPicked((p) => {
        const n = { ...p };
        delete n[i];
        return n;
      });
      return;
    }
    setPicked((p) => {
      const n = { ...p };
      for (const k of Object.keys(n)) if (n[Number(k)] === active) delete n[Number(k)];
      n[i] = active;
      return n;
    });
    setActive(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {rights.map((r, i) => {
          const used = Object.values(picked).includes(r);
          return (
            <button
              key={`${r}-${i}`}
              type="button"
              onClick={() => setActive(active === r ? null : r)}
              disabled={used || revealed}
              className={`px-3 py-1.5 rounded-xl border text-sm transition ${
                active === r
                  ? "border-primary bg-primary text-primary-foreground"
                  : used
                    ? "border-border bg-muted/40 text-muted-foreground line-through"
                    : "border-border hover:border-primary/50"
              }`}
            >
              {r}
            </button>
          );
        })}
      </div>
      <div className="space-y-2">
        {pairs.map((p, i) => {
          const chosen = picked[i];
          const right = chosen === p.right;
          return (
            <button
              key={i}
              type="button"
              onClick={() => place(i)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition ${
                chosen
                  ? right
                    ? "border-green-500 bg-green-500/5"
                    : "border-destructive bg-destructive/5"
                  : active
                    ? "border-dashed border-primary/60"
                    : "border-border"
              }`}
            >
              <span className="font-semibold text-sm flex-1 min-w-0">{p.left}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-sm flex-1 min-w-0 truncate">
                {chosen || (revealed ? p.right : <span className="text-muted-foreground">＿＿</span>)}
              </span>
              {chosen ? (
                right ? <Check className="w-4 h-4 text-green-600 shrink-0" /> : <X className="w-4 h-4 text-destructive shrink-0" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────── sorting into groups ─────────── */

function Sorting({ payload, revealed, onResult }: Props) {
  const groups = (payload.groups || []).filter((g) => g?.name);
  const items = useMemo(
    () => shuffle(groups.flatMap((g) => (g.items || []).map((it) => ({ item: it, group: g.name })))),
    [groups.length],
  );
  const [placed, setPlaced] = useState<Record<string, string>>({});
  const [active, setActive] = useState<string | null>(null);

  const allDone = Object.keys(placed).length === items.length && items.length > 0;
  const correctCount = items.filter((it) => placed[it.item] === it.group).length;
  useEffect(() => {
    if (allDone) onResult?.(correctCount === items.length, true);
  }, [allDone, correctCount, items.length]);

  const drop = (groupName: string) => {
    if (!active || revealed) return;
    setPlaced((p) => ({ ...p, [active]: groupName }));
    setActive(null);
  };

  const groupOf = (item: string) => items.find((i) => i.item === item)?.group;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items
          .filter((it) => !placed[it.item])
          .map((it) => (
            <button
              key={it.item}
              type="button"
              onClick={() => setActive(active === it.item ? null : it.item)}
              disabled={revealed}
              className={`px-3 py-1.5 rounded-xl border text-sm font-medium transition ${
                active === it.item
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {it.item}
            </button>
          ))}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(groups.length, 3)}, minmax(0, 1fr))` }}>
        {groups.map((g) => (
          <button
            key={g.name}
            type="button"
            onClick={() => drop(g.name)}
            className={`min-h-28 p-2.5 rounded-2xl border-2 text-left transition ${
              active ? "border-dashed border-primary/60 bg-primary/5" : "border-border"
            }`}
          >
            <p className="text-xs font-bold uppercase text-muted-foreground mb-1.5">{g.name}</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(placed)
                .filter(([, grp]) => grp === g.name)
                .map(([item]) => {
                  const right = groupOf(item) === g.name;
                  return (
                    <span
                      key={item}
                      className={`px-2 py-0.5 rounded-lg text-xs font-medium border ${
                        right ? "border-green-500 bg-green-500/10 text-green-700" : "border-destructive bg-destructive/10 text-destructive"
                      }`}
                    >
                      {item}
                    </span>
                  );
                })}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────── switch ─────────── */

export default function RichExercise(props: Props) {
  const inner = (() => {
    switch (props.type) {
      case "word_image":
        return <WordImage {...props} />;
      case "drag_cloze":
        return <DragCloze {...props} />;
      case "matching":
        return <Matching {...props} />;
      case "sorting":
        return <Sorting {...props} />;
      default:
        return null;
    }
  })();
  if (!inner) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      {inner}
    </motion.div>
  );
}
