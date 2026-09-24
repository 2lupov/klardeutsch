import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ARTIKEL_CLASS, type Artikel, type LessonBlock, type VocabWord } from "./types";
import { cn } from "@/lib/utils";

/** Текст із клікабельними словами: переклад, Plural, бейдж роду. */
export default function LesenBlock({ block }: { block: LessonBlock }) {
  const p = block.payload || {};
  const words = p.words ?? [];
  const text = p.text ?? "";

  const map = new Map<string, VocabWord>();
  words.forEach((w) => map.set(w.de.toLowerCase(), w));

  const tokens = text.split(/(\s+)/);

  return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}

      <p className="lesson-reading-text whitespace-pre-line text-[15px] leading-8">
        {tokens.map((tok, i) => {
          const bare = tok.replace(/[^\p{L}\p{N}ÄÖÜäöüß-]/gu, "");
          const hit = bare ? map.get(bare.toLowerCase()) : undefined;
          if (!hit) return <span key={i}>{tok}</span>;
          const art = (hit.artikel ?? undefined) as Artikel | undefined;
          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button
                  className={cn(
                    "rounded px-0.5 font-medium underline decoration-dotted decoration-2 underline-offset-4",
                    art ? ARTIKEL_CLASS[art].split(" ").filter((c) => c.startsWith("text-")).join(" ") : "text-primary",
                  )}
                >
                  {tok}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    {art && (
                      <span className={cn("rounded-md border px-2 py-0.5 text-xs font-semibold", ARTIKEL_CLASS[art])}>
                        {art === "plural" ? "Plural" : art}
                      </span>
                    )}
                    <span className="font-semibold">{hit.de}</span>
                  </div>
                  <p className="text-sm">{hit.uk}</p>
                  {hit.plural && <p className="text-xs text-muted-foreground">Plural: {hit.plural}</p>}
                </div>
              </PopoverContent>
            </Popover>
          );
        })}
      </p>

      {words.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {words.map((w, i) => {
            const art = (w.artikel ?? undefined) as Artikel | undefined;
            return (
              <span
                key={i}
                className={cn("rounded-lg border px-2 py-1 text-xs", art ? ARTIKEL_CLASS[art] : "bg-muted")}
              >
                {art && art !== "plural" ? `${art} ` : ""}
                {w.de} — {w.uk}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
