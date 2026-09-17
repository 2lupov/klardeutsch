import type { BlockPayload, BlockType } from "./types";

export interface DemoBlock {
  type: BlockType;
  title: string;
  payload: BlockPayload;
}

/** Демо-розворот: Schritte Plus Neu A2, Lektion 3 — Wohnen und Möbel, Wechselpräpositionen. */
export const DEMO_LEKTION: DemoBlock[] = [
  {
    type: "hoer",
    title: "Hörverstehen: Die neue Wohnung (Track 12)",
    payload: {
      instructions: "Послухайте діалог і потім прочитайте транскрипт.",
      transcript: [
        { t: 0, de: "Schau mal, das ist unsere neue Wohnung!", uk: "Дивись, це наша нова квартира!" },
        { t: 4, de: "Wo stellen wir das Sofa hin?", uk: "Куди ми поставимо диван?" },
        { t: 8, de: "Am besten an die Wand, neben das Fenster.", uk: "Найкраще до стіни, біля вікна." },
        { t: 13, de: "Und der Teppich liegt schon unter dem Tisch.", uk: "А килим уже лежить під столом." },
        { t: 18, de: "Perfekt. Dann hängen wir das Bild über das Sofa.", uk: "Чудово. Тоді повісимо картину над диваном." },
      ],
    },
  },
  {
    type: "lesen",
    title: "Leseverstehen: Mein Zimmer",
    payload: {
      instructions: "Прочитайте текст. Натисніть на виділені слова, щоб побачити переклад і рід.",
      text: "Mein Zimmer ist klein, aber gemütlich. Der Schrank steht neben der Tür. Das Bett steht am Fenster, und über dem Bett hängt ein Bild. Der Teppich liegt auf dem Boden vor dem Sofa. Auf dem Regal stehen meine Bücher, und in der Ecke steht eine Lampe. Die Möbel sind alt, aber praktisch.",
      words: [
        { de: "Zimmer", uk: "кімната", artikel: "das", plural: "die Zimmer" },
        { de: "Schrank", uk: "шафа", artikel: "der", plural: "die Schränke" },
        { de: "Bett", uk: "ліжко", artikel: "das", plural: "die Betten" },
        { de: "Bild", uk: "картина", artikel: "das", plural: "die Bilder" },
        { de: "Teppich", uk: "килим", artikel: "der", plural: "die Teppiche" },
        { de: "Regal", uk: "полиця", artikel: "das", plural: "die Regale" },
        { de: "Lampe", uk: "лампа", artikel: "die", plural: "die Lampen" },
        { de: "Möbel", uk: "меблі", artikel: "plural", plural: "die Möbel" },
        { de: "Ecke", uk: "кут", artikel: "die", plural: "die Ecken" },
        { de: "Tür", uk: "двері", artikel: "die", plural: "die Türen" },
      ],
    },
  },
  {
    type: "luecke",
    title: "Lückentext: Wechselpräpositionen in / an / auf / unter",
    payload: {
      instructions: "Виберіть правильний прийменник або форму. Натисніть на пропуск.",
      mode: "select",
      items: [
        { sentence: "Das Buch liegt ___ dem Tisch.", answer: "auf", options: ["auf", "an", "in", "unter"], hint: "Wo? → Dativ, поверхня" },
        { sentence: "Ich hänge das Bild ___ die Wand.", answer: "an", options: ["an", "auf", "über", "in"], hint: "Wohin? → Akkusativ, вертикальна поверхня" },
        { sentence: "Die Katze schläft ___ dem Bett.", answer: "unter", options: ["unter", "auf", "an", "neben"], hint: "Wo? → Dativ" },
        { sentence: "Wir stellen die Lampe ___ die Ecke.", answer: "in", options: ["in", "an", "auf", "unter"], hint: "Wohin? → Akkusativ" },
        { sentence: "Die Schuhe stehen ___ der Tür.", answer: "vor", options: ["vor", "auf", "über", "in"], hint: "Wo? → Dativ" },
        { sentence: "Häng die Jacke bitte ___ den Schrank!", answer: "in", options: ["in", "an", "auf", "unter"], hint: "Wohin? → Akkusativ" },
      ],
    },
  },
  {
    type: "satzbau",
    title: "Satzbau: Wo steht was?",
    payload: {
      instructions: "Складіть речення. Пам'ятайте: у Hauptsatz дієслово на 2 місці.",
      sentences: [
        { words: ["Der", "Schrank", "steht", "neben", "der", "Tür"], hint: "Дієслово на 2 місці" },
        { words: ["Ich", "hänge", "das", "Bild", "über", "das", "Sofa"], hint: "Wohin? → Akkusativ" },
        { words: ["Wir", "wissen", "nicht", "wo", "der", "Teppich", "liegt"], hint: "Nebensatz — дієслово в кінці" },
      ],
    },
  },
  {
    type: "paare",
    title: "Zuordnung: Verb + Präposition",
    payload: {
      instructions: "З'єднайте дієслово з правильним керуванням.",
      pairs: [
        { left: "warten", right: "auf + Akk." },
        { left: "denken", right: "an + Akk." },
        { left: "sich freuen", right: "über + Akk." },
        { left: "helfen", right: "+ Dativ" },
        { left: "sprechen", right: "mit + Dativ" },
        { left: "Angst haben", right: "vor + Dativ" },
      ],
    },
  },
  {
    type: "schreiben",
    title: "Schreiben & Sprechen: Mein Traumzimmer",
    payload: {
      instructions: "Напишіть 30+ слів і запишіть відповідь голосом.",
      prompt: "Beschreiben Sie Ihr Traumzimmer: Welche Möbel stehen wo?",
      redemittel: ["In meinem Traumzimmer gibt es ...", "Links / rechts steht ...", "An der Wand hängt ...", "Auf dem Boden liegt ..."],
      min_words: 30,
      allow_voice: true,
    },
  },
];
