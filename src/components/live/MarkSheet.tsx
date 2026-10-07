import { useEffect, useRef } from "react";
import { Highlighter, Underline, Bold, Strikethrough, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HIGHLIGHT_COLORS, SHEET_STYLE, applyRemoteHtml } from "@/lib/rich-text";
import { cn } from "@/lib/utils";

/**
 * Аркуш у лінійку з позначками (жовтий маркер, підкреслення, жирний, закреслення).
 * Використовується і в живому уроці, і в кабінеті учня.
 */
export default function MarkSheet({
  value,
  onChange,
  register,
  placeholder,
  className,
  sheetClassName,
  readOnly,
  highlightOnly,
  noLines,
  toolbarExtra,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Дає батькові функцію, якою можна перезаписати вміст (при змінах з іншої сторони). */
  register?: (setHtml: (html: string) => void) => void;
  placeholder?: string;
  className?: string;
  sheetClassName?: string;
  readOnly?: boolean;
  /** Текст не редагується — доступні лише жовтий маркер і гумка. */
  highlightOnly?: boolean;
  /** Без «зошитових» лінійок — чистий аркуш. */
  noLines?: boolean;
  toolbarExtra?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const lastEdit = useRef(0);

  useEffect(() => {
    // чужі зміни не перезаписують поле, поки людина друкує; курсор зберігається
    register?.((html) => { applyRemoteHtml(ref.current, html, lastEdit.current); });
  }, [register]);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    if (ref.current && value && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value;
    }
  }, [value]);

  const fromEditor = () => { lastEdit.current = Date.now(); onChange(ref.current?.innerHTML ?? ""); };
  const format = (cmd: string, v?: string) => {
    ref.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, v);
    fromEditor();
  };

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card", className)}>
      {!readOnly && (
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-border bg-muted/30 px-3">
          <div className="flex items-center gap-0.5 rounded-lg border border-border bg-background/60 p-0.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <Button key={c.hex} animated={false} size="icon" variant="ghost" className="h-6 w-6 rounded-md"
                onMouseDown={(e) => e.preventDefault()} onClick={() => format("hiliteColor", c.hex)} title={c.name}>
                <span className="size-4 rounded-full ring-1 ring-inset ring-black/10" style={{ background: c.hex }} />
              </Button>
            ))}
          </div>
          {!highlightOnly && (
            <>
              <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => format("underline")} title="Підкреслити"><Underline /></Button>
              <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => format("bold")} title="Жирний"><Bold /></Button>
              <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => format("strikeThrough")} title="Закреслити"><Strikethrough /></Button>
            </>
          )}
          <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()}
            onClick={() => { format("removeFormat"); format("hiliteColor", "transparent"); }} title="Прибрати позначки"><Eraser /></Button>
          {toolbarExtra ? <div className="ml-auto flex items-center gap-1.5">{toolbarExtra}</div> : null}
        </div>
      )}
      <div
        ref={ref}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        spellCheck={false}
        onInput={fromEditor}
        onBeforeInput={highlightOnly ? (e) => e.preventDefault() : undefined}
        onPaste={highlightOnly ? (e) => e.preventDefault() : undefined}
        onKeyDown={highlightOnly ? (e) => { if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete" || e.key === "Enter") e.preventDefault(); } : undefined}
        data-placeholder={placeholder}
        className={cn(
          "live-writing-sheet min-h-0 flex-1 overflow-y-auto px-6 py-4 font-display text-lg leading-8 text-foreground outline-none",
          sheetClassName,
        )}
        style={noLines ? undefined : SHEET_STYLE}
      />
    </section>
  );
}
