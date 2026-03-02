
-- Create admin password check function (security definer, no direct table access needed)
CREATE OR REPLACE FUNCTION public.check_admin_password(input_password TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_settings WHERE admin_password = input_password
  )
$$;

-- Drop overly permissive write policies
DROP POLICY "Admins can insert vocab_cards" ON public.vocab_cards;
DROP POLICY "Admins can update vocab_cards" ON public.vocab_cards;
DROP POLICY "Admins can delete vocab_cards" ON public.vocab_cards;

DROP POLICY "Admins can insert grammar_lessons" ON public.grammar_lessons;
DROP POLICY "Admins can update grammar_lessons" ON public.grammar_lessons;
DROP POLICY "Admins can delete grammar_lessons" ON public.grammar_lessons;

DROP POLICY "Admins can insert grammar_questions" ON public.grammar_questions;
DROP POLICY "Admins can update grammar_questions" ON public.grammar_questions;
DROP POLICY "Admins can delete grammar_questions" ON public.grammar_questions;

DROP POLICY "Admins can insert reading_texts" ON public.reading_texts;
DROP POLICY "Admins can update reading_texts" ON public.reading_texts;
DROP POLICY "Admins can delete reading_texts" ON public.reading_texts;

DROP POLICY "Admins can insert reading_questions" ON public.reading_questions;
DROP POLICY "Admins can update reading_questions" ON public.reading_questions;
DROP POLICY "Admins can delete reading_questions" ON public.reading_questions;

-- Recreate write policies requiring authenticated users
CREATE POLICY "Auth users can insert vocab_cards" ON public.vocab_cards FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update vocab_cards" ON public.vocab_cards FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete vocab_cards" ON public.vocab_cards FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can insert grammar_lessons" ON public.grammar_lessons FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update grammar_lessons" ON public.grammar_lessons FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete grammar_lessons" ON public.grammar_lessons FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can insert grammar_questions" ON public.grammar_questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update grammar_questions" ON public.grammar_questions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete grammar_questions" ON public.grammar_questions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can insert reading_texts" ON public.reading_texts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update reading_texts" ON public.reading_texts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete reading_texts" ON public.reading_texts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users can insert reading_questions" ON public.reading_questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update reading_questions" ON public.reading_questions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users can delete reading_questions" ON public.reading_questions FOR DELETE TO authenticated USING (true);
