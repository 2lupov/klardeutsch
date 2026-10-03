import { useRef, useState } from 'react';
import type { Exercise } from '../types';
import { useLang, useUI, tx } from '../i18n';
import { useProgress } from '../progress';
import { Button, cn } from './ui';
import { DialogueEx, FixEx, GapEx, GapSelectEx, MCEx, MatchEx, OrderEx, SortEx, TranslateEx } from './Exercises';

const DEFAULT_PROMPT = {
  mc: { ua: 'Оберіть правильну відповідь.', de: 'Wähle die richtige Antwort.' },
  gap: { ua: 'Впишіть пропущені слова.', de: 'Ergänze die Lücken.' },
  gapselect: { ua: 'Оберіть правильний варіант.', de: 'Wähle die richtige Form.' },
  order: { ua: 'Складіть речення зі слів.', de: 'Bilde einen Satz.' },
  match: { ua: 'З’єднайте пари: оберіть ліве, потім праве.', de: 'Ordne zu: links, dann rechts.' },
  sort: { ua: 'Розподіліть за категоріями.', de: 'Sortiere in die Gruppen.' },
  fix: { ua: 'Знайдіть помилку й напишіть речення правильно.', de: 'Finde den Fehler und schreibe den Satz richtig.' },
  translate: { ua: 'Перекладіть німецькою.', de: 'Übersetze ins Deutsche.' },
  dialogue: { ua: 'Оберіть доречні репліки.', de: 'Wähle die passenden Antworten.' },
} as const;

function Render({ ex, onDone }: { ex: Exercise; onDone: (ok: boolean) => void }) {
  switch (ex.type) {
    case 'mc': return <MCEx ex={ex} onDone={onDone} />;
    case 'gap': return <GapEx ex={ex} onDone={onDone} />;
    case 'gapselect': return <GapSelectEx ex={ex} onDone={onDone} />;
    case 'order': return <OrderEx ex={ex} onDone={onDone} />;
    case 'match': return <MatchEx ex={ex} onDone={onDone} />;
    case 'sort': return <SortEx ex={ex} onDone={onDone} />;
    case 'fix': return <FixEx ex={ex} onDone={onDone} />;
    case 'translate': return <TranslateEx ex={ex} onDone={onDone} />;
    case 'dialogue': return <DialogueEx ex={ex} onDone={onDone} />;
  }
}

interface Props {
  exercises: Exercise[];
  /** Ключ секції для прогресу, напр. `m02:grammar:regular`. */
  sectionKey: string;
  passPercent?: number;
  onFinish?: (correct: number, total: number) => void;
}

export function ExerciseRunner({ exercises, sectionKey, passPercent = 70, onFinish }: Props) {
  const ui = useUI();
  const { lang } = useLang();
  const { record } = useProgress();
  const all = exercises.map((_, i) => i);
  const [queue, setQueue] = useState<number[]>(all);
  const [pos, setPos] = useState(0);
  const [round, setRound] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [finished, setFinished] = useState(false);
  const [results, setResults] = useState<Record<number, boolean>>({});
  const first = useRef<Record<number, boolean>>({});

  const cur = queue[pos]!;
  const ex = exercises[cur]!;

  const onDone = (ok: boolean) => {
    setResults(r => ({ ...r, [cur]: ok }));
    if (round === 0) first.current[cur] = ok;
    setAnswered(true);
  };

  const next = () => {
    if (pos + 1 < queue.length) { setPos(pos + 1); setAnswered(false); return; }
    if (round === 0) {
      const correct = Object.values(first.current).filter(Boolean).length;
      record(sectionKey, correct, exercises.length, passPercent);
      onFinish?.(correct, exercises.length);
    }
    setFinished(true);
  };

  const restart = () => {
    first.current = {}; setResults({}); setQueue(all); setPos(0); setRound(0); setAnswered(false); setFinished(false);
  };
  const retry = () => {
    const wrong = queue.filter(i => results[i] === false);
    setQueue(wrong); setResults({}); setPos(0); setRound(r => r + 1); setAnswered(false); setFinished(false);
  };

  if (finished) {
    const correct = Object.values(first.current).filter(Boolean).length;
    const pct = Math.round((correct / exercises.length) * 100);
    const passed = pct >= passPercent;
    const hasWrong = Object.values(results).some(v => v === false);
    return (
      <div className="rounded-xl border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground">{ui('yourResult')}</p>
        <p className="my-2 text-4xl font-semibold tabular-nums">{correct}/{exercises.length}</p>
        <p className="mb-5 text-sm">{passed ? ui('passed') : ui('notPassed')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {hasWrong && <Button onClick={retry}>{ui('retryMistakes')}</Button>}
          <Button variant="outline" onClick={restart}>{ui('again')}</Button>
        </div>
      </div>
    );
  }

  const shown = pos + (answered ? 1 : 0);
  return (
    <div className="rounded-xl border border-border p-4 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={shown}>
          <div className="h-full bg-primary transition-all" style={{ width: `${(shown / queue.length) * 100}%` }} />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{pos + 1}/{queue.length}</span>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">{tx(ex.prompt ?? DEFAULT_PROMPT[ex.type], lang)}</p>
      <Render key={`${round}-${pos}`} ex={ex} onDone={onDone} />
      {answered && (
        <div className={cn('mt-5 flex flex-col gap-3')}>
          {ex.explain && <p className="rounded-md bg-muted px-3 py-2 text-sm">{tx(ex.explain, lang)}</p>}
          <div><Button autoFocus onClick={next}>{pos + 1 < queue.length ? ui('next') : ui('finish')}</Button></div>
        </div>
      )}
    </div>
  );
}

/** Згорнута вправа: показує кнопку «Почати вправи», потім раннер. */
export function Practice(props: Props & { count?: number }) {
  const ui = useUI();
  const [open, setOpen] = useState(false);
  const { isDone } = useProgress();
  if (open) return <ExerciseRunner {...props} />;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border p-4">
      <div>
        <p className="font-medium">{ui('practice')}: {props.exercises.length} {ui('exercise').toLowerCase()}</p>
        {isDone(props.sectionKey) && <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ {ui('passed')}</p>}
      </div>
      <Button onClick={() => setOpen(true)}>{ui('startPractice')}</Button>
    </div>
  );
}
