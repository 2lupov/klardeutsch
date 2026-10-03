import { createContext, useContext, type ReactNode } from 'react';
import type { Lang, T } from './types';

interface Ctx { lang: Lang; setLang: (l: Lang) => void }
const LangContext = createContext<Ctx>({ lang: 'ua', setLang: () => {} });
export const useLang = () => useContext(LangContext);

export function LangProvider({ lang, setLang, children }: Ctx & { children: ReactNode }) {
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export const tx = (v: T, lang: Lang): string => (typeof v === 'string' ? v : v[lang]);
export function Tx({ v }: { v: T }) { const { lang } = useLang(); return <>{tx(v, lang)}</>; }

export const UI = {
  course: { ua: 'Німецька A2', de: 'Deutsch A2' },
  modules: { ua: 'Модулі', de: 'Module' },
  module: { ua: 'Модуль', de: 'Modul' },
  soon: { ua: 'Скоро', de: 'Bald' },
  explanations: { ua: 'Пояснення', de: 'Erklärungen' },
  objectives: { ua: 'Що ти вмітимеш після модуля', de: 'Das kannst du nach diesem Modul' },
  check: { ua: 'Перевірити', de: 'Prüfen' },
  next: { ua: 'Далі', de: 'Weiter' },
  finish: { ua: 'Завершити', de: 'Fertig' },
  reset: { ua: 'Скинути', de: 'Zurücksetzen' },
  correct: { ua: 'Правильно!', de: 'Richtig!' },
  wrong: { ua: 'Не зовсім. Правильно:', de: 'Nicht ganz. Richtig:' },
  yourResult: { ua: 'Твій результат', de: 'Dein Ergebnis' },
  again: { ua: 'Пройти ще раз', de: 'Nochmal' },
  retryMistakes: { ua: 'Повторити помилки', de: 'Fehler wiederholen' },
  passed: { ua: 'Секція зарахована.', de: 'Abschnitt geschafft.' },
  notPassed: { ua: 'Для заліку потрібно більше. Спробуй ще раз.', de: 'Das reicht noch nicht. Versuche es nochmal.' },
  startPractice: { ua: 'Почати вправи', de: 'Übungen starten' },
  theory: { ua: 'Теорія', de: 'Theorie' },
  practice: { ua: 'Практика', de: 'Übung' },
  exercise: { ua: 'Вправа', de: 'Aufgabe' },
  typeHere: { ua: 'Напиши тут', de: 'Schreibe hier' },
  chooseDots: { ua: '…', de: '…' },
  undo: { ua: 'Прибрати', de: 'Entfernen' },
  flip: { ua: 'Перевернути', de: 'Umdrehen' },
  know: { ua: 'Знаю', de: 'Weiß ich' },
  again2: { ua: 'Ще раз', de: 'Nochmal' },
  words: { ua: 'слів', de: 'Wörter' },
  showList: { ua: 'Показати список слів', de: 'Wortliste anzeigen' },
  hideList: { ua: 'Сховати список слів', de: 'Wortliste verbergen' },
  videoSlot: { ua: 'Тут буде відео-урок. Додай посилання в поле video.url.', de: 'Hier erscheint das Video. Trage den Link in video.url ein.' },
  audioSlot: { ua: 'Тут буде аудіо. Додай посилання в поле audioUrl.', de: 'Hier erscheint das Audio. Trage den Link in audioUrl ein.' },
  watched: { ua: 'Переглянув(ла)', de: 'Gesehen' },
  chapters: { ua: 'Зміст відео', de: 'Inhalt des Videos' },
  glossary: { ua: 'Словничок до тексту', de: 'Wörter zum Text' },
  transcript: { ua: 'Транскрипт', de: 'Transkript' },
  transcriptLocked: { ua: 'Транскрипт відкриється після вправ.', de: 'Das Transkript öffnet sich nach den Aufgaben.' },
  showNow: { ua: 'Показати зараз', de: 'Jetzt zeigen' },
  hideTranscript: { ua: 'Сховати транскрипт', de: 'Transkript verbergen' },
  task: { ua: 'Завдання', de: 'Aufgabe' },
  yourText: { ua: 'Твій текст', de: 'Dein Text' },
  checklist: { ua: 'Чек-лист самоперевірки', de: 'Checkliste' },
  showSample: { ua: 'Показати зразок', de: 'Beispiel anzeigen' },
  hideSample: { ua: 'Сховати зразок', de: 'Beispiel verbergen' },
  wordCount: { ua: 'слів', de: 'Wörter' },
  needWords: { ua: 'Потрібно', de: 'Gefordert' },
  markDone: { ua: 'Зарахувати завдання', de: 'Aufgabe abschließen' },
  testIntro: { ua: 'Підсумковий тест модуля. Для заліку потрібно', de: 'Abschlusstest des Moduls. Zum Bestehen brauchst du' },
  prev: { ua: 'Назад', de: 'Zurück' },
} satisfies Record<string, { ua: string; de: string }>;
export type UIKey = keyof typeof UI;
export function useUI() { const { lang } = useLang(); return (k: UIKey) => UI[k][lang]; }
