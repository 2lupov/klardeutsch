import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import translations, { TranslationKey } from "@/i18n/translations";
import { Check, X, Pencil, Globe } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

/**
 * When edit mode is active, this component:
 * 1. Shows a floating toolbar
 * 2. Intercepts clicks on text, finds matching translation key
 * 3. Opens inline editor popup
 */
const EditModeToolbar = () => {
  const { editMode, setEditMode, lang, t, saveOverride, overrides } = useLanguage();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<{ key: string; value: string; rect: DOMRect } | null>(null);
  const [inputValue, setInputValue] = useState("");

  // Build reverse lookup: text → key
  const reverseLookup = useCallback(() => {
    const map = new Map<string, string>();
    const keys = Object.keys(translations) as TranslationKey[];
    for (const key of keys) {
      // Current displayed value (with overrides)
      const val = t(key);
      if (val && val !== key) {
        map.set(val, key);
      }
      // Also map the default value
      const def = (translations as any)[key]?.[lang];
      if (def) map.set(def, key);
    }
    return map;
  }, [lang, t]);

  useEffect(() => {
    if (!editMode) return;

    const handleClick = (e: MouseEvent) => {
      // Ignore clicks on the toolbar itself
      const toolbar = document.getElementById("edit-mode-toolbar");
      const popup = document.getElementById("edit-mode-popup");
      if (toolbar?.contains(e.target as Node) || popup?.contains(e.target as Node)) return;

      e.preventDefault();
      e.stopPropagation();

      const target = e.target as HTMLElement;
      const text = target.textContent?.trim();
      if (!text) return;

      const lookup = reverseLookup();

      // Try exact match first
      let matchKey = lookup.get(text);

      // Try partial — find the longest matching value in the text
      if (!matchKey) {
        let bestLen = 0;
        for (const [val, key] of lookup.entries()) {
          if (text.includes(val) && val.length > bestLen) {
            matchKey = key;
            bestLen = val.length;
          }
        }
      }

      if (matchKey) {
        const rect = target.getBoundingClientRect();
        const currentVal = t(matchKey as TranslationKey);
        setEditing({ key: matchKey, value: currentVal, rect });
        setInputValue(currentVal);
      }
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [editMode, reverseLookup, t]);

  const handleSave = async () => {
    if (!editing) return;
    await saveOverride(editing.key, lang, inputValue);
    toast.success("Сохранено!");
    setEditing(null);
  };

  const handleCancel = () => {
    setEditing(null);
  };

  if (!editMode) return null;

  return (
    <>
      {/* Floating toolbar */}
      <div
        id="edit-mode-toolbar"
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 px-4 py-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/50 shadow-lg"
      >
        <Pencil className="w-4 h-4 text-primary" />
        <span className="text-sm font-display font-semibold text-foreground">
          Режим редактирования
        </span>
        <span className="text-[10px] text-muted-foreground">({lang.toUpperCase()})</span>
        <LanguageSwitcher />
        <button
          onClick={() => {
            setEditMode(false);
            setEditing(null);
            navigate("/admin");
          }}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-colors"
        >
          <X className="w-3 h-3" />
          Выйти
        </button>
      </div>

      {/* Edit popup */}
      {editing && (
        <div
          id="edit-mode-popup"
          className="fixed z-[10000] flex flex-col gap-2 p-3 rounded-xl bg-card border border-primary/50 shadow-2xl min-w-[280px] max-w-[400px]"
          style={{
            top: Math.min(editing.rect.bottom + 8, window.innerHeight - 140),
            left: Math.max(8, Math.min(editing.rect.left, window.innerWidth - 420)),
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted-foreground">{editing.key}</span>
            <button onClick={handleCancel} className="p-0.5 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            autoFocus
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") handleCancel();
            }}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium"
            >
              <Check className="w-3 h-3" /> Сохранить
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-xs font-medium hover:text-foreground"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Subtle overlay hint */}
      <style>{`
        body.edit-mode * {
          cursor: crosshair !important;
        }
      `}</style>
      {editMode && <SetBodyClass />}
    </>
  );
};

const SetBodyClass = () => {
  useEffect(() => {
    document.body.classList.add("edit-mode");
    return () => document.body.classList.remove("edit-mode");
  }, []);
  return null;
};

export default EditModeToolbar;
