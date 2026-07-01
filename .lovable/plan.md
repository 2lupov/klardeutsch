
# KLAR → мультимовна школа

Ціль першої ітерації: підняти **англійську** як другу мову end-to-end (лендінг → онбординг → словник → уроки → ігри), не ламаючи існуючу німецьку. Одночасно закласти таку структуру БД і роутінгу, щоб додати польську/іспанську/французьку було чистою data-роботою, а не рефакторингом.

## Архітектурні рішення

- **Один бренд KLAR**, розділи за URL-префіксом: `/de/*`, `/en/*`, `/pl/*`, `/es/*`, `/fr/*`. Німецький контент лишається доступним без префікса для зворотної сумісності + канонічно доступний як `/de/*`.
- Нова таблиця **`languages`** (код, назва, прапор, порядок, is_active) — єдине джерело правди про підтримувані мови.
- У всі контентні таблиці (`vocab_cards`, `topics`, `reading_texts`, `listening_texts`, `grammar_lessons`, `grammar_questions`, `courses`, `course_modules`, `course_lessons`, `cafe_scenarios`, `placement_questions`, `dictations` і т.д.) додається колонка `target_language TEXT NOT NULL DEFAULT 'de'`. Індекс по `(target_language)`.
- У `profiles` — `active_target_language TEXT DEFAULT 'de'`. Юзер обирає мову вивчення у профілі/онбордингу; всі списки, статистика, XP, коіни фільтруються по цій мові.
- **XP/коіни/streak** лишаються глобальними на юзера (одна економіка на школу). Прогрес по контенту — вже per language.
- Ліміти підписок (School/Assistant/All-in-One) працюють однаково для всіх мов.

## Що робимо в цьому кроці (MVP English)

### 1. База
- Таблиця `languages` з сідом (de, en, pl, es, fr; активні: de, en).
- Колонка `target_language` в усіх контентних таблицях, backfill = 'de', індекси, GRANT.
- `profiles.active_target_language` + міграція існуючих юзерів → 'de'.

### 2. Роутінг і мовний контекст
- Провайдер `TargetLanguageProvider` (context + hook `useTargetLanguage()`). Джерело: URL-префікс > profiles.active_target_language > 'de'.
- `App.tsx`: групи маршрутів `/de/*`, `/en/*` рендерять ті самі сторінки, але провайдер підставляє мову. Старі маршрути без префікса → 'de' (не ламаємо посилання).
- `LanguageSelector` (перемикач мови вивчення) — у сайдбарі та в профілі, окремо від UI-мови (RU/UK/DE).

### 3. Онбординг
- Крок «Що вивчаєш?» — вибір мови з прапорцями. Записується в `profiles.active_target_language` й одразу редіректить на `/en/...`.
- Гостям на лендінзі — hero-блок з чотирма мовами (EN активна, PL/ES/FR — «Soon»).

### 4. Контент англійської (MVP-обʼєм)
- **Словник**: 300 базових слів A1 (тематики: greetings, family, food, travel, work, home, numbers, time). Генерація AI batch → адмінка → БД.
- **Читання**: 10 текстів A1-A2 з питаннями.
- **Аудіювання**: 10 текстів TTS + питання.
- **Граматика**: 5 базових уроків (to be, articles, present simple, plurals, questions).
- **Ігри**: усі 7 наявних ігор автоматично працюють з `target_language='en'` (беруть слова з словника поточної мови). Артикль-гра ховається для EN, бо артиклів немає.
- **Курс Академії** A1 English — 1 модуль, 5 уроків як демо.

### 5. Адмінка
- Селектор мови у топбарі адмінки. Все, що редагуємо (топіки, слова, тексти, курси), тегається поточною target_language.
- Кнопка «AI-згенерувати X слів/текстів/уроків для {мови} рівня {A1..C1}» — існуючі edge functions отримують параметр `targetLanguage`.

### 6. Що НЕ входить у цей крок
- Локалізація UI німецьких артикул-специфічних фіч на англійську (там де їх нема — просто ховаємо).
- PL/ES/FR — тільки скелет БД, контент не наповнюємо.
- TMA (Telegram) — лишається німецькою, мультимовність тільки на веб.

## Технічні деталі

**Міграція БД (одним запитом)**
```
CREATE TABLE public.languages (code text PK, name_en, name_ru, name_uk, name_native, flag_emoji, sort_order int, is_active bool);
INSERT ... ('de','German','Немецкий',...,'🇩🇪',1,true), ('en',...,'🇬🇧',2,true), ('pl',..,false), ('es',..,false), ('fr',..,false);
ALTER TABLE vocab_cards, topics, reading_texts, reading_questions, listening_texts, listening_questions, listening_dictations, grammar_lessons, grammar_questions, courses, course_modules, course_lessons, cafe_scenarios, placement_questions, kids_placement_questions, tutoring_lesson_templates
  ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES languages(code);
CREATE INDEX ... ON each (target_language);
ALTER TABLE profiles ADD COLUMN active_target_language text NOT NULL DEFAULT 'de' REFERENCES languages(code);
GRANT SELECT ON public.languages TO anon, authenticated;
```

**Роутінг**
```
<Route path="/:lang(de|en|pl|es|fr)/*" element={<TargetLanguageProvider><AppLayout/></TargetLanguageProvider>}>
  <Route index element={<Index/>} />
  <Route path="dictionary" element={<Dictionary/>} />
  ...
</Route>
<Route path="/*" element={<TargetLanguageProvider defaultLang="de"><AppLayout/></TargetLanguageProvider>}>...</Route>
```

**Хук**
```ts
const lang = useTargetLanguage(); // 'de' | 'en' | ...
supabase.from('vocab_cards').select('*').eq('target_language', lang);
```

**Sitemap / SEO**
- Оновити `public/sitemap.xml`: додати `/en`, `/en/dictionary`, `/en/games`, `/en/academy`.
- `<link rel="alternate" hreflang="en" href="https://klar.academy/en/">` в `index.html`.
- Гостьовий лендінг — окремі `<title>` / meta для `/en/` через react-helmet-async.

## Порядок виконання

1. Міграція БД (`languages` + `target_language` всюди + backfill).
2. `TargetLanguageProvider` + хук + перемикач мови у сайдбарі.
3. Новий роутінг `/en/*` + всі сторінки читають `useTargetLanguage()`.
4. Селектор мови в адмінці + оновлені edge functions генерації.
5. Наповнення MVP-контенту англійської через адмінку (300 слів + тексти + уроки).
6. Оновлення онбордингу + гостьового hero.
7. SEO (sitemap, hreflang, meta).

Після твого «ок» починаю з кроку 1 — міграції БД.
