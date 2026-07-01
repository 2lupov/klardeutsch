
-- 1. Таблиця мов
CREATE TABLE public.languages (
  code text PRIMARY KEY,
  name_en text NOT NULL,
  name_ru text NOT NULL,
  name_uk text NOT NULL,
  name_native text NOT NULL,
  flag_emoji text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.languages TO anon, authenticated;
GRANT ALL ON public.languages TO service_role;

ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Languages readable by everyone"
  ON public.languages FOR SELECT
  USING (true);

CREATE POLICY "Only admins can modify languages"
  ON public.languages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.languages (code, name_en, name_ru, name_uk, name_native, flag_emoji, sort_order, is_active) VALUES
  ('de', 'German',   'Немецкий',    'Німецька',   'Deutsch',  '🇩🇪', 1, true),
  ('en', 'English',  'Английский',  'Англійська', 'English',  '🇬🇧', 2, true),
  ('pl', 'Polish',   'Польский',    'Польська',   'Polski',   '🇵🇱', 3, false),
  ('es', 'Spanish',  'Испанский',   'Іспанська',  'Español',  '🇪🇸', 4, false),
  ('fr', 'French',   'Французский', 'Французька', 'Français', '🇫🇷', 5, false);

-- 2. Додаємо target_language до всіх контентних таблиць
ALTER TABLE public.vocab_cards               ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.topics                    ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.reading_texts             ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.reading_questions         ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.listening_texts           ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.listening_questions       ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.listening_dictations      ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.grammar_lessons           ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.grammar_questions         ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.courses                   ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.course_modules            ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.course_lessons            ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.cafe_scenarios            ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.placement_questions       ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.kids_placement_questions  ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
ALTER TABLE public.tutoring_lesson_templates ADD COLUMN target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);

-- 3. Індекси для швидкої фільтрації
CREATE INDEX idx_vocab_cards_lang        ON public.vocab_cards(target_language);
CREATE INDEX idx_topics_lang             ON public.topics(target_language);
CREATE INDEX idx_reading_texts_lang      ON public.reading_texts(target_language);
CREATE INDEX idx_listening_texts_lang    ON public.listening_texts(target_language);
CREATE INDEX idx_grammar_lessons_lang    ON public.grammar_lessons(target_language);
CREATE INDEX idx_courses_lang            ON public.courses(target_language);
CREATE INDEX idx_course_lessons_lang     ON public.course_lessons(target_language);
CREATE INDEX idx_cafe_scenarios_lang     ON public.cafe_scenarios(target_language);
CREATE INDEX idx_placement_q_lang        ON public.placement_questions(target_language);
CREATE INDEX idx_kids_placement_q_lang   ON public.kids_placement_questions(target_language);
CREATE INDEX idx_lesson_templates_lang   ON public.tutoring_lesson_templates(target_language);

-- 4. Профіль: мова вивчення
ALTER TABLE public.profiles ADD COLUMN active_target_language text NOT NULL DEFAULT 'de' REFERENCES public.languages(code);
