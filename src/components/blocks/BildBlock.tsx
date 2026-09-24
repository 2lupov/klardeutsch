import { useEffect, useMemo, useState } from "react";
import { Check, Eye, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ARTIKEL_CLASS, isCorrectText, type Artikel, type LessonBlock, type PictureItem } from "./types";

interface Props {
  block: LessonBlock;
  value: Record<number, { word?: string; artikel?: Artikel | null }>;
  onChange: (v: Props["value"]) => void;
  checked: boolean;
  readOnly?: boolean;
}

const ARTIKEL: Artikel[] = ["der", "die", "das", "plural"];

/** Учень дивиться на картинку і вгадує слово (з артиклем, вибором або вводом). */
export default function BildBlock({ block, value, onChange, checked, readOnly }: Props) {
  const p = block.payload || {};
  const items = p.picture_items ?? [];
  const mode = p.bild_mode ?? "artikel";
  const set = (i: number, patch: { word?: string; artikel?: Artikel | null }) =>
    onChange({ ...(value ?? {}), [i]: { ...(value?.[i] ?? {}), ...patch } });

  return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item, i) => (
          <PictureCard
            key={i}
            item={item}
            index={i}
            mode={mode}
            blockId={block.id}
            given={value?.[i] ?? {}}
            checked={checked}
            readOnly={readOnly}
            onSet={(patch) => set(i, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function PictureCard({
  item,
  index,
  mode,
  blockId,
  given,
  checked,
  readOnly,
  onSet,
}: {
  item: PictureItem;
  index: number;
  mode: "artikel" | "choice" | "input";
  blockId: string;
  given: { word?: string; artikel?: Artikel | null };
  checked: boolean;
  readOnly?: boolean;
  onSet: (patch: { word?: string; artikel?: Artikel | null }) => void;
}) {
  const url = useImageUrl(item.image);
  const [hint, setHint] = useState(false);
  const wordOk = isCorrectText(given.word, item.word);
  const artikelOk = given.artikel === (item.artikel ?? null);
  const ok = mode === "artikel" ? wordOk && artikelOk : wordOk;

  const choices = useMemo(() => {
    const pool = [item.word, ...(item.options ?? [])].filter(Boolean);
    let seed = blockId.split("").reduce((a, c) => a + c.charCodeAt(0), index + 11);
    const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    const out = [...new Set(pool)];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }, [item.word, item.options, blockId, index]);

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border bg-card p-3",
        checked && (ok ? "border-emerald-500" : "border-destructive"),
      )}
    >
      {url ? (
        <img src={url} alt={`Картинка ${index + 1}`} loading="lazy" className="h-40 w-full rounded-xl object-cover" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">
          Картинку ще не додано
        </div>
      )}

      {mode === "artikel" && (
        <div className="flex flex-wrap gap-1.5">
          {ARTIKEL.map((a) => (
            <button
              key={a}
              disabled={readOnly}
              onClick={() => onSet({ artikel: a })}
              className={cn(
                "rounded-lg border px-2.5 py-1 text-xs font-semibold transition",
                given.artikel === a ? ARTIKEL_CLASS[a] : "text-muted-foreground hover:bg-muted",
              )}
            >
              {a === "plural" ? "die (Pl.)" : a}
            </button>
          ))}
        </div>
      )}

      {mode === "choice" ? (
        <div className="grid gap-1.5">
          {choices.map((c) => (
            <button
              key={c}
              disabled={readOnly}
              onClick={() => onSet({ word: c })}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-left text-sm",
                given.word === c && "border-primary bg-primary/10 font-semibold",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      ) : (
        <Input
          value={given.word ?? ""}
          disabled={readOnly}
          placeholder="Wie heißt das?"
          onChange={(e) => onSet({ word: e.target.value })}
          className={cn(checked && (ok ? "border-emerald-500" : "border-destructive"))}
        />
      )}

      <div className="flex items-center justify-between gap-2 text-xs">
        {item.uk && !readOnly ? (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setHint((v) => !v)}>
            <Eye className="mr-1 h-3.5 w-3.5" />
            {hint ? item.uk : "Підказка"}
          </Button>
        ) : (
          <span />
        )}
        {checked && (
          <span className="flex items-center gap-1">
            {ok ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <>
                <X className="h-4 w-4 text-destructive" />
                <span className="font-medium text-emerald-700 dark:text-emerald-300">
                  {item.artikel && item.artikel !== "plural" ? `${item.artikel} ` : ""}
                  {item.word}
                </span>
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}

/** Картинка може бути посиланням або файлом у сховищі уроків. */
export function useImageUrl(path: string | undefined) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const value = path ?? "";
    if (!value || /^(https?:|data:|blob:|\/)/.test(value)) {
      setUrl(value);
      return;
    }
    let mounted = true;
    supabase.storage
      .from("tutoring-materials")
      .createSignedUrl(value, 3600)
      .then(({ data }) => {
        if (mounted) setUrl(data?.signedUrl ?? "");
      });
    return () => {
      mounted = false;
    };
  }, [path]);
  return url;
}
