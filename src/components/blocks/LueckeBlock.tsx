import { Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
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
            <li key={i} className="space-y-3 rounded-lg border bg-card p-4 text-[15px]">
              <div className="flex flex-wrap items-center gap-2 leading-7">
                <span className="text-xs font-semibold text-muted-foreground">{i + 1}.</span>
                <span>{before}</span>

                {mode === "input" ? (
                  <Input
                    value={given}
                    disabled={readOnly}
                    onChange={(e) => set(i, e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                    autoCorrect="off"
                    className={cn(
                      "h-9 w-32 rounded-none border-0 border-b-2 border-foreground/20 bg-transparent text-center shadow-none focus-visible:border-b-primary focus-visible:ring-0 focus-visible:ring-offset-0",
                      checked && (ok ? "border-b-primary text-primary" : "border-b-destructive text-destructive"),
                    )}
                    placeholder="…"
                  />
                ) : (
                  <span className={cn("min-w-20 border-b-2 border-solid border-foreground/20 px-2 text-center font-semibold", !given && "text-muted-foreground", checked && (ok ? "border-primary text-primary" : "border-destructive text-destructive"))}>{given || "___"}</span>
                )}

                <span>{after}</span>

                {checked && (
                  <span className="ml-auto flex items-center gap-2 text-xs">
                    {ok ? <Check className="h-4 w-4 text-primary" /> : <><X className="h-4 w-4 text-destructive" /><span className="font-medium text-primary">{it.answer}</span></>}
                  </span>
                )}
              </div>

              {mode === "select" && (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap" role="group" aria-label={`Варіанти відповіді до речення ${i + 1}`}>
                  {options.map((option) => (
                    <Button key={option} type="button" size="sm" variant={given === option ? "default" : "outline"} className="min-h-10 min-w-0 whitespace-normal px-3" disabled={readOnly || checked} onClick={() => set(i, option)} aria-pressed={given === option}>{option}</Button>
                  ))}
                </div>
              )}

              {it.hint && <p className="text-xs text-muted-foreground">💡 {it.hint}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
