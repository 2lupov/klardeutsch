import { useRef } from "react";
import { Eraser, Highlighter } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  ARTIKEL_CLASS,
  HIGHLIGHT_COLORS,
  HIGHLIGHT_META,
  type Artikel,
  type HighlightColor,
  type LessonBlock,
  type TextHighlight,
  type VocabWord,
} from "./types";
import { cn } from "@/lib/utils";

interface Props {
  block: LessonBlock;
  value?: any;
  onChange?: (v: any) => void;
  readOnly?: boolean;
}

/** Поділ тексту на частини по межах слів і виділень. */
function segments(text: string, highlights: TextHighlight[]) {
  const points = new Set<number>([0, text.length]);
  highlights.forEach((h) => {
    points.add(Math.max(0, Math.min(text.length, h.start)));
    points.add(Math.max(0, Math.min(text.length, h.end)));
  });
  let cursor = 0;
  const tokens: { start: number; end: number }[] = [];
  text.split(/(\s+)/).forEach((tok) => {
    if (!tok) return;
    tokens.push({ start: cursor, end: cursor + tok.length });
    cursor += tok.length;
  });
  const out: { start: number; end: number; tokenStart: number; tokenEnd: number }[] = [];
  tokens.forEach((tok) => {
    const cuts = [...points].filter((p) => p > tok.start && p < tok.end).sort((a, b) => a - b);
    let from = tok.start;
    [...cuts, tok.end].forEach((to) => {
      out.push({ start: from, end: to, tokenStart: tok.start, tokenEnd: tok.end });
      from = to;
    });
  });
  return out;
}

/** Нормалізує список виділень: обрізає перетини, зливає сусідні одного кольору. */
function normalize(list: TextHighlight[]) {
  const sorted = [...list].filter((h) => h.end > h.start).sort((a, b) => a.start - b.start);
  const out: TextHighlight[] = [];
  sorted.forEach((h) => {
    const prev = out[out.length - 1];
    if (prev && prev.color === h.color && h.start <= prev.end) {
      prev.end = Math.max(prev.end, h.end);
      return;
    }
    out.push({ ...h });
  });
  return out;
}

