export type Lang = 'ua' | 'de';
/** Текст з двома версіями: пояснення мовою інтерфейсу. */
export interface L { ua: string; de: string }
/** Рядок (німецький контент, однаковий для обох мов) або двомовний текст. */
export type T = string | L;

/* ───────────── Вправи ───────────── */
interface Base { /** Інструкція до вправи. Якщо не вказана — стандартна для типу. */ prompt?: L; /** Пояснення, яке показується після відповіді. */ explain?: L }

/** Вибір відповіді. `answer` — індекс правильного варіанта в `options`. */
export interface MC extends Base { type: 'mc'; q: T; options: T[]; answer: number; keepOrder?: boolean }
/** Пропуски з введенням. У тексті: `{{відповідь}}` або `{{варіант1|варіант2}}`. */
export interface Gap extends Base { type: 'gap'; text: string; hint?: T }
/** Пропуски з випадаючим списком. У тексті: `[[правильний|хибний1|хибний2]]` — перший завжди правильний (порядок перемішується). */
export interface GapSelect extends Base { type: 'gapselect'; text: string }
/** Складання речення. `words` — у правильному порядку; `alt` — інші правильні порядки; `extra` — зайві слова. */
export interface Order extends Base { type: 'order'; words: string[]; alt?: string[][]; extra?: string[]; translation?: string }
/** З’єднати пари [ліве, праве]. */
export interface Match extends Base { type: 'match'; pairs: [string, string][] }
/** Розподілити елементи [текст, індекс категорії] по категоріях. */
export interface Sort extends Base { type: 'sort'; categories: string[]; items: [string, number][] }
/** Виправити помилку в реченні. */
export interface Fix extends Base { type: 'fix'; wrong: string; answers: string[] }
/** Переклад з української на німецьку. */
export interface Translate extends Base { type: 'translate'; ua: string; answers: string[] }
/** Діалог: репліки з вибором. */
export type DialogueTurn = { who: string; line: string } | { who: string; options: string[]; answer: number };
export interface Dialogue extends Base { type: 'dialogue'; turns: DialogueTurn[] }

export type Exercise = MC | Gap | GapSelect | Order | Match | Sort | Fix | Translate | Dialogue;

/* ───────────── Теорія ───────────── */
export type Role = 'subj' | 'aux' | 'part' | 'time' | 'obj' | 'neg' | 'verb';
export type Block =
  | { t: 'h'; text: L }
  | { t: 'p'; text: L }
  | { t: 'tip'; text: L }
  | { t: 'warn'; text: L }
  | { t: 'list'; items: L[] }
  | { t: 'table'; head: T[]; rows: T[][]; caption?: L }
  | { t: 'examples'; items: { de: string; ua: string }[] }
  /** «Анатомія речення»: слова з кольоровими ролями. */
  | { t: 'sentence'; words: { w: string; role?: Role }[]; ua?: string; note?: L };

/* ───────────── Модуль ───────────── */
export interface VocabItem { de: string; ua: string; extra?: string; example?: string }
export interface VocabGroup { id: string; title: L; intro?: L; items: VocabItem[]; exercises: Exercise[] }
export interface GrammarTopic { id: string; title: L; blocks: Block[]; exercises: Exercise[] }
export interface NvvItem { phrase: string; ua: string; example: string }

export interface CourseModule {
  id: string;
  number: number;
  title: L;
  subtitle: L;
  objectives: L[];
  video: { url?: string; title: L; chapters: L[] };
  vocab: VocabGroup[];
  grammar: GrammarTopic[];
  nvv: { intro: Block[]; items: NvvItem[]; exercises: Exercise[] };
  reading: { title: string; byline?: string; paragraphs: string[]; glossary: { de: string; ua: string }[]; exercises: Exercise[] };
  listening: {
    title: L; audioUrl?: string; instruction: L;
    /** Сценарій для озвучки в ElevenLabs (по рядках, з іменами спікерів). */
    transcript: { speaker?: string; text: string }[];
    exercises: Exercise[];
  };
  writing: { task: L; points: L[]; minWords: number; maxWords: number; checklist: L[]; sample: string; exercises: Exercise[] };
  test: { passPercent: number; exercises: Exercise[] };
}

export interface PlannedModule { number: number; title: L }
