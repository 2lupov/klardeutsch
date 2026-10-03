import { SpeakButton } from './SpeakButton';
import { useState } from 'react';
import type { CourseModule, VocabGroup } from '../types';
import { useLang, useUI, tx } from '../i18n';
import { useProgress } from '../progress';
import { Blocks } from './Blocks';
import { AudioSlot, VideoSlot } from './MediaSlot';
import { Flashcards } from './Flashcards';
import { ExerciseRunner, Practice } from './ExerciseRunner';
import { Button, CharBar, cn } from './ui';

const key = (m: CourseModule, ...rest: string[]) => [m.id, ...rest].join(':');
const H = ({ children }: { children: React.ReactNode }) => <h3 className="mb-3 text-xl font-semibold">{children}</h3>;

/* ───────── Video ───────── */
export function VideoSection({ m }: { m: CourseModule }) {
  const ui = useUI(); const { lang } = useLang(); const { isDone, markDone } = useProgress();
  const k = key(m, 'video');
  return (
    <div className="space-y-5">
      <VideoSlot url={m.video.url} title={tx(m.video.title, lang)} />
      <div>
        <H>{ui('chapters')}</H>
        <ul className="list-disc space-y-1 pl-5">{m.video.chapters.map((c, i) => <li key={i}>{tx(c, lang)}</li>)}</ul>
      </div>
      <Button variant={isDone(k) ? 'outline' : 'primary'} onClick={() => markDone(k)}>{isDone(k) ? '✓ ' : ''}{ui('watched')}</Button>
    </div>
  );
}

