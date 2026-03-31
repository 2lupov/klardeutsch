import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, CheckCircle2 } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { fetchEdgeFunction } from "@/lib/auth-fetch";

interface Block {
  type: "heading" | "paragraph" | "highlight" | "example" | "table" | "tip";
  text?: string;
  de?: string;
  ru?: string;
  headers?: string[];
  rows?: string[][];
}

interface Props {
  blocks: Block[];
  lang: Lang;
  onTheoryComplete?: () => void;
}

const TheoryBlock = ({ blocks, lang, onTheoryComplete }: Props) => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const wordCount = blocks.reduce((acc, b) => {
    const text = b.text || b.de || b.ru || "";
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    if (scrollable <= 0) { setReachedEnd(true); setScrollProgress(100); return; }
    const pct = Math.min(100, (el.scrollTop / scrollable) * 100);
    setScrollProgress(pct);
    if (pct >= 95) setReachedEnd(true);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    // Check if content fits without scroll
    if (el.scrollHeight <= el.clientHeight) {
      setReachedEnd(true);
      setScrollProgress(100);
    }
  }, [blocks]);

  const playTTS = async (text: string, idx: number) => {
    if (playingIdx !== null) return;
    setPlayingIdx(idx);
    try {
      const res = await fetchEdgeFunction("elevenlabs-tts", {
        json: { text, voiceId: "JBFqnCBsd6RMkjVDRZzb" },
      });
      if (!res.ok) throw new Error("TTS failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setPlayingIdx(null); URL.revokeObjectURL(url); };
      await audio.play();
    } catch {
      setPlayingIdx(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="h-0.5 w-full bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-200"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        📖 ~{readTime} {lang === "uk" ? "хв читання" : "мин чтения"}
      </p>

      {/* Blocks */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="space-y-4 max-h-[60vh] overflow-y-auto pr-1"
      >
        {blocks.map((block, i) => {
          switch (block.type) {
            case "heading":
              return (
                <h2 key={i} className="font-display text-lg font-bold text-primary mt-2">
                  {block.text}
                </h2>
              );
            case "paragraph":
              return (
                <p key={i} className="text-sm text-foreground/90 leading-[1.8]">
                  {block.text}
                </p>
              );
            case "highlight":
              return (
                <div key={i} className="border-l-4 border-primary bg-primary/5 p-4 rounded-r-xl">
                  <p className="text-sm text-foreground font-medium">{block.text}</p>
                </div>
              );
            case "example":
              return (
                <div key={i} className="p-3.5 rounded-xl bg-secondary/40 border border-border/20 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground flex-1">🇩🇪 {block.de}</p>
                    {block.de && (
                      <button
                        onClick={() => playTTS(block.de!, i)}
                        disabled={playingIdx !== null}
                        className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                      >
                        <Volume2 className={`w-3.5 h-3.5 ${playingIdx === i ? "text-primary animate-pulse" : ""}`} />
                      </button>
                    )}
                  </div>
                  {block.ru && (
                    <p className="text-xs text-muted-foreground pl-6">{block.ru}</p>
                  )}
                </div>
              );
            case "table":
              return (
                <div key={i} className="overflow-x-auto rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm">
                  <table className="w-full text-xs">
                    {block.headers && (
                      <thead>
                        <tr className="bg-primary/10">
                          {block.headers.map((h, hi) => (
                            <th key={hi} className="px-3 py-2 text-left font-display font-bold text-primary text-[11px]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {block.rows?.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 0 ? "bg-secondary/30" : "bg-secondary/10"}>
                          {row.map((cell, ci) => (
                            <td key={ci} className={`px-3 py-2 text-foreground/90 ${ci === 0 ? "font-semibold" : ""}`}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            case "tip":
              return (
                <div key={i} className="p-3 rounded-xl bg-accent/5 border border-accent/20 space-y-1">
                  <p className="text-sm text-foreground/90">{block.text}</p>
                </div>
              );
            default:
              return <p key={i} className="text-sm text-foreground/80">{block.text}</p>;
          }
        })}
      </div>

      {/* Complete button */}
      {onTheoryComplete && (
        <div className="flex justify-center pt-2">
          <Button
            onClick={onTheoryComplete}
            disabled={!reachedEnd}
            className="font-display font-bold"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {lang === "uk" ? "Теорію вивчив ✓" : "Теорию изучил ✓"}
          </Button>
          {!reachedEnd && (
            <p className="text-[10px] text-muted-foreground ml-3 self-center">
              {lang === "uk" ? "Прокрути до кінця" : "Прокрути до конца"}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TheoryBlock;
