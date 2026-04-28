import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Lightbulb, AlertCircle, BookMarked, Sparkles, Info } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  content: string;
}

/**
 * Beautiful renderer for AI-generated lesson theory.
 * Recognises special blockquote tags written by the AI:
 *   > 💡 Tipp:  ...   → yellow tip card
 *   > 📌 Regel: ...   → blue rule card
 *   > ⚠️ Achtung: ... → red warning card
 *   > 📖 Beispiel:... → green example card
 *   > ℹ️ Info: ...    → neutral info card
 * Plain blockquotes render as soft gray.
 */
const LessonTheoryRenderer = ({ content }: Props) => {
  if (!content?.trim()) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>Теория не добавлена</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="lesson-theory"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-display font-black mt-8 mb-4 pb-3 border-b-2 border-primary/20 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-display font-bold mt-8 mb-3 flex items-center gap-2 first:mt-0">
              <span className="w-1.5 h-7 bg-primary rounded-full" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-display font-bold mt-6 mb-2 text-primary">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-bold mt-4 mb-2 uppercase tracking-wide text-muted-foreground">
              {children}
            </h4>
          ),
          p: ({ children }) => {
            const example = detectExample(children);
            if (example) {
              return (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                  className="my-4 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-accent/[0.04] p-4 md:p-5 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                      <BookMarked className="w-4 h-4" />
                    </span>
                    <span className="font-display font-bold text-sm text-foreground">
                      {example.label}
                    </span>
                  </div>
                  <p className="text-foreground leading-relaxed font-medium text-[15px] mb-2">
                    {example.de}
                  </p>
                  {example.translation && (
                    <p className="text-muted-foreground italic text-sm leading-relaxed pl-3 border-l-2 border-primary/30">
                      {example.translation}
                    </p>
                  )}
                </motion.div>
              );
            }
            return <p className="leading-relaxed mb-4 text-foreground/90">{children}</p>;
          },
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic text-primary/90">{children}</em>,
          code: ({ children }) => (
            <code className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[0.9em] font-mono">
              {children}
            </code>
          ),
          ul: ({ children }) => <ul className="my-4 space-y-1.5 ml-1">{children}</ul>,
          ol: ({ children }) => (
            <ol className="my-4 space-y-1.5 ml-1 list-decimal list-inside">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="flex gap-2 leading-relaxed">
              <span className="text-primary font-bold mt-0.5">•</span>
              <span className="flex-1">{children}</span>
            </li>
          ),
          hr: () => <hr className="my-8 border-border" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              {children}
            </a>
          ),
          table: ({ children }) => (
            <div className="my-6 overflow-x-auto rounded-xl border border-border shadow-sm">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-primary/10 text-foreground">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-4 py-3 text-left font-bold border-b border-border">{children}</th>
          ),
          tr: ({ children }) => (
            <tr className="even:bg-muted/30 hover:bg-primary/5 transition-colors">{children}</tr>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 border-b border-border/50 align-top">{children}</td>
          ),
          blockquote: ({ children }) => {
            // Try to detect callout style from first text token
            const text = extractText(children);
            const callout = detectCallout(text);
            const Icon = callout.icon;
            return (
              <div
                className={`my-5 rounded-2xl border-l-4 px-5 py-4 flex gap-3 ${callout.classes}`}
              >
                <Icon className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1 [&>p]:m-0 [&>p+p]:mt-2 leading-relaxed">
                  {callout.label && (
                    <div className="font-bold text-sm uppercase tracking-wide mb-1">
                      {callout.label}
                    </div>
                  )}
                  {children}
                </div>
              </div>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </motion.div>
  );
};

/* ---------- helpers ---------- */
function extractText(node: any): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (node?.props?.children) return extractText(node.props.children);
  return "";
}

/**
 * Detect a "labeled example" paragraph like:
 *   **Личное письмо:** Liebe Sara, danke für ... (Дорогая Сара, спасибо ...)
 * Returns label + German part + translation in parentheses.
 */
function detectExample(children: any): { label: string; de: string; translation: string } | null {
  const text = extractText(children).trim();
  if (!text) return null;
  // Must start with a bold label ending in ":" and have at least ~25 chars after
  const m = text.match(/^([^:\n]{2,40}):\s+(.+)$/s);
  if (!m) return null;
  const label = m[1].trim();
  let rest = m[2].trim();
  // Heuristic: skip if too short, or label looks like a sentence
  if (rest.length < 25 || label.split(/\s+/).length > 5) return null;
  // Extract trailing translation in parentheses
  let translation = "";
  let de = rest;
  const lastOpen = rest.lastIndexOf("(");
  const lastClose = rest.lastIndexOf(")");
  if (lastOpen > 10 && lastClose === rest.length - 1) {
    translation = rest.slice(lastOpen + 1, lastClose).trim();
    de = rest.slice(0, lastOpen).trim();
  }
  // Require the example to actually look like a sentence (has a space)
  if (!de.includes(" ")) return null;
  return { label, de, translation };
}


function detectCallout(text: string) {
  const lower = text.trim().toLowerCase();
  if (lower.startsWith("💡") || lower.startsWith("tipp") || lower.startsWith("совет") || lower.startsWith("порада")) {
    return {
      icon: Lightbulb,
      label: "Tipp",
      classes:
        "bg-yellow-500/5 border-yellow-500 text-yellow-900 dark:text-yellow-200 [&_strong]:text-yellow-900 dark:[&_strong]:text-yellow-100",
    };
  }
  if (lower.startsWith("📌") || lower.startsWith("regel") || lower.startsWith("правило")) {
    return {
      icon: BookMarked,
      label: "Regel",
      classes:
        "bg-blue-500/5 border-blue-500 text-blue-900 dark:text-blue-200 [&_strong]:text-blue-900 dark:[&_strong]:text-blue-100",
    };
  }
  if (lower.startsWith("⚠️") || lower.startsWith("achtung") || lower.startsWith("внимание") || lower.startsWith("увага")) {
    return {
      icon: AlertCircle,
      label: "Achtung",
      classes:
        "bg-red-500/5 border-red-500 text-red-900 dark:text-red-200 [&_strong]:text-red-900 dark:[&_strong]:text-red-100",
    };
  }
  if (lower.startsWith("📖") || lower.startsWith("beispiel") || lower.startsWith("пример") || lower.startsWith("приклад")) {
    return {
      icon: Sparkles,
      label: "Beispiel",
      classes:
        "bg-green-500/5 border-green-500 text-green-900 dark:text-green-200 [&_strong]:text-green-900 dark:[&_strong]:text-green-100",
    };
  }
  if (lower.startsWith("ℹ️") || lower.startsWith("info") || lower.startsWith("инфо") || lower.startsWith("інфо")) {
    return {
      icon: Info,
      label: "Info",
      classes: "bg-primary/5 border-primary text-foreground",
    };
  }
  return {
    icon: Info,
    label: "",
    classes: "bg-muted/40 border-muted-foreground/40 text-foreground",
  };
}

export default LessonTheoryRenderer;
