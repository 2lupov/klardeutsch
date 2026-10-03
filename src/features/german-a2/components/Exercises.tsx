import { useMemo, useState, type KeyboardEvent } from 'react';
import type { Dialogue, Fix, Gap, GapSelect, MC, Match, Order, Sort, Translate } from '../types';
import { useLang, useUI, tx } from '../i18n';
import { Button, CharBar, cn, norm, shuffle } from './ui';
import { SpeakButton } from './SpeakButton';

interface P<E> { ex: E; onDone: (ok: boolean) => void }
type GapPart = { text: string } | { gap: number; acc: string[] };
type SelPart = { text: string } | { gap: number; correct: string; opts: string[] };

const OK = 'border-emerald-500 bg-emerald-50 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100';
const BAD = 'border-red-500 bg-red-50 text-red-950 dark:bg-red-950/40 dark:text-red-100';
const chip = 'rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring';
const field = 'rounded-md border border-border bg-background px-3 py-2 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring';

function Verdict({ ok, answer }: { ok: boolean; answer?: string }) {
  const ui = useUI();
  return (
    <p role="status" className={cn('mt-4 rounded-md border px-3 py-2 text-sm', ok ? OK : BAD)}>
      <span className="flex items-center gap-2">
        <span className="flex-1">{ok ? `✓ ${ui('correct')}` : <>✗ {ui('wrong')} {answer && <strong>{answer}</strong>}</>}</span>
        {answer && answer.trim() && !answer.includes('→') && <SpeakButton text={answer.replace(/ · /g, ', ')} />}
      </span>
    </p>
  );
}

/* ───────── MC ───────── */
export function MCEx({ ex, onDone }: P<MC>) {
  const { lang } = useLang();
  const [sel, setSel] = useState<number | null>(null);
  const order = useMemo(() => { const i = ex.options.map((_, k) => k); return ex.keepOrder ? i : shuffle(i); }, [ex]);
  const pick = (i: number) => { if (sel !== null) return; setSel(i); onDone(i === ex.answer); };
  return (
    <div>
      <p className="mb-4 text-lg font-medium">{tx(ex.q, lang)}</p>
      <div className="grid gap-2">
        {order.map(i => (
          <button key={i} type="button" disabled={sel !== null} onClick={() => pick(i)}
            className={cn('rounded-md border px-4 py-3 text-left transition-colors', chip.replace('px-3 py-2 text-sm', ''),
              sel === null ? '' : i === ex.answer ? OK : i === sel ? BAD : 'opacity-50')}>
            {tx(ex.options[i]!, lang)}
          </button>
        ))}
      </div>
      {sel !== null && <div className="mt-3 flex justify-end"><SpeakButton text={tx(ex.options[ex.answer]!, 'de')} /></div>}
    </div>
  );
}

/* ───────── Gap (ввід) ───────── */
export function GapEx({ ex, onDone }: P<Gap>) {
  const { lang } = useLang();
  const ui = useUI();
  const parts = useMemo<GapPart[]>(() => {
    let n = 0;
    return ex.text.split(/(\{\{.+?\}\})/g).filter(Boolean).map((s): GapPart =>
      s.startsWith('{{') ? { gap: n++, acc: s.slice(2, -2).split('|') } : { text: s });
  }, [ex.text]);
  const gaps = parts.filter((p): p is Extract<GapPart, { gap: number }> => 'gap' in p);
  const [vals, setVals] = useState<string[]>(() => gaps.map(() => ''));
  const [checked, setChecked] = useState(false);
  const res = gaps.map((g, i) => g.acc.some(a => norm(a) === norm(vals[i] ?? '')));
  const check = () => { if (checked || vals.some(v => !v.trim())) return; setChecked(true); onDone(res.every(Boolean)); };
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Enter') check(); };
  return (
    <div>
      <p className="text-lg leading-10">
        {parts.map((p, k) => 'gap' in p ? (
          <input key={k} data-char-target="1" value={vals[p.gap]} disabled={checked} autoComplete="off" autoCapitalize="off" spellCheck={false}
            onChange={e => setVals(v => v.map((x, i) => (i === p.gap ? e.target.value : x)))} onKeyDown={onKey}
            style={{ width: `${Math.max(6, Math.max(...p.acc.map(a => a.length)) + 3)}ch` }}
            className={cn(field, 'mx-1 inline-block py-0.5 text-center', checked && (res[p.gap] ? OK : BAD))}
            aria-label={`${p.gap + 1}`} />
        ) : <span key={k}>{p.text}</span>)}
      </p>
      {ex.hint && <p className="mt-1 text-sm text-muted-foreground">{tx(ex.hint, lang)}</p>}
      {!checked && <div className="mt-4 flex flex-wrap items-center gap-3"><Button onClick={check} disabled={vals.some(v => !v.trim())}>{ui('check')}</Button><CharBar /></div>}
      {checked && <Verdict ok={res.every(Boolean)} answer={gaps.map(g => g.acc[0]).join(' · ')} />}
    </div>
  );
}

