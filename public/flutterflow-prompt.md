# FlutterFlow Build Prompt — Klar Deutsch (klardeutsch.org)

> Скопіюй цей документ цілком у FlutterFlow AI Page Builder / "Generate App with AI". Він описує продукт, дизайн-систему, навігацію, екрани, бекенд (Supabase), бізнес-логіку, фічі та інтеграції. Мета — відтворити веб-додаток як нативний Flutter застосунок 1:1.

---

## 1. ПРОДУКТ

**Назва:** Klar Deutsch — застосунок для вивчення німецької мови.
**Платформа:** Flutter (iOS + Android + Web).
**Мови UI:** German (de), Russian (ru), Ukrainian (uk). Перемикач локалі в профілі.
**Цільова авдиторія:** учні рівнів A1–C1, мігранти в DACH, школярі (Kids), приватні студенти репетиторів.
**Ключова ідея:** мінімалістична "сучасна німецька" естетика, миттєва практика, гейміфікація (XP, монети, дуелі, стрики), AI-репетитор.

---

## 2. ДИЗАЙН-СИСТЕМА (повторити токени!)

### Кольори (semantic tokens, HSL)
- **Deep Navy (background, primary surface):** `#0F172A`
- **Crisp White:** `#FFFFFF`
- **Accent Yellow (CTA, прогрес, акценти):** `#FACC15`
- **Артиклі:** der → синій `#3B82F6`, die → рожевий `#EC4899`, das → зелений `#10B981`
- **Темна тема** — за замовчуванням після 20:00 (Night mode + sleeping panda).

### Типографіка
- **Шрифт:** Space Grotesk (Google Fonts) для всього — заголовки + body.
- Ніяких serif шрифтів. Не використовуй Inter, Poppins, Roboto.

### Layout
- `100dvh` фул-скрін, без системного скролу на головних екранах.
- Mobile-first. Bottom navigation bar на мобільних.
- Desktop: ліва сайдбар-навігація з кнопкою "Report Error" внизу.
- Glassmorphism для модалок та AI-діалогів.
- Анімації: spring physics (Flutter Animations / flutter_animate), stagger ефекти, glow, конфеті при досягненнях.

### Аватари
10 унікальних 3D-панд: Ninja, DJ, Bavarian, Grad (graduate), Sleeping, та інші. Користувач обирає в профілі. Спляча панда відображається після 20:00.

---

## 3. ПЛАТФОРМА І ОБМЕЖЕННЯ

- Telegram Mini App-логіку для Flutter **пропустити** (це фіча тільки веб-версії).
- PWA-частина пропускається — нативний Flutter.
- Без Capacitor / WebView.
- Темна тема обов'язкова.

---

## 4. НАВІГАЦІЯ ТА МАРШРУТИ

### Bottom tab bar (mobile) / Sidebar (tablet+):
1. **Home** (`/`) — головний хаб
2. **Dictionary** (`/dictionary`)
3. **Games** (`/games`)
4. **Chat** (`/chat`) — глобальний + DM
5. **Profile** (`/profile`)

### Усі маршрути:
| Route | Назва екрана | Доступ |
|---|---|---|
| `/` | Home / Index | Public |
| `/auth` | Sign in / Sign up (Email OTP) | Public |
| `/reset-password` | Reset password | Public |
| `/onboarding` | 4 кроки для нових / 3 для існуючих + Placement Test | Auth |
| `/dictionary` | Словник + SRS | Public |
| `/word-lookup` | Розбір слова з AI-чіпами | Public |
| `/games` | 7 міні-ігор | Public |
| `/profile` | Профіль, ачівки, налаштування | Auth |
| `/stats` | Статистика (графіки Recharts → fl_chart у Flutter) | Auth |
| `/shop` | Магазин (монети + Stripe преміум) | Auth |
| `/challenges` | Дуелі (асинхронні через Realtime) | Auth |
| `/chat` | Чат: глобальний + DM | Auth |
| `/course/:id` | Курс-нотатник | Auth |
| `/review` | SRS повторення | Auth |
| `/certificate/:code` | Перегляд сертифіката | Public |
| `/assistant` | AI-асистент (Tutor / Dictionary / Texts / Docs) | Premium |
| `/academy` | LMS A1–C1 | Premium + whitelist |
| `/academy/:courseId` | Сторінка курсу | Premium |
| `/academy/:courseId/learn` | Урок-плеєр | Premium |
| `/tutoring` | Кабінет репетитора | Premium / teacher role |
| `/tutoring/student/:id` | Кабінет студента для вчителя | teacher |
| `/tutoring/lesson/:id` | Двухоконний урок (Student View + AI/notes/whiteboard) | teacher |
| `/tutoring/placement/:id` | Placement тест | student |
| `/tutoring/homework/:id` | ДЗ | student |
| `/student-view/:sessionId` | Окреме вікно учня (live presence) | student |
| `/assignments` | Список ДЗ студента | Auth |
| `/admin` | Адмін-панель | admin role |

