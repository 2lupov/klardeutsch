import type { ButtonHTMLAttributes } from 'react';

export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

const focus = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export function Button({ variant = 'primary', className, ...p }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) {
  const v = {
    primary: 'bg-primary text-primary-foreground hover:opacity-90',
    outline: 'border border-border bg-background text-foreground hover:bg-muted',
    ghost: 'text-foreground hover:bg-muted',
  }[variant];
  return <button type="button" {...p}
    className={cn('inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40', v, focus, className)} />;
}

export const norm = (s: string) =>
  s.toLowerCase().trim().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').replace(/\s+([?!.,])/g, '$1')
    .replace(/[.!?]+$/, '').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

/** Вставляє символ у поле, яке зараз у фокусі (поле має data-char-target). */
function insertChar(ch: string) {
  const el = document.activeElement;
  if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) || !el.dataset.charTarget) return;
  const start = el.selectionStart ?? el.value.length;
  const end = el.selectionEnd ?? start;
  const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
  setter?.call(el, el.value.slice(0, start) + ch + el.value.slice(end));
  el.setSelectionRange(start + 1, start + 1);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

export function CharBar({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap gap-1', className)} aria-label="ä ö ü ß">
      {['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].map(c => (
        <button key={c} type="button" onMouseDown={e => e.preventDefault()} onClick={() => insertChar(c)}
          className={cn('h-8 w-8 rounded border border-border bg-background text-sm hover:bg-muted', focus)}>{c}</button>
      ))}
    </div>
  );
}