/* ───────── GapSelect ───────── */
export function GapSelectEx({ ex, onDone }: P<GapSelect>) {
  const ui = useUI();
  const parts = useMemo<SelPart[]>(() => {
    let n = 0;
    return ex.text.split(/(\[\[.+?\]\])/g).filter(Boolean).map((s): SelPart => {
      if (!s.startsWith('[[')) return { text: s };
      const opts = s.slice(2, -2).split('|');
      return { gap: n++, correct: opts[0]!, opts: shuffle(opts) };
    });
  }, [ex.text]);
  const gaps = parts.filter((p): p is Extract<SelPart, { gap: number }> => 'gap' in p);
  const [vals, setVals] = useState<string[]>(() => gaps.map(() => ''));
  const [checked, setChecked] = useState(false);
  const res = gaps.map((g, i) => vals[i] === g.correct);
  const check = () => { if (checked) return; setChecked(true); onDone(res.every(Boolean)); };
  return (
    <div>
      <p className="text-lg leading-10">
        {parts.map((p, k) => 'gap' in p ? (
          <select key={k} value={vals[p.gap]} disabled={checked} aria-label={`${p.gap + 1}`}
            onChange={e => setVals(v => v.map((x, i) => (i === p.gap ? e.target.value : x)))}
            className={cn(field, 'mx-1 py-0.5', checked && (res[p.gap] ? OK : BAD))}>
            <option value="">{ui('chooseDots')}</option>
            {p.opts.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : <span key={k}>{p.text}</span>)}
      </p>
      {!checked && <Button className="mt-4" onClick={check} disabled={vals.some(v => !v)}>{ui('check')}</Button>}
      {checked && <Verdict ok={res.every(Boolean)} answer={gaps.map(g => g.correct).join(' · ')} />}
    </div>
  );
}

/* ───────── Order ───────── */
export function OrderEx({ ex, onDone }: P<Order>) {
  const ui = useUI();
  const pool = useMemo(() => shuffle([...ex.words, ...(ex.extra ?? [])].map((w, id) => ({ id, w }))), [ex]);
  const [chosen, setChosen] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  const built = chosen.map(id => pool.find(p => p.id === id)!.w).join(' ');
  const accepted = [ex.words, ...(ex.alt ?? [])].map(a => a.join(' '));
  const ok = accepted.includes(built);
  const check = () => { if (checked) return; setChecked(true); onDone(ok); };
  return (
    <div>
      {ex.translation && <p className="mb-3 text-muted-foreground">{ex.translation}</p>}
      <div className={cn('flex min-h-14 flex-wrap items-center gap-2 rounded-md border border-dashed border-border p-2', checked && (ok ? OK : BAD))}>
        {chosen.map(id => (
          <button key={id} type="button" disabled={checked} onClick={() => setChosen(c => c.filter(x => x !== id))}
            className={chip} title={ui('undo')}>{pool.find(p => p.id === id)!.w}</button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {pool.filter(p => !chosen.includes(p.id)).map(p => (
          <button key={p.id} type="button" disabled={checked} onClick={() => setChosen(c => [...c, p.id])}
            className={cn(chip, 'bg-muted')}>{p.w}</button>
        ))}
      </div>
      {!checked && (
        <div className="mt-4 flex gap-2">
          <Button onClick={check} disabled={chosen.length === 0}>{ui('check')}</Button>
          <Button variant="ghost" onClick={() => setChosen([])} disabled={chosen.length === 0}>{ui('reset')}</Button>
        </div>
      )}
      {checked && <Verdict ok={ok} answer={ex.words.join(' ')} />}
    </div>
  );
}

/* ───────── Match ───────── */
export function MatchEx({ ex, onDone }: P<Match>) {
  const right = useMemo(() => shuffle(ex.pairs.map(p => p[1])), [ex]);
  const [sel, setSel] = useState<number | null>(null);
  const [done, setDone] = useState<Record<number, string>>({});
  const [mistakes, setMistakes] = useState(0);
  const [flash, setFlash] = useState<string | null>(null);
  const used = new Set(Object.values(done));
  const pickRight = (text: string) => {
    if (sel === null || used.has(text)) return;
    if (ex.pairs[sel]![1] === text) {
      const next = { ...done, [sel]: text };
      setDone(next); setSel(null);
      if (Object.keys(next).length === ex.pairs.length) onDone(mistakes === 0);
    } else {
      setMistakes(m => m + 1); setFlash(text); window.setTimeout(() => setFlash(null), 500);
    }
  };
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
      <div className="grid gap-2">
        {ex.pairs.map((p, i) => (
          <button key={i} type="button" disabled={i in done} onClick={() => setSel(i)}
            className={cn(chip, 'text-left', i in done && OK, sel === i && 'ring-2 ring-ring')}>{p[0]}</button>
        ))}
      </div>
      <div className="grid gap-2">
        {right.map(t => (
          <button key={t} type="button" disabled={used.has(t)} onClick={() => pickRight(t)}
            className={cn(chip, 'text-left', used.has(t) && OK, flash === t && BAD)}>{t}</button>
        ))}
      </div>
    </div>
  );
}

/* ───────── Sort ───────── */
export function SortEx({ ex, onDone }: P<Sort>) {
  const ui = useUI();
  const order = useMemo(() => shuffle(ex.items.map((_, i) => i)), [ex]);
  const [asg, setAsg] = useState<(number | null)[]>(() => ex.items.map(() => null));
  const [checked, setChecked] = useState(false);
  const res = ex.items.map((it, i) => asg[i] === it[1]);
  const check = () => { if (checked) return; setChecked(true); onDone(res.every(Boolean)); };
  return (
    <div>
      <div className="grid gap-2">
        {order.map(i => (
          <div key={i} className={cn('flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2', checked && (res[i] ? OK : BAD))}>
            <span className="px-1 font-medium">{ex.items[i]![0]}</span>
            <span className="flex flex-wrap gap-1">
              {ex.categories.map((c, ci) => (
                <button key={c} type="button" disabled={checked} onClick={() => setAsg(a => a.map((x, k) => (k === i ? ci : x)))}
                  className={cn(chip, 'py-1', asg[i] === ci && 'border-primary bg-primary text-primary-foreground hover:bg-primary')}>{c}</button>
              ))}
            </span>
          </div>
        ))}
      </div>
      {!checked && <Button className="mt-4" onClick={check} disabled={asg.some(a => a === null)}>{ui('check')}</Button>}
      {checked && <Verdict ok={res.every(Boolean)} answer={res.every(Boolean) ? undefined : ex.items.map(it => `${it[0]} → ${ex.categories[it[1]]}`).join('; ')} />}
    </div>
  );
}

/* ───────── Fix / Translate (спільний рядок вводу) ───────── */
function TypedAnswer({ answers, onDone, children, rows }: { answers: string[]; onDone: (ok: boolean) => void; children: React.ReactNode; rows?: number }) {
  const ui = useUI();
  const [val, setVal] = useState('');
  const [checked, setChecked] = useState(false);
  const ok = answers.some(a => norm(a) === norm(val));
  const check = () => { if (checked || !val.trim()) return; setChecked(true); onDone(ok); };
  return (
    <div>
      {children}
      <textarea data-char-target="1" rows={rows ?? 2} value={val} disabled={checked} autoCapitalize="off" spellCheck={false}
        placeholder={ui('typeHere')} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); check(); } }}
        className={cn(field, 'mt-3 w-full resize-none', checked && (ok ? OK : BAD))} />
      {!checked && <div className="mt-3 flex flex-wrap items-center gap-3"><Button onClick={check} disabled={!val.trim()}>{ui('check')}</Button><CharBar /></div>}
      {checked && <Verdict ok={ok} answer={answers[0]} />}
    </div>
  );
}
export const FixEx = ({ ex, onDone }: P<Fix>) => (
  <TypedAnswer answers={ex.answers} onDone={onDone}><p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-lg text-red-950 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100">{ex.wrong}</p></TypedAnswer>
);
export const TranslateEx = ({ ex, onDone }: P<Translate>) => (
  <TypedAnswer answers={ex.answers} onDone={onDone}><p className="text-lg font-medium">{ex.ua}</p></TypedAnswer>
);

