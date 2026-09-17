import { motion } from "framer-motion";
import { Keyboard, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const KEYS = ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"];

/** Вставляє символ у поле, яке зараз у фокусі. */
function insertIntoFocused(ch: string) {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return false;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? el.value.length;
  const next = el.value.slice(0, start) + ch + el.value.slice(end);
  const setter = Object.getOwnPropertyDescriptor(
    el.tagName === "INPUT" ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype,
    "value",
  )?.set;
  setter?.call(el, next);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(start + ch.length, start + ch.length);
  });
  return true;
}

/** Плаваюча міні-клавіатура з умлаутами й ес-цет. */
export default function UmlautKeyboard() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
        aria-label="Німецькі літери"
      >
        <Keyboard className="h-5 w-5" />
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-24 right-4 z-40 flex items-center gap-1 rounded-2xl border bg-card/95 p-2 shadow-xl backdrop-blur"
    >
      {KEYS.map((k) => (
        <Button
          key={k}
          type="button"
          variant="secondary"
          size="sm"
          className="h-9 w-9 p-0 text-base font-semibold"
          onMouseDown={(e) => {
            e.preventDefault();
            insertIntoFocused(k);
          }}
        >
          {k}
        </Button>
      ))}
      <Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setOpen(false)} aria-label="Закрити">
        <X className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}
