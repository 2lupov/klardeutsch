import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isCorrectText, type LessonBlock } from "./types";

interface Props {
  block: LessonBlock;
  value: Record<number, string>;
  onChange: (v: Record<number, string>) => void;
  checked: boolean;
  readOnly?: boolean;
}

export default function LueckeBlock({ block, value, onChange, checked, readOnly }: Props) {
  const p = block.payload || {};
  const items = p.items ?? [];
  const mode = p.mode ?? "select";
  const set = (i: number, v: string) => onChange({ ...value, [i]: v });

  return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}

      <ol className="space-y-3">
        {items.map((it, i) => {
          const given = value?.[i] ?? "";
          const ok = isCorrectText(given, it.answer, it.synonyms);
          const [before, ...rest] = it.sentence.split("___");
          const after = rest.join("___");
          const options = it.options?.length ? it.options : [it.answer];

          return (
            <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3 text-[15px]">
              <span className="text-xs font-semibold text-muted-foreground">{i + 1}.</span>
              <span>{before}</span>

              {mode === "input" ? (
                <Input
                  value={given}
                  disabled={readOnly}
                  onChange={(e) => set(i, e.target.value)}
                  className={cn(
                    "h-9 w-32 text-center",
                    checked && (ok ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950" : "border-destructive bg-destructive/10"),
                  )}
                  placeholder="…"
                />
              ) : (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      disabled={readOnly}
                      className={cn(
                        "min-w-[96px] rounded-lg border-2 border-dashed px-3 py-1 text-center font-medium",
                        !given && "text-muted-foreground",
                        checked && (ok ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : "border-destructive bg-destructive/10 text-destructive"),
                      )}
                    >
                      {given || "___"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-44 p-1">
                    <div className="flex flex-col">
                      {options.map((o) => (
                        <Button key={o} variant="ghost" className="justify-start" onClick={() => set(i, o)}>
                          {o}
                        </Button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              )}

              <span>{after}</span>

              {checked && (
                <span className="ml-auto flex items-center gap-2 text-xs">
                  {ok ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <>
                      <X className="h-4 w-4 text-destructive" />
                      <span className="font-medium text-emerald-700 dark:text-emerald-300">{it.answer}</span>
                    </>
                  )}
                </span>
              )}

              {it.hint && (
                <span className="w-full text-xs text-muted-foreground">💡 {it.hint}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