/* ───────── Dialogue ───────── */
export function DialogueEx({ ex, onDone }: P<Dialogue>) {
  const firstChoice = (from: number) => { let j = from; while (j < ex.turns.length && 'line' in ex.turns[j]!) j++; return j; };
  const [idx, setIdx] = useState(() => firstChoice(0));
  const [mistakes, setMistakes] = useState(0);
  const [bad, setBad] = useState<Set<number>>(new Set());
  const speakers = [...new Set(ex.turns.map(t => t.who))];
  const shown = ex.turns.slice(0, Math.min(idx + 1, ex.turns.length));
  const opts = useMemo(() => ex.turns.map(t => ('options' in t ? shuffle(t.options.map((_, i) => i)) : [])), [ex]);
  const pick = (i: number) => {
    const t = ex.turns[idx]!;
    if (!('options' in t)) return;
    if (i !== t.answer) { setMistakes(m => m + 1); setBad(b => new Set(b).add(i)); return; }
    const next = firstChoice(idx + 1);
    setBad(new Set()); setIdx(next);
    if (next >= ex.turns.length) onDone(mistakes === 0);
  };
  return (
    <div className="grid gap-3">
      {shown.map((t, i) => {
        const right = speakers.indexOf(t.who) % 2 === 1;
        const answered = 'options' in t && i < idx;
        const active = 'options' in t && i === idx;
        if (active) return null;
        return (
          <div key={i} className={cn('flex flex-col', right ? 'items-end' : 'items-start')}>
            <span className="mb-1 text-xs text-muted-foreground">{t.who}</span>
            <p className={cn('max-w-[85%] rounded-2xl px-4 py-2', right ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
              {'line' in t ? t.line : answered ? t.options[t.answer] : null}
            </p>
          </div>
        );
      })}
      {idx < ex.turns.length && (() => {
        const t = ex.turns[idx]!;
        if (!('options' in t)) return null;
        return (
          <div className="grid gap-2">
            <span className="text-xs text-muted-foreground">{t.who}</span>
            {opts[idx]!.map(i => (
              <button key={i} type="button" disabled={bad.has(i)} onClick={() => pick(i)}
                className={cn(chip, 'text-left', bad.has(i) && BAD)}>{t.options[i]}</button>
            ))}
          </div>
        );
      })()}
      {idx >= ex.turns.length && <Verdict ok={mistakes === 0} answer={mistakes ? ' ' : undefined} />}
    </div>
  );
}
