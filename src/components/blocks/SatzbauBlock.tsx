import { useMemo } from "react";
import { Check, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { norm, type LessonBlock } from "./types";

interface Props {
  block: LessonBlock;
  value: Record<number, string[]>;
  onChange: (v: Record<number, string[]>) => void;
  checked: boolean;
  readOnly?: boolean;
}

/** Клік по плашці слова додає його в речення; клік у реченні — забирає назад. */
export default function SatzbauBlock({ block, value, onChange, checked, readOnly }: Props) {
  const p = block.payload || {};
  const sentences = p.sentences ?? [];

  const pools = useMemo(
    () =>
      sentences.map((s, si) => {
        let seed = block.id.split("").reduce((a, c) => a + c.charCodeAt(0), si + 7);
        const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
        const out = [...s.words];
        for (let i = out.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1));
          [out[i], out[j]] = [out[j], out[i]];
        }
        return out;
      }),
    [sentences, block.id],
  );

  const set = (i: number, arr: string[]) => onChange({ ...(value ?? {}), [i]: arr });

  return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}

      {sentences.map((s, i) => {
        const built = value?.[i] ?? [];
        const ok = built.length === s.words.length && built.every((w, j) => norm(w) === norm(s.words[j]));
        const remaining = [...pools[i]];
        built.forEach((w) => {
          const idx = remaining.indexOf(w);
          if (idx >= 0) remaining.splice(idx, 1);
        });

        return (
          <div key={i} className="space-y-2 rounded-xl border bg-card p-3">
            <div
              className={cn(
                "flex min-h-[46px] flex-wrap items-center gap-1 rounded-lg border-2 border-dashed p-2",
                checked && (ok ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "border-destructive bg-destructive/10"),
              )}
            >
              {built.length === 0 && <span className="text-xs text-muted-foreground">Натискайте слова нижче…</span>}
              {built.map((w, j) => (
                <button
                  key={`${w}-${j}`}
                  disabled={readOnly}
                  onClick={() => set(i, built.filter((_, k) => k !== j))}
                  className="rounded-lg bg-primary/10 px-2 py-1 text-sm font-medium"
                >
                  {w}
                </button>
              ))}
              {built.length > 0 && !readOnly && (
                <Button size="icon" variant="ghost" className="ml-auto h-7 w-7" onClick={() => set(i, [])}>
                  <Undo2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {remaining.map((w, j) => (
                <button
                  key={`${w}-${j}`}
                  disabled={readOnly}
                  onClick={() => set(i, [...built, w])}
                  className="rounded-lg border px-2 py-1 text-sm hover:bg-muted"
                >
                  {w}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs">
              {s.hint ? <span className="text-muted-foreground">💡 {s.hint}</span> : <span />}
              {checked && (
                <span className="flex items-center gap-1">
                  {ok ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <>
                      <X className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">{s.words.join(" ")}</span>
                    </>
                  )}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
