import { useState } from 'react';
import type { VocabItem } from '../types';
import { useUI } from '../i18n';
import { Button, cn } from './ui';

export function Flashcards({ items }: { items: VocabItem[] }) {
  const ui = useUI();
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const item = items[i]!;
  const go = (d: number) => { setI((i + d + items.length) % items.length); setFlipped(false); };
  const mark = (k: boolean) => {
    setKnown(s => { const n = new Set(s); if (k) n.add(i); else n.delete(i); return n; });
    go(1);
  };
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{i + 1}/{items.length}</span><span>{ui('know')}: {known.size}/{items.length}</span>
      </div>
      <button type="button" onClick={() => setFlipped(f => !f)} aria-label={ui('flip')}
        className={cn('flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-xl border border-border p-6 text-center transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
          flipped ? 'bg-muted' : 'bg-background', known.has(i) && 'border-emerald-500')}>
        {!flipped ? (
          <span className="text-3xl font-semibold">{item.de}</span>
        ) : (
          <>
            <span className="text-2xl font-semibold">{item.ua}</span>
            {item.extra && <span className="text-base text-muted-foreground">{item.extra}</span>}
            {item.example && <span className="mt-2 max-w-md text-sm">{item.example}</span>}
          </>
        )}
      </button>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button variant="ghost" onClick={() => go(-1)}>←</Button>
        <Button variant="outline" onClick={() => mark(false)}>{ui('again2')}</Button>
        <Button onClick={() => mark(true)}>{ui('know')}</Button>
        <Button variant="ghost" onClick={() => go(1)}>→</Button>
      </div>
    </div>
  );
}
