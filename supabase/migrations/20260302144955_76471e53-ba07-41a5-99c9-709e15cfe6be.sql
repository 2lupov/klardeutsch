
-- Vocab cards table
CREATE TABLE public.vocab_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL,
  german TEXT NOT NULL,
  russian TEXT NOT NULL,
  example TEXT,
  article TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vocab_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read vocab_cards" ON public.vocab_cards FOR SELECT USING (true);
CREATE POLICY "Admins can insert vocab_cards" ON public.vocab_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update vocab_cards" ON public.vocab_cards FOR UPDATE USING (true);
CREATE POLICY "Admins can delete vocab_cards" ON public.vocab_cards FOR DELETE USING (true);

-- Grammar lessons table
CREATE TABLE public.grammar_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL UNIQUE,
  theory TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grammar_lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read grammar_lessons" ON public.grammar_lessons FOR SELECT USING (true);
CREATE POLICY "Admins can insert grammar_lessons" ON public.grammar_lessons FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update grammar_lessons" ON public.grammar_lessons FOR UPDATE USING (true);
CREATE POLICY "Admins can delete grammar_lessons" ON public.grammar_lessons FOR DELETE USING (true);

-- Grammar questions table
CREATE TABLE public.grammar_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grammar_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read grammar_questions" ON public.grammar_questions FOR SELECT USING (true);
CREATE POLICY "Admins can insert grammar_questions" ON public.grammar_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update grammar_questions" ON public.grammar_questions FOR UPDATE USING (true);
CREATE POLICY "Admins can delete grammar_questions" ON public.grammar_questions FOR DELETE USING (true);

-- Reading texts table
CREATE TABLE public.reading_texts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_texts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reading_texts" ON public.reading_texts FOR SELECT USING (true);
CREATE POLICY "Admins can insert reading_texts" ON public.reading_texts FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update reading_texts" ON public.reading_texts FOR UPDATE USING (true);
CREATE POLICY "Admins can delete reading_texts" ON public.reading_texts FOR DELETE USING (true);

-- Reading questions table
CREATE TABLE public.reading_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id UUID NOT NULL REFERENCES public.reading_texts(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_index INTEGER NOT NULL,
  explanation TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reading_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reading_questions" ON public.reading_questions FOR SELECT USING (true);
CREATE POLICY "Admins can insert reading_questions" ON public.reading_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update reading_questions" ON public.reading_questions FOR UPDATE USING (true);
CREATE POLICY "Admins can delete reading_questions" ON public.reading_questions FOR DELETE USING (true);

-- Admin password table (simple password gate)
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_password TEXT NOT NULL DEFAULT 'klar2024'
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
-- No SELECT policy - password checked via edge function only

INSERT INTO public.admin_settings (admin_password) VALUES ('klar2024');
