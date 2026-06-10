## Цель

Переработать структуру доступа: гость → free-аккаунт → premium. Сайт открывается без логина, а доступ к функциям закрывается по уровням.

## 3 уровня доступа

**🌐 Гость (без аккаунта)**
- Главная (`/`) с hero + сразу под ним уровни A1–C1 (просмотр)
- Просмотр категорий и тем
- 1–2 пробных упражнения в каждой категории (карточки, чтение, аудирование) — без сохранения
- 1 мини-игра в день (по IP/localStorage)
- Словарь (поиск/просмотр) — без сохранения слов
- CTA "Войти, чтобы сохранить прогресс" после прохождения пробного

**👤 Free (с аккаунтом)**
- Всё из гостя + сохранение прогресса, XP, монеты, стрик
- Сохранённые слова + SRS повторение
- Чат, друзья, дуэли, лидерборд, профиль
- Дневные лимиты: 3 урока / 1 игра / 3 AI запроса (как сейчас)
- Достижения, daily challenge

**👑 Premium (подписка)**
- Безлимитные уроки, игры, AI запросы
- AI Ассистент (Tutor, Texts, Docs, Dialogues)
- Academy курсы и Tutoring (репетитор)
- Продвинутая статистика, сертификаты, премиум-аудио

## Изменения

### 1. Главная страница (`src/pages/Index.tsx`)
Превратить в гибрид-лендинг:
- **Hero сверху** для гостя: заголовок, sub, кнопки "Попробовать бесплатно" / "Войти". Для авторизованного — компактный приветственный блок.
- **Под hero — интерактив** (уровни A1–C1), доступен всем сразу.
- Для гостя: бейдж "Попробовать" на категориях вместо замка.
- Секции "Что внутри" / "Тарифы" / FAQ внизу — только для гостей.

### 2. Роутинг и доступ (`src/App.tsx`, `src/components/AppLayout.tsx`)

Ввести три типа защиты роутов:
- **PUBLIC** (гость+): `/`, `/dictionary` (просмотр), `/word-lookup`, `/games` (1/день), `/method`, `/auth`, демо упражнения
- **AUTH** (free+): `/profile`, `/chat`, `/stats`, `/shop`, `/challenges`, `/review`, `/onboarding`, `/assignments`
- **PREMIUM**: `/assistant`, `/academy`, `/academy/*`, `/tutoring`, `/tutoring/*`, `/certificate/*`

Создать обёртку `<RequireAuth>` и `<RequirePremium>` (использует `useSubscription`). При попытке гостя зайти на AUTH-роут — редирект на `/auth` с сохранением `?next=`. При попытке free-юзера на PREMIUM — редирект на `/profile?upgrade=1` (или показ Paywall).

### 3. Контент-компоненты с soft-gate
- **CategorySelector / LevelSelector** — для гостя показывать "пробное" (первые 1–2 упражнения), остальные с замком и CTA "Создай аккаунт".
- **Flashcard / ReadingExercise / ListeningExercise** — после N=2 показывать модал "Сохрани прогресс — войди".
- **DailyChallenge / Achievements / Streak** — скрыть для гостей.

### 4. Навигация (`MobileBottomNav.tsx`, `DesktopSidebar.tsx`)
- **Гость**: Главная, Словарь, Игры, Войти
- **Free**: Главная, Чат, Профиль, Словарь, Игры
- **Premium**: + Assistant, Academy, Tutoring (с короной)
- Использовать `PremiumBadge` рядом с пунктами для free-юзеров (визуальная мотивация апгрейда).

### 5. Paywall и апселл
- Единый компонент `PremiumPaywall` (уже есть) — переиспользовать на гейтированных страницах.
- На главной (для авторизованных free) — карточка "Открой Premium" с тремя бенефитами.
- При исчерпании дневного лимита (3 урока и т.д.) — модал апгрейда вместо текущего тоста.

### 6. Технические детали

**Гостевой "1 урок/игра в день"**: localStorage с датой (`guest_usage_2026-06-10`). При попытке второй — модал на регистрацию.

**Гостевой словарь / поиск слов**: edge functions `lookup-word`, чтение `dictionary` — снять JWT verify, разрешить anon. Сохранение слова — требует auth.

**Pre-fetch уровней для гостя**: запросы на топики/уроки уже публичны через RLS — проверить grants `SELECT TO anon` на `topics`, `cafe_scenarios`, `reading_texts`, `listening_texts`, `grammar_lessons`. Если нет — миграция с грантами.

**SEO**: главная теперь индексируема, обновить `<title>`, meta description, OG-теги на hero-описание продукта.

### 7. Файлы

Новые:
- `src/components/guards/RequireAuth.tsx`
- `src/components/guards/RequirePremium.tsx`
- `src/components/landing/Hero.tsx`
- `src/components/landing/PricingSection.tsx`
- `src/components/landing/FeaturesSection.tsx`
- `src/hooks/useGuestUsage.ts` (localStorage daily limit)

Изменяемые:
- `src/App.tsx` — обернуть роуты в guards
- `src/components/AppLayout.tsx` — убрать жёсткий redirect, разрешить рендер для гостей
- `src/pages/Index.tsx` — добавить hero + лендинг-секции для гостей
- `src/pages/Dictionary.tsx`, `src/pages/Games.tsx`, `src/pages/WordLookup.tsx` — soft-gate
- `src/components/MobileBottomNav.tsx`, `DesktopSidebar.tsx` — динамические пункты
- `src/components/CategorySelector.tsx` — гостевые "пробные" бейджи
- `src/components/Flashcard.tsx` (+ Reading/Listening) — модал "сохрани прогресс" после 2-го
- `index.html` — SEO мета (title/description/OG)
- Edge functions `lookup-word`, etc. — снять `verify_jwt` для гостевого режима (или поддержать anon путь)

Миграция: при необходимости `GRANT SELECT TO anon` на контент-таблицы для гостевого просмотра.

## Что НЕ трогаем

- Существующую логику Stripe и `useSubscription` — она готова.
- Tutoring/Academy/Admin — только закрываем как PREMIUM на уровне роутинга.
- Telegram Mini App — оставляем как есть (TMA всегда auth-режим).