import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { TranslationKey } from "@/i18n/translations";
import { Check, X } from "lucide-react";

interface Props {
  tKey: TranslationKey;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
}

/**
 * Renders translated text. In edit mode, clicking opens an inline editor.
 * Usage: <T tKey="loginTitle" as="h1" className="text-xl font-bold" />
 */
const T = ({ tKey, as: Tag = "span", className }: Props) => {
  const { t, editMode, lang, saveOverride } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const text = t(tKey);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleClick = (e: React.MouseEvent) => {
    if (!editMode) return;
    e.preventDefault();
    e.stopPropagation();
    setValue(text);
    setEditing(true);
  };

  const handleSave = async () => {
    await saveOverride(tKey, lang, value);
    setEditing(false);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleCancel}
          className="px-2 py-0.5 rounded bg-primary/10 border border-primary/50 text-foreground text-sm focus:outline-none min-w-[100px]"
          style={{ fontSize: "inherit" }}
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); handleSave(); }}
          className="p-0.5 rounded bg-primary text-primary-foreground"
        >
          <Check className="w-3 h-3" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); handleCancel(); }}
          className="p-0.5 rounded bg-muted text-muted-foreground"
        >
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return (
    <Tag
      className={`${className ?? ""} ${editMode ? "outline-dashed outline-1 outline-primary/30 cursor-pointer hover:outline-primary/60 hover:bg-primary/5 rounded px-0.5 transition-all" : ""}`}
      onClick={handleClick}
    >
      {text}
    </Tag>
  );
};

export default T;
