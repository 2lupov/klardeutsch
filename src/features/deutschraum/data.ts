import courseJson from "./data/course.json";
import examsJson from "./data/exams.json";

export type L = "ru" | "uk" | "de";
export type Tr = Record<L, string>;

export interface Question {
  prompt: string;
  answer: string;
  options: string[] | null;
  explanation: Tr;
}
export interface VocabItem { de: string; ru: string; uk: string; example: string; definition: string }
export interface TextBlock { text: string; questions: Question[] }
export interface Module {
  id: number;
  title: Tr;
  grammar: string;
  rule: Tr;
  vocab: VocabItem[];
  practice: Question[];
  reading: TextBlock;
  listening: TextBlock;
  writing: { prompt: Tr; model: string }[];
  speaking: Tr[];
}
export interface Exam {
  id: number;
  notes: { text: string; question: Question }[];
  radio: { text: string; question: Question }[];
  dialog: TextBlock & { options: string[] };
  directory: TextBlock;
  article: TextBlock;
  ads: { items: Record<string, string>; questions: Question[] };
  person: string;
  fields: Question[];
  letter: string;
  model: string;
  oral: string[];
}

export const MODULES = (courseJson as any).modules as Module[];
export const EXAM_SOURCE = (courseJson as any).examSource as string;
export const BUILTIN_MEDIA = ((courseJson as any).media ?? {}) as Record<string, string>;
export const EXAMS = examsJson as unknown as Exam[];

export const SECTIONS = ["theory", "vocab", "grammar", "reading", "listening", "writing", "speaking"] as const;
export type Section = (typeof SECTIONS)[number];

/** Normalises a typed answer for comparison: case, spaces, final punctuation. */
export const normalize = (s: string) =>
  s.toLowerCase().replace(/[.,!?;:„“"']/g, "").replace(/\s+/g, " ").trim();
export const isCorrect = (given: string, answer: string) => normalize(given) === normalize(answer);

/** Deterministic shuffle so options don't jump between renders. */
export function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const EXAM_AUTO_ITEMS = 35; // 15 Hören + 15 Lesen + 5 Formular

export function scoreExam(exam: Exam, answers: Record<string, string>) {
  const items: { key: string; q: Question }[] = [
    ...exam.notes.map((n, i) => ({ key: `h1-${i}`, q: n.question })),
    ...exam.radio.map((n, i) => ({ key: `h2-${i}`, q: n.question })),
    ...exam.dialog.questions.map((q, i) => ({ key: `h3-${i}`, q })),
    ...exam.directory.questions.map((q, i) => ({ key: `l1-${i}`, q })),
    ...exam.article.questions.map((q, i) => ({ key: `l2-${i}`, q })),
    ...exam.ads.questions.map((q, i) => ({ key: `l3-${i}`, q })),
    ...exam.fields.map((q, i) => ({ key: `f-${i}`, q })),
  ];
  const correct = items.filter((it) => answers[it.key] != null && isCorrect(answers[it.key], it.q.answer)).length;
  return { correct, total: items.length, percent: Math.round((correct / items.length) * 100) };
}
