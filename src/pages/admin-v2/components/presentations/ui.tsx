import { ReactNode, useEffect, useRef, useState } from "react";
import { X, MoreHorizontal } from "lucide-react";

/** Модальне вікно у стилі адмінки (Esc і клік по фону закривають). */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="klar-admin fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onMouseDown={onClose}>
      <div
        className={`w-full ${wide ? "sm:max-w-2xl" : "sm:max-w-md"} max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl bg-admin-card text-admin-fg border border-admin-border shadow-xl`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-admin-border">
          <h3 className="text-base font-semibold truncate">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-admin-muted hover:bg-admin-fg/5" aria-label="Закрити">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-admin-border flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/** Меню «⋯» з закриттям по кліку поза ним. */
export function KebabMenu({ items }: { items: ({ label: string; icon?: ReactNode; onClick: () => void; danger?: boolean } | "sep")[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-admin-muted hover:bg-admin-fg/5 hover:text-admin-fg"
        aria-label="Дії"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-56 rounded-xl border border-admin-border bg-admin-card shadow-lg py-1">
          {items.map((it, i) =>
            it === "sep" ? (
              <div key={i} className="my-1 h-px bg-admin-border" />
            ) : (
              <button
                key={i}
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-admin-fg/5 ${it.danger ? "text-admin-danger" : "text-admin-fg"}`}
              >
                {it.icon}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}

const LEVEL_STYLE: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  B: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  C: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

export function LevelBadge({ level }: { level: string | null }) {
  if (!level) return null;
  return <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${LEVEL_STYLE[level[0]] ?? "bg-admin-fg/10"}`}>{level}</span>;
}

export const fieldClass =
  "w-full px-3 py-2 rounded-xl border border-admin-border bg-admin-surface text-sm text-admin-fg placeholder:text-admin-muted focus:outline-none focus:ring-2 focus:ring-admin-accent/40";

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-admin-muted">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-admin-muted">{hint}</span>}
    </label>
  );
}
