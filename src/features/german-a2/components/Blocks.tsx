import type { Block, Role } from '../types';
import { useLang, tx } from '../i18n';
import { cn } from './ui';

/* Ролі в «анатомії речення»: колір завжди разом з підписом у легенді. */
const ROLE: Record<Role, { label: { ua: string; de: string }; cls: string }> = {
  subj: { label: { ua: 'підмет', de: 'Subjekt' }, cls: 'border-slate-400 bg-slate-100 dark:bg-slate-800' },
  aux: { label: { ua: 'haben / sein (2-ге місце)', de: 'haben / sein (Position 2)' }, cls: 'border-sky-500 bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100' },
  part: { label: { ua: 'Partizip II (в кінці)', de: 'Partizip II (am Ende)' }, cls: 'border-amber-500 bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100' },
  time: { label: { ua: 'час', de: 'Zeit' }, cls: 'border-violet-400 bg-violet-100 text-violet-950 dark:bg-violet-950 dark:text-violet-100' },
  obj: { label: { ua: 'додаток / місце', de: 'Objekt / Ort' }, cls: 'border-emerald-400 bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100' },
  neg: { label: { ua: 'заперечення', de: 'Negation' }, cls: 'border-rose-400 bg-rose-100 text-rose-950 dark:bg-rose-950 dark:text-rose-100' },
  verb: { label: { ua: 'дієслово', de: 'Verb' }, cls: 'border-sky-500 bg-sky-100 text-sky-950 dark:bg-sky-950 dark:text-sky-100' },
};

export function Blocks({ blocks }: { blocks: Block[] }) {
  const { lang } = useLang();
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        switch (b.t) {
          case 'h': return <h4 key={i} className="pt-2 text-lg font-semibold">{tx(b.text, lang)}</h4>;
          case 'p': return <p key={i} className="max-w-prose leading-relaxed">{tx(b.text, lang)}</p>;
          case 'tip': return <p key={i} className="max-w-prose rounded-md border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">{tx(b.text, lang)}</p>;
          case 'warn': return <p key={i} className="max-w-prose rounded-md border-l-4 border-amber-500 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">{tx(b.text, lang)}</p>;
          case 'list': return <ul key={i} className="max-w-prose list-disc space-y-1 pl-5">{b.items.map((it, k) => <li key={k}>{tx(it, lang)}</li>)}</ul>;
          case 'table': return (
            <figure key={i} className="overflow-x-auto">
              <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
                <thead><tr>{b.head.map((h, k) => <th key={k} className="border-b border-border px-3 py-2 font-semibold">{tx(h, lang)}</th>)}</tr></thead>
                <tbody>{b.rows.map((r, k) => (
                  <tr key={k} className="odd:bg-muted/50">{r.map((c, j) => <td key={j} className={cn('px-3 py-2', j === 0 && 'font-medium')}>{tx(c, lang)}</td>)}</tr>
                ))}</tbody>
              </table>
              {b.caption && <figcaption className="mt-1 text-xs text-muted-foreground">{tx(b.caption, lang)}</figcaption>}
            </figure>
          );
          case 'examples': return (
            <ul key={i} className="grid gap-2">
              {b.items.map((it, k) => (
                <li key={k} className="rounded-md border border-border px-4 py-2">
                  <span className="text-base font-medium">{it.de}</span>
                  {lang === 'ua' && <span className="block text-sm text-muted-foreground">{it.ua}</span>}
                </li>
              ))}
            </ul>
          );
          case 'sentence': {
            const roles = [...new Set(b.words.map(w => w.role).filter((r): r is Role => Boolean(r)))];
            return (
              <figure key={i} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap gap-2 text-lg">
                  {b.words.map((w, k) => (
                    <span key={k} className={cn('rounded-md border-b-4 px-2 py-1', w.role ? ROLE[w.role].cls : 'border-transparent')}>{w.w}</span>
                  ))}
                </div>
                {b.ua && lang === 'ua' && <p className="mt-2 text-sm text-muted-foreground">{b.ua}</p>}
                <figcaption className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {roles.map(r => (
                    <span key={r} className="inline-flex items-center gap-1.5">
                      <span className={cn('inline-block h-2.5 w-4 rounded-sm border-b-4', ROLE[r].cls)} />{ROLE[r].label[lang]}
                    </span>
                  ))}
                </figcaption>
                {b.note && <p className="mt-2 text-sm">{tx(b.note, lang)}</p>}
              </figure>
            );
          }
        }
      })}
    </div>
  );
}
