export type Lang = "uk" | "ru";
/** Three independent editions; missing fields fall back to German. */
export interface Localized { de: string; uk?: string; ru?: string }

export type Block = "K" | "AL" | "EX" | "CA" | "PR" | "MD" | "TC" | "LG";

export interface CatalogCourse {
  code: string;
  title: string;
  block: Block;
  entryLevel: string;
  targetLevel: string;
  hoursUE: number | null;
  hoursMin: number | null;
  hoursMax: number | null;
  hoursRaw: string;
  result: string;
  finalTask: string;
  notes: string;
  status: "draft" | "ready";
}

export type StageType = "repetition" | "input" | "practice" | "task" | "feedback";

interface ExBase { id: string; prompt: Localized; audioUrl?: string; videoUrl?: string }

export interface LueckentextEx extends ExBase {
  type: "Lueckentext";
  /** Use {{1}}, {{2}} … as gap markers. */
  text: string;
  gaps: Record<string, string[]>;
}
export interface ZuordnungEx extends ExBase { type: "Zuordnung"; pairs: { left: string; right: string }[] }
export interface MultipleChoiceEx extends ExBase {
  type: "MultipleChoice"; question: string; options: string[]; correct: number[];
}
export interface SatzbauEx extends ExBase { type: "Satzbau"; words: string[]; validAnswers: string[] }
export interface FehlerkorrekturEx extends ExBase { type: "Fehlerkorrektur"; sentence: string; validAnswers: string[] }
export interface QuestionItem { question: string; options: string[]; correct: number[] }
export interface HoerverstehenEx extends ExBase { type: "Hoerverstehen"; transcript?: string; questions: QuestionItem[] }
export interface LeseverstehenEx extends ExBase { type: "Leseverstehen"; text: string; questions: QuestionItem[] }
export interface DiktatEx extends ExBase { type: "Diktat"; validAnswers: string[] }
export interface VoiceAnswerEx extends ExBase {
  type: "VoiceAnswer";
  /** Marks the attempt as a "new situation" scenario for the passport. */
  newSituation?: boolean;
  sampleText?: Localized;
}

export type Exercise =
  | LueckentextEx | ZuordnungEx | MultipleChoiceEx | SatzbauEx | FehlerkorrekturEx
  | HoerverstehenEx | LeseverstehenEx | DiktatEx | VoiceAnswerEx;

export interface Stage { type: StageType; explanation?: Localized; exercises: Exercise[] }
export interface Lesson { id: string; title: Localized; stages: Stage[] }
export interface CourseContent {
  code: string;
  canDo: { key: string } & Localized;
  lessons: Lesson[];
}

export const RUBRIC_CRITERIA = ["task", "coherence", "vocabulary", "grammar", "pronunciation"] as const;
export type RubricCriterion = typeof RUBRIC_CRITERIA[number];
/** 0 = не виконано, 1 = недостатньо, 2 = достатньо, 3 = добре */
export type Rubric = Record<RubricCriterion, number>;
export const SUFFICIENT = 2;

export const pick = (l: Localized | undefined, lang: Lang): string =>
  !l ? "" : (l[lang] && l[lang]!.trim()) ? l[lang]! : l.de;
