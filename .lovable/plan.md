# KLAR × Edvibe: єдиний робочий простір для школи

Мета — зібрати чотири речі в одну систему навколо централізованого контенту школи (не приватні репетитори):
**Віртуальний клас · Бібліотека матеріалів · Конструктор уроків · CRM школи.**

У нас вже є: `PresenterMode`, `tutoring_lessons`, `tutoring_lesson_exercises`, `course_lessons`, слайди, AI-генерація. Це не з нуля — це збірка того що є в один продукт з двома чіткими ролями: **Методист/Адмін** і **Вчитель**.

---

## 1. Ролі та навігація

```text
Admin (методист школи)          Teacher (веде уроки)         Student
├─ Курси/уроки школи            ├─ Мій розклад                ├─ Мої уроки
├─ Бібліотека матеріалів  ◄──── ├─ Конструктор уроку  ◄────── ├─ Клас (live)
├─ Учні та групи                ├─ Клас (live)                └─ ДЗ + прогрес
├─ Вчителі                      ├─ Мої учні (CRM lite)
└─ Аналітика школи              └─ ДЗ + перевірка
```

Нова роль `teacher` в `app_role` (є `admin`, `user`). Додаємо `teacher`. Вчитель бачить `/teach/*`, адмін — `/admin` (як зараз, розширений).

---

## 2. Бібліотека матеріалів (ядро, як в Edvibe)

Єдина централізована бібліотека **школи** — все, що вчитель може перетягнути в урок.

Нова таблиця `library_items`:
- `type`: `slide_deck | exercise | video | audio | reading | dialogue | word_list | game`
- `title`, `level` (A1-C1), `topic`, `target_language`, `tags[]`, `cover_url`
- `payload` (jsonb — власне контент або посилання на існуючу сутність)
- `source`: `ai | manual | imported`
- `is_published`, `owner_id`

Наповнюється трьома шляхами:
- **Витягуємо все існуюче** — course_lessons, tutoring_lesson_templates, слайди, listening_texts, reading_texts, cafe_scenarios → одноразовий backfill у `library_items`.
- **AI-генерація** — вже маємо `generate-lesson-slides`, `generate-exercises`, `generate-full-course`.
- **Ручне додавання** методистом.

UI: `/admin/library` — Pinterest-style сітка з фільтрами (рівень, тип, тема, мова). Кнопка **+ у урок**.

---

## 3. Конструктор уроку (drag-and-drop)

`/teach/lesson/:id/build` — двоколонковий редактор:

```text
┌──────────────┬──────────────────────────────┐
│  Бібліотека  │  Полотно уроку               │
│  [пошук]     │  ├─ 1. Слайд-інтро           │
│  [фільтри]   │  ├─ 2. Вправа cloze          │
│              │  ├─ 3. Відео 2хв             │
│  ▢ картки    │  ├─ 4. Діалог                │
│  ▢ картки    │  └─ + додати блок / AI       │
│  ▢ картки    │                              │
└──────────────┴──────────────────────────────┘
```

- Drag-and-drop через `@dnd-kit` (вже в проєкті — використовується в TopicsEditor).
- Кожен блок = рядок у новій таблиці `lesson_blocks` (`lesson_id`, `library_item_id | inline_payload`, `sort_order`, `duration_min`, `settings jsonb`).
- Кнопка **AI-блок** — генерує вправу під контекст попередніх блоків (розширення `generate-lesson-extra-exercises`).
- Прев'ю "очима учня" одним кліком.

---

## 4. Віртуальний клас (розширення PresenterMode)

Те, що вже є у `PresenterMode` + `useStudentLiveSync`, доводимо до рівня "уроку в браузері":

- **Timeline уроку** зверху — вчитель клікає блок → відкривається у класі учня (auto-follow).
- **Whiteboard** (нова панель): вільне малювання + текст. `tldraw` (lightweight, React-friendly) або власне на canvas. Синхронізація через Realtime.
- **Спільний фокус** — коли вчитель виділяє слово/картинку, у учня підсвічується те саме.
- **Reactions & raise hand** — вже є база в `tutoring_live_sessions`, доповнюємо.
- **Chat уроку** — швидкий текстовий чат тільки на час сесії.
- Аудіо/відео — залишаємо на зовнішньому Zoom/Google Meet (лінк у сесії), як у Edvibe MVP; повна WebRTC-кімната — окремим етапом.

---

## 5. CRM школи (централізована)

`/admin/students` вже є. Розширюємо в напрямку Edvibe CRM:

- **Групи** (`student_groups`, `student_group_members`) — курс/рівень/розклад.
- **Розклад** (`class_schedule`): вчитель × група × час × урок з бібліотеки.
- **Відвідуваність** (`attendance`) — авто з `tutoring_live_sessions`.
- **Оплати** — прив'язуємо існуючі `mono_payments` / `subscriptions` до учня; історія у профілі учня.
- **ДЗ** — вже є `tutoring_homework`, додаємо назначення на **групу**, не тільки учня.
- **Картка учня**: прогрес по курсу, відвіданість, ДЗ, оплати, нотатки вчителя — все на одному екрані.

Вчитель бачить те саме, але тільки по своїх групах.

---

## 6. Порядок роботи (щоб не тонути)

Роблю по одному етапу, підтверджуєш кожен перед наступним:

1. **Ролі + `/teach` каркас** — роль `teacher`, guard, порожні сторінки, пункт у сайдбарі для teacher/admin.
2. **`library_items` + backfill** — таблиця, міграція, перенесення існуючого контенту, сторінка `/admin/library` з фільтрами.
3. **Конструктор уроку** — `lesson_blocks`, drag-and-drop, AI-блок, прев'ю.
4. **Клас v2** — timeline у PresenterMode, whiteboard, focus-highlight, chat сесії.
5. **CRM: групи + розклад + відвідуваність.**
6. **CRM: оплати + картка учня + ДЗ на групу.**

Кожен етап = робочий, задеплоєний шматок. Стоп-точки — після 2, 4, 6.

---

## Технічне

- **БД**: 6 нових таблиць (`library_items`, `lesson_blocks`, `student_groups`, `student_group_members`, `class_schedule`, `attendance`). Всі з RLS: admin — все; teacher — свої групи/уроки; student — тільки свої групи read-only.
- **Роль teacher**: `INSERT INTO app_role` (enum) + політики через `has_role(auth.uid(),'teacher')`.
- **Realtime**: додати `lesson_blocks`, `attendance`, whiteboard-канал у `supabase_realtime`.
- **Drag-and-drop**: `@dnd-kit/core` + `@dnd-kit/sortable`.
- **Whiteboard**: спробуємо `tldraw` (MIT, React); якщо занадто важкий — власний легкий canvas.
- **Що НЕ роблю зараз**: WebRTC відео-кімната (лишаємо зовнішній лінк), маркетплейс контенту між школами, мобільний нативний додаток.

---

Стартую з **етапу 1 (ролі + `/teach` каркас)** щойно скажеш "ок".