/* ───────── Wortschatz ───────── */
function VocabGroupView({ m, g }: { m: CourseModule; g: VocabGroup }) {
  const ui = useUI(); const { lang } = useLang();
  const [list, setList] = useState(false);
  return (
    <div className="space-y-5">
      {g.intro && <p className="max-w-prose">{tx(g.intro, lang)}</p>}
      <Flashcards items={g.items} />
      <div>
        <Button variant="outline" onClick={() => setList(v => !v)}>{list ? ui('hideList') : ui('showList')} ({g.items.length})</Button>
        {list && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-sm">
              <tbody>
                {g.items.map((it, i) => (
                  <tr key={i} className="odd:bg-muted/50 align-top">
                    <td className="px-3 py-2 font-medium">{it.de}{it.extra && <span className="block text-xs font-normal text-muted-foreground">{it.extra}</span>}</td>
                    <td className="px-3 py-2">{it.ua}</td>
                    <td className="px-3 py-2 text-muted-foreground">{it.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <Practice exercises={g.exercises} sectionKey={key(m, 'vocab', g.id)} />
    </div>
  );
}

export function VocabSection({ m }: { m: CourseModule }) {
  const { lang } = useLang(); const { isDone } = useProgress();
  const [id, setId] = useState(m.vocab[0]!.id);
  const g = m.vocab.find(x => x.id === id)!;
  return (
    <div className="space-y-5">
      <SubTabs items={m.vocab.map(v => ({ id: v.id, label: tx(v.title, lang), done: isDone(key(m, 'vocab', v.id)) }))} value={id} onChange={setId} />
      <VocabGroupView key={id} m={m} g={g} />
    </div>
  );
}

/* ───────── Grammatik ───────── */
export function GrammarSection({ m }: { m: CourseModule }) {
  const { lang } = useLang(); const ui = useUI(); const { isDone } = useProgress();
  const [id, setId] = useState(m.grammar[0]!.id);
  const t = m.grammar.find(x => x.id === id)!;
  return (
    <div className="space-y-5">
      <SubTabs items={m.grammar.map(g => ({ id: g.id, label: tx(g.title, lang), done: isDone(key(m, 'grammar', g.id)) }))} value={id} onChange={setId} />
      <div key={id} className="space-y-6">
        <H>{tx(t.title, lang)}</H>
        <Blocks blocks={t.blocks} />
        <Practice exercises={t.exercises} sectionKey={key(m, 'grammar', t.id)} />
        <span className="sr-only">{ui('theory')}</span>
      </div>
    </div>
  );
}

/* ───────── Nomen-Verb-Verbindungen ───────── */
export function NvvSection({ m }: { m: CourseModule }) {
  const ui = useUI();
  return (
    <div className="space-y-6">
      <Blocks blocks={m.nvv.intro} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
          <tbody>
            {m.nvv.items.map((it, i) => (
              <tr key={i} className="odd:bg-muted/50 align-top">
                <td className="px-3 py-2 font-medium">{it.phrase}</td>
                <td className="px-3 py-2">{it.ua}</td>
                <td className="px-3 py-2 text-muted-foreground">{it.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Practice exercises={m.nvv.exercises} sectionKey={key(m, 'nvv')} />
      <span className="sr-only">{ui('practice')}</span>
    </div>
  );
}

/* ───────── Lesen ───────── */
export function ReadingSection({ m }: { m: CourseModule }) {
  const ui = useUI();
  const r = m.reading;
  return (
    <div className="space-y-6">
      <article className="rounded-xl border border-border p-5">
        <h3 className="text-xl font-semibold">{r.title}</h3>
        {r.byline && <p className="mb-3 text-sm text-muted-foreground">{r.byline}</p>}
        <div className="max-w-prose space-y-3 text-lg leading-relaxed">{r.paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
      </article>
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer font-medium">{ui('glossary')}</summary>
        <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {r.glossary.map((g, i) => <div key={i} className="flex gap-2"><dt className="font-medium">{g.de}</dt><dd className="text-muted-foreground">— {g.ua}</dd></div>)}
        </dl>
      </details>
      <ExerciseRunner exercises={r.exercises} sectionKey={key(m, 'reading')} />
    </div>
  );
}

/* ───────── Hören ───────── */
export function ListeningSection({ m }: { m: CourseModule }) {
  const ui = useUI(); const { lang } = useLang(); const { isDone } = useProgress();
  const l = m.listening;
  const [finished, setFinished] = useState(false);
  const [force, setForce] = useState(false);
  const unlocked = finished || force || isDone(key(m, 'listening'));
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <H>{tx(l.title, lang)}</H>
        <p className="max-w-prose">{tx(l.instruction, lang)}</p>
        <AudioSlot url={l.audioUrl} transcript={l.transcript} />
      </div>
      <ExerciseRunner exercises={l.exercises} sectionKey={key(m, 'listening')} onFinish={() => setFinished(true)} />
      <details className="rounded-xl border border-border p-4">
        <summary className="cursor-pointer font-medium">{ui('transcript')}</summary>
        {unlocked ? (
          <div className="mt-3 space-y-2">
            {l.transcript.map((t, i) => <p key={i} className="flex items-start gap-2"><span className="flex-1">{t.speaker && <strong>{t.speaker}: </strong>}{t.text}</span><SpeakButton text={t.text} className="h-7 w-7" /></p>)}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {ui('transcriptLocked')} <button type="button" className="underline" onClick={() => setForce(true)}>{ui('showNow')}</button>
          </p>
        )}
      </details>
    </div>
  );
}

/* ───────── Schreiben ───────── */
export function WritingSection({ m }: { m: CourseModule }) {
  const ui = useUI(); const { lang } = useLang();
  const { progress, setDraft, isDone, markDone } = useProgress();
  const w = m.writing;
  const dk = key(m, 'writing');
  const text = progress.drafts[dk] ?? '';
  const [checks, setChecks] = useState<boolean[]>(() => w.checklist.map(() => false));
  const [sample, setSample] = useState(false);
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  const inRange = count >= w.minWords && count <= w.maxWords;
  const ready = inRange && checks.every(Boolean);
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border p-5">
        <p className="mb-1 text-sm text-muted-foreground">{ui('task')}</p>
        <p className="mb-3 text-lg font-medium">{tx(w.task, lang)}</p>
        <ul className="list-disc space-y-1 pl-5">{w.points.map((p, i) => <li key={i}>{tx(p, lang)}</li>)}</ul>
      </div>
      <div>
        <label htmlFor={`w-${m.id}`} className="mb-2 block font-medium">{ui('yourText')}</label>
        <textarea id={`w-${m.id}`} data-char-target="1" rows={10} value={text} onChange={e => setDraft(dk, e.target.value)}
          className="w-full rounded-md border border-border bg-background p-3 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <CharBar />
          <span className={cn('text-sm tabular-nums', inRange ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
            {count} {ui('wordCount')} · {ui('needWords')} {w.minWords}–{w.maxWords}
          </span>
        </div>
      </div>
      <div>
        <H>{ui('checklist')}</H>
        <ul className="space-y-2">
          {w.checklist.map((c, i) => (
            <li key={i}><label className="flex cursor-pointer items-start gap-2">
              <input type="checkbox" className="mt-1" checked={checks[i]} onChange={() => setChecks(a => a.map((x, k) => (k === i ? !x : x)))} />
              <span>{tx(c, lang)}</span>
            </label></li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setSample(s => !s)}>{sample ? ui('hideSample') : ui('showSample')}</Button>
        <Button disabled={!ready && !isDone(dk)} onClick={() => markDone(dk)}>{isDone(dk) ? '✓ ' : ''}{ui('markDone')}</Button>
      </div>
      {sample && <pre className="whitespace-pre-wrap rounded-xl border border-border bg-muted/40 p-4 font-sans text-base leading-relaxed">{w.sample}</pre>}
      <ExerciseRunner exercises={w.exercises} sectionKey={key(m, 'writing', 'drills')} />
    </div>
  );
}

/* ───────── Test ───────── */
export function TestSection({ m }: { m: CourseModule }) {
  const ui = useUI();
  return (
    <div className="space-y-5">
      <p>{ui('testIntro')} {m.test.passPercent}%.</p>
      <ExerciseRunner exercises={m.test.exercises} sectionKey={key(m, 'test')} passPercent={m.test.passPercent} />
    </div>
  );
}

/* ───────── Підвкладки ───────── */
function SubTabs({ items, value, onChange }: { items: { id: string; label: string; done?: boolean }[]; value: string; onChange: (id: string) => void }) {
  return (
    <div role="tablist" className="flex flex-wrap gap-2">
      {items.map(it => (
        <button key={it.id} role="tab" aria-selected={it.id === value} type="button" onClick={() => onChange(it.id)}
          className={cn('rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
            it.id === value ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted')}>
          {it.done && '✓ '}{it.label}
        </button>
      ))}
    </div>
  );
}