/** Текст із клікабельними словами й маркером для граматичного аналізу. */
export default function LesenBlock({ block, value, onChange, readOnly }: Props) {
  const p = block.payload || {};
  const words = p.words ?? [];
  const text = p.text ?? "";
  const containerRef = useRef<HTMLParagraphElement>(null);
  const toolRef = useRef<HighlightColor | "eraser">("yellow");

  const palette = (p.highlight_colors?.length ? p.highlight_colors : HIGHLIGHT_COLORS).filter((c) =>
    HIGHLIGHT_COLORS.includes(c),
  ) as HighlightColor[];
  const marking = !!p.enable_highlight && !!onChange && !readOnly;
  const highlights = normalize(((value?.highlights ?? []) as TextHighlight[]) || []);
  const activeTool = (value?.tool as HighlightColor | "eraser" | undefined) ?? palette[0] ?? "yellow";
  toolRef.current = activeTool;

  const setTool = (tool: HighlightColor | "eraser") => onChange?.({ ...(value ?? {}), tool });
  const commit = (next: TextHighlight[]) =>
    onChange?.({ ...(value ?? {}), highlights: normalize(next).map((h) => ({ ...h, text: text.slice(h.start, h.end) })) });

  /** Видаляє/обрізає виділення у діапазоні. */
  const cut = (list: TextHighlight[], start: number, end: number) => {
    const out: TextHighlight[] = [];
    list.forEach((h) => {
      if (h.end <= start || h.start >= end) { out.push(h); return; }
      if (h.start < start) out.push({ ...h, end: start });
      if (h.end > end) out.push({ ...h, start: end });
    });
    return out;
  };

  const offsetOf = (node: Node | null, offset: number) => {
    const el = (node?.nodeType === 3 ? node.parentElement : (node as HTMLElement | null)) ?? null;
    const holder = el?.closest<HTMLElement>("[data-off]");
    if (!holder) return null;
    return Number(holder.dataset.off) + offset;
  };

  const applySelection = () => {
    if (!marking) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;
    if (!containerRef.current.contains(sel.anchorNode) || !containerRef.current.contains(sel.focusNode)) return;
    const a = offsetOf(sel.anchorNode, sel.anchorOffset);
    const b = offsetOf(sel.focusNode, sel.focusOffset);
    if (a === null || b === null) return;
    const start = Math.min(a, b);
    const end = Math.max(a, b);
    if (end <= start) return;
    const tool = toolRef.current;
    const cleaned = cut(highlights, start, end);
    commit(tool === "eraser" ? cleaned : [...cleaned, { start, end, color: tool }]);
    sel.removeAllRanges();
  };

  const map = new Map<string, VocabWord>();
  words.forEach((w) => map.set(w.de.toLowerCase(), w));
  const pieces = segments(text, highlights);

  return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}

      {p.enable_highlight && (
        <div className="space-y-2 rounded-2xl border border-border bg-muted/40 p-3">
          {p.highlight_instructions && (
            <p className="flex items-start gap-2 text-sm font-medium">
              <Highlighter className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {p.highlight_instructions}
            </p>
          )}
          {marking && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Маркер:</span>
              {palette.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={HIGHLIGHT_META[color].label}
                  aria-pressed={activeTool === color}
                  onClick={() => setTool(color)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition",
                    HIGHLIGHT_META[color].className,
                    activeTool === color ? "border-primary ring-2 ring-primary/40" : "border-border",
                  )}
                />
              ))}
              <Button
                type="button"
                size="sm"
                variant={activeTool === "eraser" ? "default" : "outline"}
                onClick={() => setTool("eraser")}
              >
                <Eraser className="mr-1 h-4 w-4" />Гумка
              </Button>
              {highlights.length > 0 && (
                <Button type="button" size="sm" variant="ghost" onClick={() => commit([])}>Очистити все</Button>
              )}
            </div>
          )}
          {marking && (
            <p className="text-[11px] text-muted-foreground">
              Виділіть слово або фразу — вона підфарбується вибраним кольором. Клік на підсвіченому слові знімає колір.
            </p>
          )}
        </div>
      )}

      <p
        ref={containerRef}
        onMouseUp={applySelection}
        onTouchEnd={applySelection}
        className="lesson-reading-text whitespace-pre-line text-[15px] leading-8"
      >
        {pieces.map((piece, i) => {
          const chunk = text.slice(piece.start, piece.end);
          const hl = highlights.find((h) => h.start <= piece.start && h.end >= piece.end);
          const whole = piece.start === piece.tokenStart && piece.end === piece.tokenEnd;
          const bare = whole ? chunk.replace(/[^\p{L}\p{N}ÄÖÜäöüß-]/gu, "") : "";
          const hit = bare ? map.get(bare.toLowerCase()) : undefined;
          const hlClass = hl ? cn(HIGHLIGHT_META[hl.color].className, "rounded px-0.5", marking && "cursor-pointer") : undefined;
          const clearOne = hl && marking ? () => commit(cut(highlights, hl.start, hl.end)) : undefined;

          if (!hit) {
            return (
              <span key={i} data-off={piece.start} className={hlClass} onClick={clearOne}>
                {chunk}
              </span>
            );
          }
          const art = (hit.artikel ?? undefined) as Artikel | undefined;
          return (
            <Popover key={i}>
              <PopoverTrigger asChild>
                <button
                  data-off={piece.start}
                  onClick={clearOne}
                  className={cn(
                    "rounded px-0.5 font-medium underline decoration-dotted decoration-2 underline-offset-4",
                    hlClass,
                    !hl && (art ? ARTIKEL_CLASS[art].split(" ").filter((c) => c.startsWith("text-")).join(" ") : "text-primary"),
                  )}
                >
                  {chunk}
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