---

## 5. БЕКЕНД (Supabase)

Використати **Supabase** як backend (FlutterFlow має офіційну Supabase-інтеграцію). Підключити існуючий проєкт або скопіювати схему.

### Auth
- Email OTP (6-значний код).
- Math captcha після 3 невдалих спроб.
- НЕ використовувати Google OAuth.
- НЕ дозволяти анонімні sign-up.
- Реєстрація існуючого email → показати помилку, не надсилати код.

### Storage buckets (public)
`avatars`, `shop-images`, `shop-files`, `tts-audio`, `email-assets`, `voice-messages`, `chat-images`, `chat-files`, `gift-images`.
Private: `tutoring-materials`, `tutoring-recordings`.

### Таблиці (повний список, реалізувати з RLS)
**Users & RBAC:** `profiles`, `user_roles` (enum: `admin`, `moderator`, `teacher`, `user`), `subscriptions`, `referral_codes`, `referrals`, `referral_challenges`.

**Економіка:** `user_coins`, `coin_transactions`, `user_xp`, `xp_transactions`, `daily_bonuses`, `daily_usage`, `streak_milestones`.

**Контент:** `topics`, `cafe_scenarios`, `grammar_lessons`, `grammar_questions`, `reading_texts`, `reading_questions`, `listening_texts`, `listening_questions`, `listening_dictations`, `vocab_cards`, `custom_words`, `saved_words`, `srs_cards`, `placement_questions`, `kids_placement_questions`, `translation_overrides`.

**Магазин:** `shop_items`, `purchases`, `gift_items`, `user_gifts`.

**Дуелі:** `challenges`, `user_progress`.

**Чат:** `community_messages`, `direct_messages`, `friendships`.

**Академія (LMS):** `courses`, `course_modules`, `course_lessons` (14 типів), `course_lesson_progress`, `course_purchases`, `course_certificates`, `course_notebooks`, `course_notes`, `course_cohort_messages`.

**Репетиторство:** `tutoring_relationships`, `tutoring_lessons`, `tutoring_live_sessions`, `tutoring_lesson_templates`, `tutoring_lesson_exercises`, `tutoring_lesson_notes`, `tutoring_lesson_recordings`, `tutoring_lesson_words`, `tutoring_homework`, `tutoring_placement_questions`, `tutoring_placement_assignments`, `teacher_chat_messages`, `teacher_ai_chats`, `teacher_ai_messages`, `teacher_student_notes`.

**Демо/Аналітика:** `demo_leaderboard`, `student_login_attempts`, `admin_settings`.

### Ключові SQL функції (відтворити як Postgres functions)
- `has_role(uuid, app_role)` — security definer для перевірки ролей.
- `is_premium(uuid)` — активна підписка.
- `award_xp / award_coins` — нарахування + транзакція.
- `purchase_item / purchase_course` — списання монет з перевіркою балансу.
- `send_gift` — подарунки між юзерами.
- `apply_referral_code / activate_referral` — реферальна система: +50 монет, +20 XP при першій активності.
- `review_srs_card(quality 0–5)` — SM-2 алгоритм.
- `complete_course_lesson` — нарахування XP/coins за урок.
- `issue_certificate` — генерує сертифікат при балі >70%.
- `increment_daily_usage` — ліміти Free плану: 3 уроки/день, 1 гра/день, 3 AI-запити/день.
- `get_leaderboard` — реальні + демо юзери для соц-доказу.
- `generate_referral_code` — `KLAR-XXXX` формат.

### Edge Functions (відтворити як backend endpoints або Flutter HTTP виклики)
- AI Tutor (SSE streaming).
- Voice AI: один endpoint STT → LLM → TTS (ElevenLabs Scribe v2 для STT, ElevenLabs TTS).
- `analyze-lesson-dialogue`.
- `notify-dm` (push повідомлення про DM).
- `demo-stats` (cron кожні 3 години).
- Stripe Checkout / webhook.
- Daily summary (21:00).
- Streak reminder (22:00).
- Nickname broadcast (19:30).

---

## 6. БІЗНЕС-ЛОГІКА

### Економіка
- **XP:** вправи 10–30, writing 25, дуель 50, урок академії 20.
- **Монети:** 5–20 за вправи; нараховуються через `award_coins`.
- **Free vs Premium:** Free ліміти — 3 уроки/день, 1 гра, 3 AI; Premium — без лімітів.

