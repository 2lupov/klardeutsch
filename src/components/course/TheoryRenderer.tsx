import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

/**
 * TheoryRenderer renders theory content in a beautiful, structured way.
 * 
 * Supports two formats:
 * 1. Structured JSON blocks (array of TheoryBlock[])
 * 2. Markdown text (fallback)
 * 
 * JSON block types:
 * - "heading" — section heading
 * - "text" — plain paragraph  
 * - "rule" — highlighted rule card with emoji
 * - "table" — grammar table (conjugation/declension)
 * - "example" — example sentence with highlighted key words
 * - "comparison" — side-by-side DE↔RU/UK comparison
 * - "tip" — helpful tip or warning
 * - "list" — bullet list
 */

export interface TheoryBlock {
  type: "heading" | "text" | "rule" | "table" | "example" | "comparison" | "tip" | "list";
  // Common
  content?: string;
  title?: string;
  emoji?: string;
  // For table
  headers?: string[];
  rows?: string[][];
  // For example
  de?: string;
  ru?: string;
  uk?: string;
  highlight?: string[]; // words to highlight in de
  // For comparison
  items?: Array<{ de: string; ru?: string; uk?: string }>;
  // For list
  items_list?: string[];
  // For tip
  variant?: "info" | "warning" | "remember";
}

function parseTheory(theory: string): TheoryBlock[] | null {
  if (!theory.trim()) return null;
  try {
    const parsed = JSON.parse(theory);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].type) {
      return parsed as TheoryBlock[];
    }
  } catch {}
  return null;
}

function highlightWords(text: string, words: string[]): React.ReactNode {
  if (!words.length) return text;
  const regex = new RegExp(`(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => {
    const isHighlighted = words.some(w => w.toLowerCase() === part.toLowerCase());
    return isHighlighted
      ? <span key={i} className="font-bold text-primary">{part}</span>
      : part;
  });
}

const tipConfig = {
  info: { emoji: "💡", bg: "bg-primary/5", border: "border-primary/20", label: "Совет" },
  warning: { emoji: "⚠️", bg: "bg-destructive/5", border: "border-destructive/20", label: "Внимание" },
  remember: { emoji: "📝", bg: "bg-accent/5", border: "border-accent/20", label: "Запомни" },
};

function RenderBlock({ block, lang }: { block: TheoryBlock; lang: string }) {
  switch (block.type) {
    case "heading":
      return (
        <h3 className="font-display font-bold text-base text-foreground flex items-center gap-2 mt-2">
          {block.emoji && <span>{block.emoji}</span>}
          {block.content || block.title}
        </h3>
      );

    case "text":
      return (
        <p className="text-sm text-foreground/90 leading-relaxed">{block.content}</p>
      );

    case "rule":
      return (
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/15 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-lg">{block.emoji || "📌"}</span>
            <h4 className="font-display font-bold text-sm text-primary">{block.title}</h4>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed pl-7">{block.content}</p>
        </div>
      );

    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full text-xs">
            {block.headers && (
              <thead>
                <tr className="bg-primary/10">
                  {block.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left font-display font-bold text-primary text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows?.map((row, ri) => (
                <tr key={ri} className={cn("border-t border-border/20", ri % 2 === 0 ? "bg-secondary/30" : "bg-secondary/10")}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={cn("px-3 py-2 text-foreground/90", ci === 0 && "font-semibold")}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "example":
      return (
        <div className="p-3 rounded-xl bg-secondary/40 border border-border/20 space-y-1">
          <p className="text-sm font-medium text-foreground">
            💬 {block.highlight?.length ? highlightWords(block.de || block.content || "", block.highlight) : (block.de || block.content)}
          </p>
          {(block.ru || block.uk) && (
            <p className="text-xs text-muted-foreground pl-6">
              {lang === "uk" ? (block.uk || block.ru) : (block.ru || block.uk)}
            </p>
          )}
        </div>
      );

    case "comparison":
      return (
        <div className="space-y-1.5">
          {block.items?.map((item, i) => (
            <div key={i} className="flex gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/20">
              <span className="text-sm font-medium text-foreground flex-1">🇩🇪 {item.de}</span>
              <span className="text-sm text-muted-foreground flex-1">
                {lang === "uk" ? (item.uk || item.ru) : (item.ru || item.uk)}
              </span>
            </div>
          ))}
        </div>
      );

    case "tip": {
      const cfg = tipConfig[block.variant || "info"];
      return (
        <div className={cn("p-3 rounded-xl border space-y-1", cfg.bg, cfg.border)}>
          <div className="flex items-center gap-2">
            <span>{cfg.emoji}</span>
            <span className="font-display font-bold text-xs text-foreground">{block.title || cfg.label}</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed pl-6">{block.content}</p>
        </div>
      );
    }

    case "list":
      return (
        <ul className="space-y-1.5 pl-1">
          {block.items_list?.map((item, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground/90">
              <span className="text-primary mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );

    default:
      return <p className="text-sm text-foreground/80">{block.content}</p>;
  }
}

interface TheoryRendererProps {
  theory: string;
  lang?: string;
}

const TheoryRenderer = ({ theory, lang = "ru" }: TheoryRendererProps) => {
  const blocks = parseTheory(theory);

  if (blocks) {
    return (
      <div className="space-y-3">
        {blocks.map((block, i) => (
          <RenderBlock key={i} block={block} lang={lang} />
        ))}
      </div>
    );
  }

  // Fallback: render as markdown
  return (
    <div className="prose prose-invert prose-sm max-w-none [&_h1]:text-primary [&_h2]:text-primary [&_h3]:text-primary [&_strong]:text-foreground [&_li]:text-foreground/90 [&_table]:text-xs [&_th]:bg-primary/10 [&_th]:text-primary [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_td]:border-border/20 [&_tr:nth-child(even)]:bg-secondary/20">
      <ReactMarkdown>{theory}</ReactMarkdown>
    </div>
  );
};

export default TheoryRenderer;
export { parseTheory };
