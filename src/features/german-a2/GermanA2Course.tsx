import { useEffect, useMemo, useState } from 'react';
import type { CourseModule, Lang, PlannedModule } from './types';
import { LangProvider, tx, useLang, useUI } from './i18n';
import { ProgressProvider, createLocalStorageStore, useProgress, type ProgressStore } from './progress';
import { cn } from './components/ui';
import { GrammarSection, ListeningSection, NvvSection, ReadingSection, TestSection, VideoSection, VocabSection, WritingSection } from './components/sections';
import { MODULES, PLANNED } from './modules';

type SectionId = 'video' | 'vocab' | 'grammar' | 'nvv' | 'reading' | 'listening' | 'writing' | 'test';
const SECTIONS: { id: SectionId; label: { ua: string; de: string } }[] = [
  { id: 'video', label: { ua: 'Відео', de: 'Video' } },
  { id: 'vocab', label: { ua: 'Wortschatz', de: 'Wortschatz' } },
  { id: 'grammar', label: { ua: 'Grammatik', de: 'Grammatik' } },
  { id: 'nvv', label: { ua: 'Nomen-Verb', de: 'Nomen-Verb' } },
  { id: 'reading', label: { ua: 'Lesen', de: 'Lesen' } },
  { id: 'listening', label: { ua: 'Hören', de: 'Hören' } },
  { id: 'writing', label: { ua: 'Schreiben', de: 'Schreiben' } },
  { id: 'test', label: { ua: 'Тест', de: 'Test' } },
];

export interface GermanA2CourseProps {
  /** Сховище прогресу. За замовчуванням — localStorage. */
  store?: ProgressStore;
  /** Мова пояснень за замовчуванням (поки немає збереженого вибору). */
  defaultLang?: Lang;
  /** Початковий модуль / секція. */
  initialModule?: string;
  initialSection?: SectionId;
  /** Викликається при зміні модуля/секції — зручно для синхронізації з URL. */
  onNavigate?: (moduleId: string, section: SectionId) => void;
  className?: string;
}

export function GermanA2Course({ store, defaultLang = 'ua', ...rest }: GermanA2CourseProps) {
  const s = useMemo(() => store ?? createLocalStorageStore(), [store]);
  return (
    <ProgressProvider store={s}>
      <Shell defaultLang={defaultLang} {...rest} />
    </ProgressProvider>
  );
}

function Shell({ defaultLang, initialModule, initialSection, onNavigate, className }: Omit<GermanA2CourseProps, 'store'> & { defaultLang: Lang }) {
  const { progress, ready, setLangPref } = useProgress();
  const [lang, setLang] = useState<Lang>(defaultLang);
  useEffect(() => { if (ready && progress.lang) setLang(progress.lang); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  const change = (l: Lang) => { setLang(l); setLangPref(l); };

  const [moduleId, setModuleId] = useState(initialModule ?? MODULES[0]!.id);
  const [section, setSection] = useState<SectionId>(initialSection ?? 'video');
  const go = (m: string, sec: SectionId) => { setModuleId(m); setSection(sec); onNavigate?.(m, sec); };

  return (
    <LangProvider lang={lang} setLang={change}>
      <div className={cn('text-foreground', className)}>
        <TopBar />
        <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
          <ModuleList current={moduleId} onPick={id => go(id, 'video')} />
          <ModuleView key={moduleId} m={MODULES.find(x => x.id === moduleId)!} section={section} onSection={sec => go(moduleId, sec)} />
        </div>
      </div>
    </LangProvider>
  );
}

function TopBar() {
  const ui = useUI(); const { lang, setLang } = useLang();
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold">{ui('course')}</h2>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{ui('explanations')}:</span>
        <div role="group" className="inline-flex overflow-hidden rounded-md border border-border">
          {(['ua', 'de'] as const).map(l => (
            <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
              className={cn('px-3 py-1.5 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring', lang === l ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              {l === 'ua' ? 'UA' : 'DE'}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}

function moduleProgress(m: CourseModule, isDone: (k: string) => boolean) {
  const keys = [
    `${m.id}:video`, ...m.vocab.map(v => `${m.id}:vocab:${v.id}`), ...m.grammar.map(g => `${m.id}:grammar:${g.id}`),
    `${m.id}:nvv`, `${m.id}:reading`, `${m.id}:listening`, `${m.id}:writing`, `${m.id}:test`,
  ];
  return { done: keys.filter(isDone).length, total: keys.length };
}

function ModuleList({ current, onPick }: { current: string; onPick: (id: string) => void }) {
  const ui = useUI(); const { lang } = useLang(); const { isDone } = useProgress();
  const planned: PlannedModule[] = PLANNED.filter(p => !MODULES.some(m => m.number === p.number));
  return (
    <nav aria-label={ui('modules')} className="lg:sticky lg:top-4 lg:self-start">
      <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {[...MODULES.map(m => ({ n: m.number, id: m.id as string | null, title: m.title, pr: moduleProgress(m, isDone) })),
          ...planned.map(p => ({ n: p.number, id: null, title: p.title, pr: null }))]
          .sort((a, b) => a.n - b.n)
          .map(it => (
            <li key={it.n} className="shrink-0 lg:shrink">
              <button type="button" disabled={!it.id} onClick={() => it.id && onPick(it.id)} aria-current={it.id === current}
                className={cn('w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
                  it.id === current ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted', !it.id && 'opacity-50')}>
                <span className="block font-medium">{it.n}. {tx(it.title, lang)}</span>
                <span className="block text-xs text-muted-foreground">
                  {it.pr ? `${it.pr.done}/${it.pr.total}` : ui('soon')}
                </span>
              </button>
            </li>
          ))}
      </ul>
    </nav>
  );
}

function ModuleView({ m, section, onSection }: { m: CourseModule; section: SectionId; onSection: (s: SectionId) => void }) {
  const ui = useUI(); const { lang } = useLang(); const { isDone } = useProgress();
  const secDone = (id: SectionId) => {
    if (id === 'vocab') return m.vocab.every(v => isDone(`${m.id}:vocab:${v.id}`));
    if (id === 'grammar') return m.grammar.every(g => isDone(`${m.id}:grammar:${g.id}`));
    return isDone(`${m.id}:${id}`);
  };
  return (
    <main className="min-w-0">
      <div className="mb-5">
        <h3 className="text-3xl font-semibold">{ui('module')} {m.number}: {tx(m.title, lang)}</h3>
        <p className="text-muted-foreground">{tx(m.subtitle, lang)}</p>
        <details className="mt-3 rounded-lg border border-border px-4 py-2">
          <summary className="cursor-pointer text-sm font-medium">{ui('objectives')}</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{m.objectives.map((o, i) => <li key={i}>{tx(o, lang)}</li>)}</ul>
        </details>
      </div>
      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {SECTIONS.map(s => (
          <button key={s.id} role="tab" type="button" aria-selected={section === s.id} onClick={() => onSection(s.id)}
            className={cn('-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring',
              section === s.id ? 'border-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {secDone(s.id) && <span className="text-emerald-600 dark:text-emerald-400">✓ </span>}{tx(s.label, lang)}
          </button>
        ))}
      </div>
      {section === 'video' && <VideoSection m={m} />}
      {section === 'vocab' && <VocabSection m={m} />}
      {section === 'grammar' && <GrammarSection m={m} />}
      {section === 'nvv' && <NvvSection m={m} />}
      {section === 'reading' && <ReadingSection m={m} />}
      {section === 'listening' && <ListeningSection m={m} />}
      {section === 'writing' && <WritingSection m={m} />}
      {section === 'test' && <TestSection m={m} />}
    </main>
  );
}