### Підписки (Stripe, ціни в **гривнях**)
Три плани: **School**, **Assistant**, **All-in-One**. Залишити фактичні ціни такими ж, як на веб-сайті (UAH). Stripe Checkout у вебв'ю або через нативний Stripe SDK.

### Стрики
- Streak Shield, milestones (7/30/100/365 днів), щовечір 22:00 reminder.

### Spaced Repetition (SM-2)
- `srs_cards` з полями `ease_factor`, `interval_days`, `repetitions`, `next_review_at`.
- Quality 0–5 → перерахунок інтервалу.

### Реферали
Код `KLAR-XXXX`. Активація при першій активності → +50 монет +20 XP обом. Три joint challenges (duels_together, words_together, level_together) з нагородами (курс/audio/theme).

### Дуелі
Асинхронні через Supabase Realtime: `challenges` (challenger/opponent/winner/status). 50 XP переможцю. Реалізувати через Supabase Realtime channels у Flutter.

### Чат
- Глобальний (`community_messages`), DM (`direct_messages`).
- Floating input island, voice messages (запис → bucket `voice-messages`), картинки, файли.
- Realtime updates.

---

## 7. ФІЧІ (екрани детально)

### Home (`/`)
- Привітання, аватар праворуч угорі, LanguageSwitcher якщо розблоковано.
- Денний челендж (слово дня + міні-квіз).
- Швидкий доступ: словник, ігри, чат.
- Якщо не залогінений → Gateway: дві картки "School" (навчання) vs "Assistant" (AI-інструменти).

### Onboarding
- 4 кроки для нових: вибір мови UI → ім'я → аватар → рівень (або Placement Test).
- 3 кроки для існуючих юзерів без онбордингу.
- Placement Test — адаптивні питання, видає рівень A1–C1.

### Dictionary
- Пошук, фільтри (рівень, артикль, тип слова).
- SRS-картки з можливістю додати до повторення.
- Article colors: der/die/das.

### Word Lookup
- Введи слово → AI повертає переклад, приклади, граматику, інтерактивні чіпи (натискання → нове слово).

### Games (7 ігор)
1. Article Trainer
2. Word Match
3. Telefon-Trainer (телефонна розмова з AI)
4. Sentence Builder
5. Memory
6. Speed Round
7. Hangman
(назви вільні, кількість = 7)

### Academy (LMS)
- A1–C1 курси. Доступ — whitelist (`rodnoi`, `2lupov7`) + premium.
- Логотип "klar deutsch" заливається жовтим на 25% за кожну завершену літеру.
- Курс → модулі → уроки (14 типів: text, video, quiz, fill-blank, matching, listening, dictation, dialogue, writing, theory-block, exercise-set, flashcards, final-exam, certificate).
- TheoryRenderer: Markdown + JSON-блоки.
- Золотий progress bar блокує перехід поки урок не зроблено.
- TeacherChat + Cohort Chat.
- AI Tutor (SSE streaming, аналіз діалогу уроку).
- Сертифікат при фінальному екзамені >70%.

### Courses / Notebook (`/course/:id`)
- Темна тема, лінований папір, жовтий маркер для виділень.
- Нотатки зберігаються в `course_notes`.

### Tutoring (Presenter Mode)
- Двухоконний урок: **Student View** (учневі) + **Teacher Panel** (AI / нотатки / вайтборд).
- Учитель пушить навігацію учневі через Realtime.
- ДЗ з AI-перевіркою.
- Кабінет студента: live presence, фідбек по ДЗ, заметки.

### Assistant (Premium)
- AI Tutor (чат, SSE streaming).
- AI Dictionary (розбір слова).
- AI Texts (генерація текстів за рівнем).
- AI Docs (переклад документів).

### Shop
- Преміум-плани через Stripe (UAH).
- Внутрішні товари за монети (`shop_items`): теми, аватари, audio packs.
- Подарунки іншим юзерам (`gift_items`).

### Profile
- Аватар, display_name, @nickname (cooldown 14 днів на зміну).
- Стрик, монети, XP, рівень.
- Інтерактивна 3D-панда (стан від стрика; спить після 20:00).
- Подарунки (Gift Unboxing анімація).
- Лідерборд (`get_leaderboard` — реальні + демо).
- Ачівки 20+ з прогрес-барами та конфеті.
- Налаштування: мова UI (lock після вибору), темна тема, нотифікації.
- Реферальний код.
- Юридичні сторінки (footer).

### Statistics
- 14-денна активність (стовпчики).
- Слова вивчені, уроки, дуелі, XP.
- Recharts → у Flutter використати `fl_chart`.

