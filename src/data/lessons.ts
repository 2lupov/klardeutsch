export interface VocabCard {
  id: string;
  german: string;
  russian: string;
  ukrainian?: string;
  example?: string;
  article?: string;
}

export interface GrammarQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export interface ReadingText {
  id: string;
  title: string;
  text: string;
  questions: GrammarQuestion[];
}

export interface ListeningText {
  id: string;
  title: string;
  text: string;
  questions: GrammarQuestion[];
  dictations: { id: string; sentence: string }[];
}

export interface CategoryData {
  vocabulary: VocabCard[];
  grammar: { theory: string; questions: GrammarQuestion[] };
  reading: ReadingText[];
  listening: ListeningText[];
}

export type Level = "A1" | "A2" | "B1" | "B2" | "C1";

export const lessonsData: Record<Level, CategoryData> = {
  A1: {
    listening: [],
    vocabulary: [
      { id: "v1", german: "Hallo", russian: "Привет", example: "Hallo, wie geht's?" },
      { id: "v2", german: "Danke", russian: "Спасибо", example: "Danke schön!" },
      { id: "v3", german: "Bitte", russian: "Пожалуйста", example: "Bitte schön!" },
      { id: "v4", german: "Ja", russian: "Да", example: "Ja, natürlich!" },
      { id: "v5", german: "Nein", russian: "Нет", example: "Nein, danke." },
      { id: "v6", german: "Guten Morgen", russian: "Доброе утро", example: "Guten Morgen, Herr Müller!" },
      { id: "v7", german: "Tschüss", russian: "Пока", example: "Tschüss, bis morgen!" },
      { id: "v8", german: "der Freund", russian: "Друг", article: "der", example: "Das ist mein Freund." },
      { id: "v9", german: "die Schule", russian: "Школа", article: "die", example: "Ich gehe in die Schule." },
      { id: "v10", german: "das Buch", russian: "Книга", article: "das", example: "Das Buch ist interessant." },
    ],
    grammar: {
      theory: "## Порядок слов в немецком предложении\n\nВ немецком языке глагол всегда стоит на **втором месте** в повествовательном предложении.\n\n**Пример:** Ich **gehe** in die Schule.\n\nВ вопросительном предложении глагол стоит на **первом месте**.\n\n**Пример:** **Gehst** du in die Schule?",
      questions: [
        {
          id: "g1",
          question: "Ich ___ aus Russland.",
          options: ["komme", "kommst", "kommen", "kommt"],
          correctIndex: 0,
          explanation: "Для 'ich' используется окончание -e: komme",
        },
        {
          id: "g2",
          question: "Du ___ sehr gut Deutsch.",
          options: ["spreche", "spricht", "sprichst", "sprechen"],
          correctIndex: 2,
          explanation: "Для 'du' используется окончание -st: sprichst",
        },
        {
          id: "g3",
          question: "Wir ___ in Berlin.",
          options: ["wohne", "wohnst", "wohnt", "wohnen"],
          correctIndex: 3,
          explanation: "Для 'wir' используется окончание -en: wohnen",
        },
      ],
    },
    reading: [
      {
        id: "r1",
        title: "Mein Tag",
        text: "Ich heiße Anna. Ich stehe um 7 Uhr auf. Ich frühstücke und gehe in die Schule. Am Nachmittag mache ich Hausaufgaben. Am Abend lese ich ein Buch.",
        questions: [
          {
            id: "rq1",
            question: "Wann steht Anna auf?",
            options: ["Um 6 Uhr", "Um 7 Uhr", "Um 8 Uhr", "Um 9 Uhr"],
            correctIndex: 1,
          },
          {
            id: "rq2",
            question: "Was macht Anna am Abend?",
            options: ["Sie kocht", "Sie schläft", "Sie liest ein Buch", "Sie tanzt"],
            correctIndex: 2,
          },
        ],
      },
    ],
  },
  A2: {
    listening: [],
    vocabulary: [
      { id: "v1", german: "die Wohnung", russian: "Квартира", article: "die", example: "Die Wohnung ist groß." },
      { id: "v2", german: "der Urlaub", russian: "Отпуск", article: "der", example: "Ich brauche Urlaub." },
      { id: "v3", german: "das Geschenk", russian: "Подарок", article: "das", example: "Das Geschenk ist für dich." },
      { id: "v4", german: "erklären", russian: "Объяснять", example: "Können Sie das erklären?" },
      { id: "v5", german: "verstehen", russian: "Понимать", example: "Ich verstehe das nicht." },
      { id: "v6", german: "die Erfahrung", russian: "Опыт", article: "die", example: "Ich habe viel Erfahrung." },
    ],
    grammar: {
      theory: "## Perfekt — прошедшее время\n\nPerfekt образуется с помощью вспомогательного глагола **haben** или **sein** + **Partizip II**.\n\n**Пример:** Ich **habe** ein Buch **gelesen**.\n\nГлаголы движения используют **sein**: Ich **bin** nach Berlin **gefahren**.",
      questions: [
        {
          id: "g1",
          question: "Ich ___ gestern ins Kino gegangen.",
          options: ["habe", "bin", "hat", "ist"],
          correctIndex: 1,
          explanation: "Глагол 'gehen' — глагол движения, поэтому используется 'sein': bin gegangen",
        },
        {
          id: "g2",
          question: "Er ___ das Buch gelesen.",
          options: ["hat", "ist", "habe", "bin"],
          correctIndex: 0,
          explanation: "'Lesen' — не глагол движения, используется 'haben': hat gelesen",
        },
      ],
    },
    reading: [
      {
        id: "r1",
        title: "Im Restaurant",
        text: "Gestern bin ich mit meiner Freundin ins Restaurant gegangen. Wir haben Pizza und Salat bestellt. Das Essen war lecker. Danach haben wir einen Spaziergang gemacht.",
        questions: [
          {
            id: "rq1",
            question: "Was haben sie bestellt?",
            options: ["Suppe", "Pizza und Salat", "Kuchen", "Brot"],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
  B1: {
    listening: [],
    vocabulary: [
      { id: "v1", german: "die Ausbildung", russian: "Образование / обучение", article: "die" },
      { id: "v2", german: "bewerben (sich)", russian: "Подавать заявку", example: "Ich bewerbe mich um die Stelle." },
      { id: "v3", german: "die Verantwortung", russian: "Ответственность", article: "die" },
      { id: "v4", german: "selbstständig", russian: "Самостоятельный", example: "Er arbeitet selbstständig." },
      { id: "v5", german: "die Entscheidung", russian: "Решение", article: "die", example: "Das war eine schwere Entscheidung." },
    ],
    grammar: {
      theory: "## Konjunktiv II — сослагательное наклонение\n\nKonjunktiv II используется для выражения **нереальных ситуаций** и **вежливых просьб**.\n\n**Пример:** Ich **würde** gern nach Deutschland **fahren**.\n\n**Пример:** **Könnten** Sie mir bitte helfen?",
      questions: [
        {
          id: "g1",
          question: "Wenn ich reich ___, würde ich um die Welt reisen.",
          options: ["bin", "wäre", "war", "sei"],
          correctIndex: 1,
          explanation: "'Wäre' — форма Konjunktiv II от 'sein'",
        },
      ],
    },
    reading: [
      {
        id: "r1",
        title: "Bewerbungsgespräch",
        text: "Morgen habe ich ein Bewerbungsgespräch bei einer großen Firma. Ich bin nervös, aber ich habe mich gut vorbereitet. Ich habe meinen Lebenslauf aktualisiert und ein Motivationsschreiben geschrieben.",
        questions: [
          {
            id: "rq1",
            question: "Wofür hat sich die Person vorbereitet?",
            options: ["Prüfung", "Bewerbungsgespräch", "Urlaub", "Party"],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
  B2: {
    listening: [],
    vocabulary: [
      { id: "v1", german: "die Nachhaltigkeit", russian: "Устойчивое развитие", article: "die" },
      { id: "v2", german: "die Globalisierung", russian: "Глобализация", article: "die" },
      { id: "v3", german: "auseinandersetzen (sich)", russian: "Разбираться / изучать", example: "Man muss sich mit dem Thema auseinandersetzen." },
      { id: "v4", german: "die Herausforderung", russian: "Вызов / задача", article: "die" },
    ],
    grammar: {
      theory: "## Passiv — страдательный залог\n\nPassiv образуется с помощью **werden** + **Partizip II**.\n\n**Пример:** Das Haus **wird gebaut**.\n\n**Пример в прошедшем:** Das Haus **wurde gebaut**.",
      questions: [
        {
          id: "g1",
          question: "Das Buch ___ von vielen Menschen gelesen.",
          options: ["wird", "werden", "wurde", "ist"],
          correctIndex: 0,
          explanation: "'Wird' — форма Passiv Präsens для единственного числа",
        },
      ],
    },
    reading: [
      {
        id: "r1",
        title: "Digitalisierung",
        text: "Die Digitalisierung verändert unsere Gesellschaft grundlegend. Immer mehr Unternehmen setzen auf digitale Lösungen. Gleichzeitig stellt dies viele Menschen vor neue Herausforderungen.",
        questions: [
          {
            id: "rq1",
            question: "Was verändert die Gesellschaft?",
            options: ["Sport", "Digitalisierung", "Musik", "Kochen"],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
  C1: {
    listening: [],
    vocabulary: [
      { id: "v1", german: "die Voraussetzung", russian: "Предпосылка / условие", article: "die", example: "Das ist eine Voraussetzung für den Erfolg." },
      { id: "v2", german: "berücksichtigen", russian: "Учитывать / принимать во внимание", example: "Man muss alle Faktoren berücksichtigen." },
      { id: "v3", german: "die Auswirkung", russian: "Воздействие / последствие", article: "die", example: "Die Auswirkungen des Klimawandels sind spürbar." },
      { id: "v4", german: "anspruchsvoll", russian: "Требовательный / сложный", example: "Die Aufgabe ist sehr anspruchsvoll." },
      { id: "v5", german: "die Wahrnehmung", russian: "Восприятие", article: "die", example: "Die Wahrnehmung variiert von Person zu Person." },
    ],
    grammar: {
      theory: "## Partizipialattribute — причастные обороты\n\nВ немецком языке причастия могут использоваться как **определения перед существительным**.\n\n**Partizip I (Präsens):** der **lesende** Student (читающий студент)\n\n**Partizip II (Perfekt):** das **gelesene** Buch (прочитанная книга)\n\n**Расширенное:** die **von vielen Menschen gelesene** Zeitung",
      questions: [
        {
          id: "g1",
          question: "Die ___ Aufgabe war sehr schwer.",
          options: ["gestellte", "stellende", "gestellt", "stellen"],
          correctIndex: 0,
          explanation: "Partizip II 'gestellt' → 'gestellte' как определение",
        },
      ],
    },
    reading: [
      {
        id: "r1",
        title: "Künstliche Intelligenz",
        text: "Die rasante Entwicklung der künstlichen Intelligenz wirft zahlreiche ethische Fragen auf. Während Befürworter die Effizienzsteigerung betonen, warnen Kritiker vor möglichen Gefahren für den Arbeitsmarkt und die Privatsphäre.",
        questions: [
          {
            id: "rq1",
            question: "Was werfen Kritiker der KI vor?",
            options: ["Zu langsame Entwicklung", "Gefahren für Arbeitsmarkt und Privatsphäre", "Zu hohe Kosten", "Mangelnde Effizienz"],
            correctIndex: 1,
          },
        ],
      },
    ],
  },
};
