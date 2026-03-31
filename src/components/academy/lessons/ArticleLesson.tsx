import { useState, useEffect, useRef, useCallback } from "react";
import { CheckCircle2, Volume2, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { Lang } from "@/i18n/translations";

interface Block {
  type: "heading" | "paragraph" | "highlight" | "example" | "table" | "tip" | "divider";
  text?: string;
  color?: string;
  de?: string;
  ru?: string;
  audio?: boolean;
  headers?: string[];
  rows?: string[][];
}

interface Props {
  lesson: { id: string; title: string; description: string | null; content: any };
  onComplete: () => void;
  lang: Lang;
}

const ArticleLesson = ({ lesson, onComplete, lang }: Props) => {
  const content = lesson.content as { blocks?: Block[] } | null;
  const blocks = content?.blocks ?? [];
  const [readProgress, setReadProgress] = useState(0);
  const [completed, setCompleted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estimate reading time (~200 words/min)
  const totalWords = blocks.reduce((acc, b) => acc + ((b.text || b.de || "").split(/\s+/).length), 0);
  const readMinutes = Math.max(1, Math.round(totalWords / 200));

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const parent = el.closest(".overflow-y-auto");
    if (!parent) return;
    const rect = el.getBoundingClientRect();
    const parentRect = parent.getBoundingClientRect();
    const scrolled = parentRect.bottom - rect.top;
    const total = el.offsetHeight;
    const pct = Math.min(100, Math.max(0, Math.round((scrolled / total) * 100)));
    setReadProgress(pct);
  }, []);

  useEffect(() => {
    const parent = containerRef.current?.closest(".overflow-y-auto");
    if (parent) {
      parent.addEventListener("scroll", handleScroll, { passive: true });
      return () => parent.removeEventListener("scroll", handleScroll);
    }
  }, [handleScroll]);

  const renderBlock = (block: Block, i: number) => {
    switch (block.type) {
      case "heading":
        return <h3 key={i} className="font-display text-lg font-bold text-foreground mt-6 mb-2">{block.text}</h3>;
      case "paragraph":
        return <p key={i} className="text-sm text-foreground/90 leading-[1.8]">{block.text}</p>;
      case "highlight":
        return (
          <div key={i} className="border-l-4 border-primary/60 pl-4 py-2 my-3 bg-primary/5 rounded-r-lg">
            <p className="text-sm font-semibold text-foreground">{block.text}</p>
          </div>
        );
      case "example":
        return (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card/40 my-2">
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{block.de}</p>
              <p className="text-xs text-muted-foreground">{block.ru}</p>
            </div>
            {block.audio && (
              <button className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
                <Volume2 className="w-4 h-4 text-primary" />
              </button>
            )}
          </div>
        );
      case "table":
        return (
          <div key={i} className="rounded-xl border border-border/30 bg-card/30 backdrop-blur-sm overflow-hidden my-3">
            <table className="w-full text-xs">
              {block.headers && (
                <thead>
                  <tr className="bg-primary/10">
                    {block.headers.map((h, j) => (
                      <th key={j} className="px-3 py-2 text-left font-display font-bold text-primary">{h}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {block.rows?.map((row, ri) => (
                  <tr key={ri} className="border-t border-border/20">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-foreground/80">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "tip":
        return (
          <div key={i} className="flex items-start gap-2 p-3 rounded-xl border border-accent/30 bg-accent/5 my-3">
            <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/80">{block.text}</p>
          </div>
        );
      case "divider":
        return <hr key={i} className="border-border/20 my-4" />;
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Reading progress bar */}
      <Progress value={readProgress} className="h-1.5 sticky top-0 z-10" />

      {/* Header */}
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          ~{readMinutes} {lang === "uk" ? "хв читання" : "мин чтения"}
        </p>
      </div>

      {/* Blocks */}
      <div className="space-y-1">
        {blocks.map((block, i) => renderBlock(block, i))}
      </div>

      {/* Complete button */}
      <div className="flex justify-center pt-6">
        {completed ? (
          <div className="flex items-center gap-2 text-primary text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            {lang === "uk" ? "Статтю прочитано" : "Статья прочитана"}
          </div>
        ) : (
          <Button
            onClick={() => { setCompleted(true); onComplete(); }}
            disabled={readProgress < 80}
            className="font-display font-bold"
            size="lg"
          >
            {readProgress < 80
              ? `${lang === "uk" ? "Прокрутіть далі" : "Прокрутите дальше"} (${readProgress}%)`
              : lang === "uk" ? "Урок прочитано ✓" : "Урок прочитан ✓"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default ArticleLesson;
