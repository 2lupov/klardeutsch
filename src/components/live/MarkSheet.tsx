import { useEffect, useRef } from "react";
import { Highlighter, Underline, Bold, Strikethrough, Eraser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HIGHLIGHT, SHEET_STYLE } from "@/lib/rich-text";
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
  toolbarExtra?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    register?.((html) => {
      if (ref.current && ref.current.innerHTML !== html) ref.current.innerHTML = html;
    });
  }, [register]);

  useEffect(() => {
    if (mounted.current) return;
    if (ref.current && value) {
      ref.current.innerHTML = value;
      mounted.current = true;
    }
  }, [value]);

  const fromEditor = () => onChange(ref.current?.innerHTML ?? "");
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
          <Button animated={false} size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs"
            onMouseDown={(e) => e.preventDefault()} onClick={() => format("hiliteColor", HIGHLIGHT)} title="Виділити жовтим">
            <span className="grid size-5 place-items-center rounded" style={{ background: HIGHLIGHT }}>
              <Highlighter className="h-3.5 w-3.5 text-slate-900" />
            </span>
            Жовтим
          </Button>
          <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => format("underline")} title="Підкреслити"><Underline /></Button>
          <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => format("bold")} title="Жирний"><Bold /></Button>
          <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => format("strikeThrough")} title="Закреслити"><Strikethrough /></Button>
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
        data-placeholder={placeholder}
        className={cn(
          "live-writing-sheet min-h-0 flex-1 overflow-y-auto px-6 py-4 font-display text-lg leading-8 text-foreground outline-none",
          sheetClassName,
        )}
        style={SHEET_STYLE}
      />
    </section>
  );
}
