import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { norm, type LessonBlock } from "./types";

interface Props {
  block: LessonBlock;
  value: Record<number, string>;
  onChange: (v: Record<number, string>) => void;
  checked: boolean;
  readOnly?: boolean;
}

/** Клік по лівій картці, потім по правій — пара з'єднана. */
export default function PaareBlock({ block, value, onChange, checked, readOnly }: Props) {
  const p = block.payload || {};
  const pairs = p.pairs ?? [];

  const rights = useMemo(() => {
    const arr = pairs.map((x) => x.right);
    // стабільне перемішування за id блока
    let seed = block.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }, [pairs, block.id]);

  const usedBy = (right: string) => Object.entries(value ?? {}).find(([, v]) => v === right)?.[0];

  const pick = (leftIndex: number, right: string) => {
    if (readOnly) return;
    const next = { ...(value ?? {}) };
    Object.keys(next).forEach((k) => {
      if (next[Number(k)] === right) delete next[Number(k)];
    });
    next[leftIndex] = right;
    onChange(next);
  };

  return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}

      <div className="space-y-2">
        {pairs.map((pr, i) => {
          const given = value?.[i];
          const ok = norm(given) === norm(pr.right);
          return (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <div className="w-40 shrink-0 rounded-xl border bg-card px-3 py-2 text-sm font-medium">{pr.left}</div>
              <div className="text-muted-foreground">→</div>
              <div className="flex flex-1 flex-wrap gap-1">
                {rights.map((r) => {
                  const takenBy = usedBy(r);
                  const mine = given === r;
                  const taken = takenBy !== undefined && !mine;
                  return (
                    <button
                      key={r}
                      disabled={readOnly || taken}
                      onClick={() => pick(i, r)}
                      className={cn(
                        "rounded-lg border px-2 py-1 text-xs transition-colors",
                        mine && "border-primary bg-primary/10 font-medium",
                        taken && "opacity-30",
                        checked && mine && (ok ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "border-destructive bg-destructive/10"),
                      )}
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
              {checked && (
                <span className="flex items-center gap-1 text-xs">
                  {ok ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <>
                      <X className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">{pr.right}</span>
                    </>
                  )}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
