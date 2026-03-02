
-- Listening texts table
CREATE TABLE public.listening_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL,
  title text NOT NULL,
  text text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.listening_texts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read listening_texts" ON public.listening_texts FOR SELECT USING (true);
CREATE POLICY "Auth users can insert listening_texts" ON public.listening_texts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update listening_texts" ON public.listening_texts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete listening_texts" ON public.listening_texts FOR DELETE TO authenticated USING (true);

-- Listening questions (quiz-style)
CREATE TABLE public.listening_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listening_id uuid REFERENCES public.listening_texts(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options text[] NOT NULL,
  correct_index integer NOT NULL,
  explanation text,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.listening_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read listening_questions" ON public.listening_questions FOR SELECT USING (true);
CREATE POLICY "Auth users can insert listening_questions" ON public.listening_questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update listening_questions" ON public.listening_questions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete listening_questions" ON public.listening_questions FOR DELETE TO authenticated USING (true);

-- Dictation exercises
CREATE TABLE public.listening_dictations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listening_id uuid REFERENCES public.listening_texts(id) ON DELETE CASCADE NOT NULL,
  sentence text NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.listening_dictations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read listening_dictations" ON public.listening_dictations FOR SELECT USING (true);
CREATE POLICY "Auth users can insert listening_dictations" ON public.listening_dictations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update listening_dictations" ON public.listening_dictations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete listening_dictations" ON public.listening_dictations FOR DELETE TO authenticated USING (true);
