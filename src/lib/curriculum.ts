// Фиксированная программа A0 → B2. Это и есть "курс", а не свободный выбор
// тем: порядок модулей задан здесь, ИИ наполняет контентом только внутри
// заданных рамок (тема + целевая грамматика), не придумывает сам, что учить
// дальше. grammarKey — ссылка на уже готовый урок в GRAMMAR (lib/dutch.ts) или
// BRIDGE/FALSE (GrammarBridge.tsx), grammarPrompt — для грамматики, которую
// ещё не написали руками: её сгенерирует ИИ в том же вызове, что и текст.

export type CourseLevel = "A0" | "A1" | "A2" | "B1" | "B2";

export type CurriculumModule = {
  id: string;
  level: CourseLevel;
  order: number; // сквозной порядок по всей программе, определяет разблокировку
  title: string;
  topic: string; // тема для генерации словаря/текста ИИ
  wordTarget: number;
  grammarKey?: string;     // точное title из GRAMMAR в lib/dutch.ts
  grammarSpecial?: "sounds"; // модуль 1: звуковые соответствия + ложные друзья из GrammarBridge
  grammarPrompt?: string;  // инструкция ИИ, если готового урока ещё нет
  isReview?: boolean;      // модуль-повторение в конце ступени: тест строже, новых слов меньше
};

