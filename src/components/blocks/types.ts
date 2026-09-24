/** Блочна система уроків (DaF): типи блоків, ключі, підрахунок балів. */

export const BLOCK_TYPES = [
  "topic",
  "table",
  "callout",
  "image",
  "theorie",
  "hoer",
  "lesen",
  "luecke",
  "paare",
  "satzbau",
  "schreiben",
  "artikel",
  "transformation",
  "modell",
  "bild",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_META: Record<BlockType, { label: string; de: string; icon: string; hint: string }> = {
  topic: { label: "Заголовок теми", de: "Thema", icon: "heading", hint: "Параграф, заголовок та вступ" },
  table: { label: "Таблиця", de: "Grammatik-Tabelle", icon: "table", hint: "Колонки й закінчення" },
  callout: { label: "Правило / примітка", de: "Merke!", icon: "info", hint: "Виділене пояснення" },
  image: { label: "Ілюстрація", de: "Abbildung", icon: "image", hint: "Фото книги з підписом" },
  theorie: { label: "Теорія", de: "Grammatik & Theorie", icon: "graduation-cap", hint: "Правило з прикладами" },
  hoer: { label: "Аудіювання", de: "Hörverstehen", icon: "headphones", hint: "Аудіо + транскрипт" },
  lesen: { label: "Читання і лексика", de: "Leseverstehen & Wortschatz", icon: "book-open", hint: "Текст із клікабельними словами" },
  luecke: { label: "Пропуски", de: "Lückentext", icon: "pencil-line", hint: "Відмінки, прийменники, закінчення" },
  paare: { label: "Пари", de: "Wortpaare / Zuordnung", icon: "link", hint: "З'єднати ліве з правим" },
  satzbau: { label: "Порядок слів", de: "Satzbau", icon: "list-ordered", hint: "Скласти речення зі слів" },
  schreiben: { label: "Письмо і мовлення", de: "Schreiben & Sprechen", icon: "mic", hint: "Есе + голосова відповідь" },
  artikel: { label: "Артиклі", de: "Artikeltraining", icon: "tags", hint: "Вибір der / die / das / Plural" },
  transformation: { label: "Перетворення речень", de: "Satzumformung", icon: "repeat", hint: "Зразок і відповідь" },
  modell: { label: "Інтерактивна модель", de: "Interaktives Modell", icon: "mouse-pointer", hint: "Око, вухо, серце, клітина або власний SVG" },
  bild: { label: "Слово за картинкою", de: "Bild-Wortschatz", icon: "image-plus", hint: "Картинка + артикль і слово" },
};

export type Artikel = "der" | "die" | "das" | "plural";

export interface VocabWord {
  de: string;
  uk: string;
  artikel?: Artikel | null;
  plural?: string | null;
}

export interface TranscriptLine {
  t?: number | null;
  de: string;
  uk?: string | null;
}

export interface LueckeItem {
  /** Речення з одним `___` на місці пропуску. */
  sentence: string;
  answer: string;
  options?: string[];
  synonyms?: string[];
  hint?: string | null;
}

export interface SatzItem {
  /** Слова у правильному порядку. */
  words: string[];
  hint?: string | null;
}

export interface BlockPayload {
  instructions?: string | null;
  /** editorial blocks */
  chapter?: string;
  subtitle?: string;
  intro?: string;
  columns?: string[];
  rows?: string[][];
  tone?: "note" | "warning" | "example";
  image_path?: string;
  caption?: string;
  context?: string;
  hotspots?: Array<{ x: number; y: number; label: string; text?: string }>;
  article_items?: Array<{ word: string; article: Artikel; hint?: string }>;
  transformations?: Array<{ source: string; answer: string; hint?: string }>;
  example?: { source: string; answer: string };
  /** modell: клікабельна модель (готова або власний SVG із data-part) */
  model?: string;
  svg?: string;
  parts?: Array<{ id: string; label: string; article?: Artikel | null; text?: string }>;
  /** theorie */
  markdown?: string;
  examples?: Array<{ de: string; uk?: string | null }>;
  /** hoer */
  audio_path?: string | null;
  transcript?: TranscriptLine[];
  /** lesen */
  text?: string;
  words?: VocabWord[];
  /** luecke */
  mode?: "select" | "input";
  items?: LueckeItem[];
  /** paare */
  pairs?: Array<{ left: string; right: string }>;
  /** satzbau */
  sentences?: SatzItem[];
  /** schreiben */
  prompt?: string;
  redemittel?: string[];
  min_words?: number;
  allow_voice?: boolean;
  /** bild: вгадати слово за картинкою */
  bild_mode?: "artikel" | "choice" | "input";
  picture_items?: PictureItem[];
}

export interface PictureItem {
  /** URL або шлях у сховищі. */
  image: string;
  word: string;
  artikel?: Artikel | null;
  uk?: string | null;
  options?: string[];
}

export interface LessonBlock {
  id: string;
  lesson_id: string;
  type: BlockType | string;
  title: string | null;
  sort_order: number;
  visible_to_student: boolean;
  payload: BlockPayload;
  source: string;
  book_page_id: string | null;
}

/** Кольори роду артикля — однакові по всій платформі. */
export const ARTIKEL_CLASS: Record<Artikel, string> = {
  der: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-800",
  die: "bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950 dark:text-pink-200 dark:border-pink-800",
  das: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800",
  plural: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800",
};

export const norm = (v: unknown) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export function isCorrectText(given: unknown, answer: string, synonyms?: string[]): boolean {
  const g = norm(given);
  if (!g) return false;
  if (g === norm(answer)) return true;
  return (synonyms ?? []).some((s) => norm(s) === g);
}

/** Скільки балів дає блок і скільки набрано відповідями учня. */
export function scoreBlock(block: LessonBlock, value: any): { score: number; max: number } {
  const p = block.payload || {};
  switch (block.type) {
    case "luecke": {
      const items = p.items ?? [];
      let score = 0;
      items.forEach((it, i) => {
        if (isCorrectText(value?.[i], it.answer, it.synonyms)) score++;
      });
      return { score, max: items.length };
    }
    case "paare": {
      const pairs = p.pairs ?? [];
      let score = 0;
      pairs.forEach((pr, i) => {
        if (norm(value?.[i]) === norm(pr.right)) score++;
      });
      return { score, max: pairs.length };
    }
    case "satzbau": {
      const sentences = p.sentences ?? [];
      let score = 0;
      sentences.forEach((s, i) => {
        const given: string[] = value?.[i] ?? [];
        if (given.length === s.words.length && given.every((w, j) => norm(w) === norm(s.words[j]))) score++;
      });
      return { score, max: sentences.length };
    }
    case "schreiben": {
      const text = String(value?.text ?? "").trim();
      const min = p.min_words ?? 20;
      const words = text ? text.split(/\s+/).length : 0;
      return { score: words >= min ? 1 : 0, max: 1 };
    }
    case "artikel": {
      const items = p.article_items ?? [];
      return { score: items.filter((item, i) => value?.[i] === item.article).length, max: items.length };
    }
    case "transformation": {
      const items = p.transformations ?? [];
      return { score: items.filter((item, i) => isCorrectText(value?.[i], item.answer)).length, max: items.length };
    }
    case "modell": {
      const parts = p.parts ?? [];
      if (!parts.length) return { score: 0, max: 0 };
      return { score: parts.filter((part) => value?.[part.id]).length, max: parts.length };
    }
    case "bild": {
      const items = p.picture_items ?? [];
      const needArtikel = (p.bild_mode ?? "artikel") === "artikel";
      const score = items.filter((item, i) => {
        const given = value?.[i] ?? {};
        const wordOk = isCorrectText(given.word, item.word);
        return needArtikel ? wordOk && given.artikel === (item.artikel ?? null) : wordOk;
      }).length;
      return { score, max: items.length };
    }
    default:
      return { score: 0, max: 0 };
  }
}

export function emptyPayload(type: BlockType): BlockPayload {
  switch (type) {
    case "topic": return { chapter: "§ 1", subtitle: "", intro: "" };
    case "table": return { columns: ["Form", "Beispiel", "Bedeutung"], rows: [["ich", "hätte", "я мав би"]] };
    case "callout": return { tone: "note", markdown: "Важливе правило та приклад." };
    case "image": return { image_path: "", caption: "", context: "" };
    case "modell": return { instructions: "Натисніть на частину моделі та вивчіть слово з артиклем.", model: "auge", parts: [] };
    case "artikel": return { instructions: "Wählen Sie den richtigen Artikel.", article_items: [{ word: "Buch", article: "das" }] };
    case "transformation": return { instructions: "Formen Sie die Sätze um.", example: { source: "Ich habe Zeit.", answer: "Wenn ich Zeit hätte, ..." }, transformations: [{ source: "Ich bin reich.", answer: "Wenn ich reich wäre." }] };
    case "theorie":
      return {
        instructions: "Прочитайте правило.",
        markdown: "## Правило\n\nКоротке пояснення українською.\n\n- пункт перший\n- пункт другий",
        examples: [{ de: "Ich gehe ins Kino.", uk: "Я йду в кіно." }],
      };
    case "hoer":
      return { instructions: "Послухайте запис і виконайте завдання.", transcript: [{ t: 0, de: "" }] };
    case "lesen":
      return { instructions: "Прочитайте текст.", text: "", words: [] };
    case "luecke":
      return { instructions: "Вставте правильне слово.", mode: "select", items: [{ sentence: "Das Buch liegt ___ dem Tisch.", answer: "auf", options: ["auf", "an", "in", "unter"], synonyms: [], hint: "Dativ — Wo?" }] };
    case "paare":
      return { instructions: "З'єднайте пари.", pairs: [{ left: "warten", right: "auf + Akk." }] };
    case "satzbau":
      return { instructions: "Складіть речення.", sentences: [{ words: ["Ich", "gehe", "heute", "ins", "Kino"], hint: "Дієслово на 2 місці" }] };
    case "schreiben":
      return {
        instructions: "Напишіть відповідь і запишіть її голосом.",
        prompt: "Beschreiben Sie Ihr Zimmer.",
        redemittel: ["Mein Zimmer ist ...", "In der Ecke steht ...", "An der Wand hängt ..."],
        min_words: 30,
        allow_voice: true,
      };
    case "bild":
      return {
        instructions: "Подивіться на картинку та впишіть слово з артиклем.",
        bild_mode: "artikel",
        picture_items: [{ image: "", word: "Apfel", artikel: "der", uk: "яблуко", options: [] }],
      };
  }
}
