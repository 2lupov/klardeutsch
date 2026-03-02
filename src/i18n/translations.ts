export type Lang = "ru" | "uk";

const translations = {
  // Common
  back: { ru: "Назад", uk: "Назад" },
  loading: { ru: "Загрузка...", uk: "Завантаження..." },
  signOut: { ru: "Выйти", uk: "Вийти" },

  // Auth
  loginTitle: { ru: "Войдите в аккаунт", uk: "Увійдіть в акаунт" },
  signupTitle: { ru: "Создайте аккаунт", uk: "Створіть акаунт" },
  email: { ru: "Email", uk: "Email" },
  password: { ru: "Пароль", uk: "Пароль" },
  login: { ru: "Войти", uk: "Увійти" },
  signup: { ru: "Зарегистрироваться", uk: "Зареєструватися" },
  noAccount: { ru: "Нет аккаунта? Зарегистрируйтесь", uk: "Немає акаунту? Зареєструйтесь" },
  hasAccount: { ru: "Уже есть аккаунт? Войдите", uk: "Вже є акаунт? Увійдіть" },
  checkEmail: { ru: "Проверьте почту для подтверждения регистрации!", uk: "Перевірте пошту для підтвердження реєстрації!" },

  // Level selector
  appSubtitle: { ru: "Немецкий язык — ясно и просто", uk: "Німецька мова — ясно і просто" },
  levelA1: { ru: "Начальный", uk: "Початковий" },
  levelA2: { ru: "Элементарный", uk: "Елементарний" },
  levelB1: { ru: "Средний", uk: "Середній" },
  levelB2: { ru: "Выше среднего", uk: "Вище середнього" },
  levelLabel: { ru: "Уровень", uk: "Рівень" },

  // Category selector
  chooseCategory: { ru: "Выберите категорию", uk: "Оберіть категорію" },
  vocabSublabel: { ru: "Словарный запас", uk: "Словниковий запас" },
  grammarSublabel: { ru: "Грамматика", uk: "Граматика" },
  readingSublabel: { ru: "Чтение", uk: "Читання" },

  // Flashcard
  learned: { ru: "выучено", uk: "вивчено" },
  tapToFlip: { ru: "Нажмите, чтобы перевернуть", uk: "Натисніть, щоб перевернути" },
  iLearned: { ru: "Выучил ✓", uk: "Вивчив ✓" },
  restart: { ru: "Начать заново", uk: "Почати спочатку" },

  // Quiz
  question: { ru: "Вопрос", uk: "Питання" },
  excellent: { ru: "Отлично! 🎉", uk: "Чудово! 🎉" },
  notBad: { ru: "Неплохо! 💪", uk: "Непогано! 💪" },
  tryAgain: { ru: "Попробуйте ещё раз 📖", uk: "Спробуйте ще раз 📖" },
  correctAnswers: { ru: "правильных ответов", uk: "правильних відповідей" },
  continue: { ru: "Продолжить", uk: "Продовжити" },
  next: { ru: "Далее", uk: "Далі" },
  results: { ru: "Результаты", uk: "Результати" },
  of: { ru: "из", uk: "з" },

  // Reading
  goToQuestions: { ru: "Перейти к вопросам →", uk: "Перейти до питань →" },

  // Admin
  adminPanel: { ru: "Админ-панель", uk: "Адмін-панель" },
  loginFirst: { ru: "Сначала войдите в аккаунт", uk: "Спочатку увійдіть в акаунт" },
  enterAdminPassword: { ru: "Введите пароль администратора", uk: "Введіть пароль адміністратора" },
  wrongPassword: { ru: "Неверный пароль", uk: "Невірний пароль" },
  toApp: { ru: "← К приложению", uk: "← До додатку" },
  vocabulary: { ru: "Словарь", uk: "Словник" },
  grammar: { ru: "Грамматика", uk: "Граматика" },
  reading: { ru: "Чтение", uk: "Читання" },
  german: { ru: "Немецкий", uk: "Німецький" },
  russian: { ru: "Русский", uk: "Російський" },
  article: { ru: "Артикль", uk: "Артикль" },
  example: { ru: "Пример", uk: "Приклад" },
  addWord: { ru: "Добавить слово", uk: "Додати слово" },
  theoryMarkdown: { ru: "Теория (Markdown)", uk: "Теорія (Markdown)" },
  saveTheory: { ru: "Сохранить теорию", uk: "Зберегти теорію" },
  questions: { ru: "Вопросы", uk: "Питання" },
  questionLabel: { ru: "Вопрос", uk: "Питання" },
  explanationOptional: { ru: "Объяснение (необязательно)", uk: "Пояснення (необов'язково)" },
  addQuestion: { ru: "Добавить вопрос", uk: "Додати питання" },
  title: { ru: "Заголовок", uk: "Заголовок" },
  textQuestions: { ru: "Вопросы к тексту:", uk: "Питання до тексту:" },
  addText: { ru: "Добавить текст", uk: "Додати текст" },
  newWord: { ru: "Новое слово", uk: "Нове слово" },
  newWordGerman: { ru: "Neues Wort", uk: "Neues Wort" },
  newQuestion: { ru: "Новый вопрос", uk: "Нове питання" },
  newText: { ru: "Новый текст", uk: "Новий текст" },
  textHere: { ru: "Текст здесь...", uk: "Текст тут..." },
  tryDemo: { ru: "Попробовать 1 минуту", uk: "Спробувати 1 хвилину" },
  demoFinished: { ru: "Понравилось? Зарегистрируйтесь, чтобы продолжить!", uk: "Сподобалось? Зареєструйтесь, щоб продовжити!" },
  startLearning: { ru: "Начать учиться", uk: "Почати вчитися" },
  backToLogin: { ru: "← Назад к входу", uk: "← Назад до входу" },
} as const;

export type TranslationKey = keyof typeof translations;

export default translations;