export const CURRICULUM: CurriculumModule[] = [
  // --- A0 ---------------------------------------------------------------
  { id: "a0-1", level: "A0", order: 1, title: "Звуки и буквы", topic: "алфавит, базовые приветствия для первого знакомства со звучанием языка", wordTarget: 15, grammarSpecial: "sounds" },
  { id: "a0-2", level: "A0", order: 2, title: "Числа и вопросы", topic: "числа 0-100, вопросительные слова wat/wie/waar/wanneer/hoe", wordTarget: 25,
    grammarPrompt: "Образование вопросов в нидерландском: вопросительное слово + глагол на 2 месте (Wat is dit? Waar woon je?). 4-5 заданий на порядок слов в вопросе." },
  { id: "a0-3", level: "A0", order: 3, title: "Приветствия и вежливость", topic: "hallo, dag, alsjeblieft, dank je wel, tot ziens, sorry — формальное и неформальное приветствие", wordTarget: 25,
    grammarPrompt: "Формальное (u) и неформальное (jij/je) обращение в нидерландском — когда что уместно. 4-5 заданий на выбор формы." },
  { id: "a0-4", level: "A0", order: 4, title: "Zijn, hebben и de/het", topic: "ik ben, jij bent, hij is, ik heb — базовые формы, простые существительные", wordTarget: 30, grammarKey: "De или het" },

  // --- A1 -----------------------------------------------------------------
  { id: "a1-1", level: "A1", order: 5, title: "Семья", topic: "семья и притяжательные местоимения: mijn, jouw, zijn, haar, onze", wordTarget: 30,
    grammarPrompt: "Притяжательные местоимения нидерландского (mijn/jouw/zijn/haar/ons-onze/hun) и их согласование с de/het-словами. 4-5 заданий." },
  { id: "a1-2", level: "A1", order: 6, title: "День и время", topic: "распорядок дня, часы, дни недели, hoe laat is het", wordTarget: 35,
    grammarPrompt: "Называние времени по-нидерландски (hoe laat is het, half, kwart over/voor) и предлоги времени om/in/op. 4-5 заданий." },
  { id: "a1-3", level: "A1", order: 7, title: "Еда и рестораны", topic: "еда, напитки, заказ в кафе, lekker, alsjeblieft bij het bestellen", wordTarget: 35, grammarKey: "Прилагательные: mooi / mooie" },
  { id: "a1-4", level: "A1", order: 8, title: "Глаголы в настоящем", topic: "обычные занятия и хобби — werken, spelen, wonen, houden van", wordTarget: 30,
    grammarPrompt: "Спряжение правильных глаголов в настоящем времени (ik werk, jij werkt, hij werkt, wij werken) и позиция глагола во 2-м лице при вопросе (werk je...?). 5 заданий." },
  { id: "a1-5", level: "A1", order: 9, title: "Да, нет, не", topic: "простые утверждения и отрицания о себе и своей жизни", wordTarget: 25,
    grammarPrompt: "Разница niet и geen в отрицании (geen перед существительным без артикля, niet в остальных случаях). 5 заданий." },
  { id: "a1-6", level: "A1", order: 10, title: "Повторение A1", topic: "смесь всех тем A1: семья, день, еда, глаголы, отрицание", wordTarget: 20, isReview: true,
    grammarPrompt: "Смешанные 6-8 заданий на весь пройденный материал A1: de/het, прилагательные, глаголы в настоящем, niet/geen, притяжательные местоимения." },

  // --- A2 -----------------------------------------------------------------
  { id: "a2-1", level: "A2", order: 11, title: "Прошедшее время", topic: "рассказ о вчерашнем дне, обычные дела в прошлом", wordTarget: 30, grammarKey: "Прошедшее: 't kofschip" },
  { id: "a2-2", level: "A2", order: 12, title: "Покупки и деньги", topic: "магазин, цены, euro, kassa, korting, passen/betalen", wordTarget: 35,
    grammarPrompt: "Числительные в ценах и количестве (anderhalf, een paar, de helft) и вопрос Hoeveel kost...? 4-5 заданий." },
  { id: "a2-3", level: "A2", order: 13, title: "Транспорт и направления", topic: "вокзал, велосипед, спросить дорогу, links/rechts/rechtdoor", wordTarget: 35,
    grammarPrompt: "Предлоги места и направления (naar, door, langs, bij, tegenover) в контексте объяснения дороги. 4-5 заданий." },
  { id: "a2-4", level: "A2", order: 14, title: "Модальные глаголы", topic: "можно/нужно/хочу/разрешено — договориться о планах", wordTarget: 25,
    grammarPrompt: "Модальные глаголы kunnen/moeten/willen/mogen + инфинитив в конце (Ik kan morgen komen). 5 заданий." },
  { id: "a2-5", level: "A2", order: 15, title: "Планы на будущее", topic: "что будет на выходных, gaan + инфинитив, afspreken", wordTarget: 25,
    grammarPrompt: "Будущее время через gaan + infinitief (Ik ga morgen werken) в противовес настоящему для близких планов. 4-5 заданий." },
  { id: "a2-6", level: "A2", order: 16, title: "Повторение A2", topic: "смесь тем A2: прошедшее время, покупки, транспорт, планы", wordTarget: 20, isReview: true,
    grammarPrompt: "Смешанные 6-8 заданий на A2: 't kofschip, модальные глаголы, gaan + infinitief, предлоги направления." },

  // --- B1 -----------------------------------------------------------------
  { id: "b1-1", level: "B1", order: 17, title: "Перфект", topic: "рассказ о прошлом выходном через hebben/zijn + voltooid deelwoord", wordTarget: 35,
    grammarPrompt: "Перфект: выбор hebben или zijn, образование voltooid deelwoord (ge-...-t/d, неправильные формы частых глаголов). 5-6 заданий." },
  { id: "b1-2", level: "B1", order: 18, title: "Придаточные предложения", topic: "объяснение причин и условий — omdat, dat, als, voordat", wordTarget: 25, grammarKey: "Порядок слов" },
  { id: "b1-3", level: "B1", order: 19, title: "Частица er", topic: "рассказ о количестве и месте с использованием er", wordTarget: 20, grammarKey: "Частица er" },
  { id: "b1-4", level: "B1", order: 20, title: "Сравнения", topic: "сравнение вещей, мест, людей — mooier, het mooiste", wordTarget: 25,
    grammarPrompt: "Сравнительная и превосходная степень прилагательных (-er, het -st) и неправильные формы (goed-beter-best). 4-5 заданий." },
  { id: "b1-5", level: "B1", order: 21, title: "Работа и учёба", topic: "рассказ о работе, учёбе, планах на карьеру", wordTarget: 35,
    grammarPrompt: "Конструкции мнения и намерения: ik wil graag, ik ben van plan om te, het lijkt me. 4-5 заданий." },
  { id: "b1-6", level: "B1", order: 22, title: "Повторение B1", topic: "смесь тем B1: перфект, придаточные, er, сравнения", wordTarget: 20, isReview: true, grammarKey: "Разговорные частицы" },

  // --- B2 -----------------------------------------------------------------
  { id: "b2-1", level: "B2", order: 23, title: "Пассивный залог", topic: "новости и официальные тексты в пассиве", wordTarget: 30,
    grammarPrompt: "Пассив с worden (настоящее/прошедшее) и is/zijn + voltooid deelwoord (результативный пассив). 5 заданий." },
  { id: "b2-2", level: "B2", order: 24, title: "Условное наклонение", topic: "гипотетические ситуации — als ik ... zou, что бы ты сделал", wordTarget: 25,
    grammarPrompt: "Conditionalis: zou + infinitief, условные предложения 2-го типа (Als ik meer tijd had, zou ik...). 5 заданий." },
  { id: "b2-3", level: "B2", order: 25, title: "Косвенная речь", topic: "пересказ чужих слов и диалогов", wordTarget: 25,
    grammarPrompt: "Косвенная речь (hij zei dat..., ze vroeg of...) и сдвиг времени при пересказе. 4-5 заданий." },
  { id: "b2-4", level: "B2", order: 26, title: "Мнение и аргументация", topic: "высказывание и защита мнения на абстрактную тему", wordTarget: 30,
    grammarPrompt: "Нюансирующие частицы eigenlijk, sowieso, toch, enerzijds...anderzijds в аргументации. 4-5 заданий." },
  { id: "b2-5", level: "B2", order: 27, title: "Идиомы и сленг", topic: "устойчивые выражения и современный разговорный сленг из соцсетей/чатов", wordTarget: 30,
    grammarPrompt: "Идиомы vs их буквальный смысл — 5 частых выражений с разбором, почему дословный перевод не работает." },
  { id: "b2-6", level: "B2", order: 28, title: "Финал: повторение B2", topic: "смесь всех тем B2 — пассив, условное, косвенная речь, аргументация", wordTarget: 20, isReview: true,
    grammarPrompt: "Итоговые 8-10 заданий вразнобой по всей программе B2: пассив, conditionalis, косвенная речь, частицы." },
];

export const byId = (id: string) => CURRICULUM.find((m) => m.id === id);
export const nextOf = (order: number) => CURRICULUM.find((m) => m.order === order + 1);
export const firstModule = CURRICULUM[0];