### Daily Summary
- 21:00 — XP/слова/уроки за день + кнопка "Поділитись в Telegram".

### Chat
- Глобальний канал + DMs.
- Friendships (друзі).
- Voice/image/file повідомлення.

### Achievements
- 20+ бейджів, прогрес-бари, конфеті, share.

### Admin (`/admin`, тільки admin role)
- Список юзерів (`get_admin_users`).
- Ручне нарахування XP/coins, зміна аватара.
- Контент-редактор (візуальні блоки), ListeningEditor.
- AI bulk-генерація для топіків і курсів.
- Translation Checker (traffic light + Surzhyk detection).
- Сповіщення в Telegram при реєстраціях, щоденна статистика 21:00.
- Чат-модерація.
- Збереження scrollTop, тихі завантаження, авто-textarea.

### Night mode
- Після 20:00 — авто темна тема + спляча панда.

### Lofi radio
- 320kbps HTTPS стріми, auto-fallback. У Flutter: `just_audio`.

### AI Dialogues
- A1–C1 розмовна практика, glassmorphism UI, голос (STT→LLM→TTS).

### AI Error Analysis
- Пояснення помилок російською/українською через Gemini.

### Pronunciation Training
- Запис голосу 500ms чанками, пульсуюча анімація, ElevenLabs Scribe v2.

---

## 8. ІНТЕГРАЦІЇ

- **Supabase** — Auth, Database, Storage, Realtime, Edge Functions.
- **Stripe** — підписки (UAH), Checkout або native Payment Sheet.
- **ElevenLabs** — STT (Scribe v2) + TTS.
- **Lovable AI Gateway / Gemini** — LLM, генерація контенту, аналіз.
- **Telegram бот** `@klar_deutsch_bot` — нотифікації (deep-link, не обов'язково для Flutter).
- **Push notifications** — Firebase Cloud Messaging (стрик-нагадування 22:00, DM, daily summary 21:00, ДЗ).

---

## 9. БЕЗПЕКА

- RLS на всіх таблицях.
- Ролі тільки через окрему таблицю `user_roles` + security definer функція `has_role()`. **Ніколи** не зберігати роль на `profiles`.
- JWT-перевірка в усіх Edge Functions.
- Server-side RBAC (admin checks).
- Math captcha після 3 невдалих спроб логіну.

---

## 10. КОНТЕНТ-ВИМОГИ

- Мінімум 50 елементів на топік.
- DE/RU/UK переклади. AI відповідає мовою UI.
- Артиклі — кольори стандартизовані (синій/рожевий/зелений).
- "Content coming soon" fallback для порожніх категорій.

---

## 11. PWA / Telegram

Пропустити для Flutter-версії. Це нативний застосунок.

---

## 12. ДОДАТКОВІ ВИМОГИ ДО FLUTTERFLOW

- Використай **fl_chart** для графіків.
- **flutter_animate** для всіх spring/stagger/glow анімацій.
- **just_audio** для lofi-радіо та аудіо-вправ.
- **record** + Supabase Storage для голосових повідомлень.
- **supabase_flutter** офіційний SDK.
- **flutter_stripe** для оплат.
- **google_fonts** — Space Grotesk.
- **firebase_messaging** — push.
- **flutter_markdown** — для theory blocks.
- Локалізація через `flutter_localizations` + `intl` (de/ru/uk).

---

## 13. EDGE CASES

- Існуючий email при signup → помилка, без коду.
- Зміна @nickname → cooldown 14 днів.
- Зміна мови UI → lock (`language_locked`).
- Free user перевищив ліміт → paywall.
- AI Gateway повертає 402 → показати "Поповніть кредити".
- Audio cleanup: `URL.revokeObjectURL` (у Flutter — закрити стрім).
- Демо-юзери в лідерборді (`demo_leaderboard`).

---

## 14. ПРИОРИТЕТ РОЗРОБКИ (для AI-генератора)

1. Auth + Profile + Home + Dictionary + Games (MVP)
2. Економіка (XP/coins/streak) + Achievements + Shop (внутрішні монети)
3. Chat (глобальний + DM)
4. Дуелі + Лідерборд
5. Academy (LMS) + Курси
6. Assistant (AI tools) + Stripe-підписки
7. Tutoring (presenter mode)
8. Admin-панель
9. Notifications, daily summary, lofi, AI dialogues

---

**Кінець промпта.** Згенеруй застосунок 1:1 із цими специфікаціями. Якщо чогось бракує — використовуй здоровий глузд відповідно до естетики "modern German minimalism" з Deep Navy + Crisp White + Accent Yellow.
