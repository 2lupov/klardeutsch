
-- 1. Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- 2. Create user_roles table
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. RLS on user_roles: users can read own roles, only admins can manage
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Fix admin_settings: only admins can read, nobody else
CREATE POLICY "Only admins can read admin_settings" ON public.admin_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update admin_settings" ON public.admin_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Fix content tables: replace permissive INSERT/UPDATE/DELETE with admin-only

-- vocab_cards
DROP POLICY IF EXISTS "Auth users can delete vocab_cards" ON public.vocab_cards;
DROP POLICY IF EXISTS "Auth users can insert vocab_cards" ON public.vocab_cards;
DROP POLICY IF EXISTS "Auth users can update vocab_cards" ON public.vocab_cards;

CREATE POLICY "Admins can insert vocab_cards" ON public.vocab_cards
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update vocab_cards" ON public.vocab_cards
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete vocab_cards" ON public.vocab_cards
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- grammar_questions
DROP POLICY IF EXISTS "Auth users can delete grammar_questions" ON public.grammar_questions;
DROP POLICY IF EXISTS "Auth users can insert grammar_questions" ON public.grammar_questions;
DROP POLICY IF EXISTS "Auth users can update grammar_questions" ON public.grammar_questions;

CREATE POLICY "Admins can insert grammar_questions" ON public.grammar_questions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update grammar_questions" ON public.grammar_questions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete grammar_questions" ON public.grammar_questions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- grammar_lessons
DROP POLICY IF EXISTS "Auth users can delete grammar_lessons" ON public.grammar_lessons;
DROP POLICY IF EXISTS "Auth users can insert grammar_lessons" ON public.grammar_lessons;
DROP POLICY IF EXISTS "Auth users can update grammar_lessons" ON public.grammar_lessons;

CREATE POLICY "Admins can insert grammar_lessons" ON public.grammar_lessons
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update grammar_lessons" ON public.grammar_lessons
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete grammar_lessons" ON public.grammar_lessons
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- listening_texts
DROP POLICY IF EXISTS "Auth users can delete listening_texts" ON public.listening_texts;
DROP POLICY IF EXISTS "Auth users can insert listening_texts" ON public.listening_texts;
DROP POLICY IF EXISTS "Auth users can update listening_texts" ON public.listening_texts;

CREATE POLICY "Admins can insert listening_texts" ON public.listening_texts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update listening_texts" ON public.listening_texts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete listening_texts" ON public.listening_texts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- listening_questions
DROP POLICY IF EXISTS "Auth users can delete listening_questions" ON public.listening_questions;
DROP POLICY IF EXISTS "Auth users can insert listening_questions" ON public.listening_questions;
DROP POLICY IF EXISTS "Auth users can update listening_questions" ON public.listening_questions;

CREATE POLICY "Admins can insert listening_questions" ON public.listening_questions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update listening_questions" ON public.listening_questions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete listening_questions" ON public.listening_questions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- listening_dictations
DROP POLICY IF EXISTS "Auth users can delete listening_dictations" ON public.listening_dictations;
DROP POLICY IF EXISTS "Auth users can insert listening_dictations" ON public.listening_dictations;
DROP POLICY IF EXISTS "Auth users can update listening_dictations" ON public.listening_dictations;

CREATE POLICY "Admins can insert listening_dictations" ON public.listening_dictations
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update listening_dictations" ON public.listening_dictations
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete listening_dictations" ON public.listening_dictations
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- reading_texts
DROP POLICY IF EXISTS "Auth users can delete reading_texts" ON public.reading_texts;
DROP POLICY IF EXISTS "Auth users can insert reading_texts" ON public.reading_texts;
DROP POLICY IF EXISTS "Auth users can update reading_texts" ON public.reading_texts;

CREATE POLICY "Admins can insert reading_texts" ON public.reading_texts
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reading_texts" ON public.reading_texts
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reading_texts" ON public.reading_texts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- reading_questions
DROP POLICY IF EXISTS "Auth users can delete reading_questions" ON public.reading_questions;
DROP POLICY IF EXISTS "Auth users can insert reading_questions" ON public.reading_questions;
DROP POLICY IF EXISTS "Auth users can update reading_questions" ON public.reading_questions;

CREATE POLICY "Admins can insert reading_questions" ON public.reading_questions
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update reading_questions" ON public.reading_questions
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete reading_questions" ON public.reading_questions
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- shop_items
DROP POLICY IF EXISTS "Auth users can delete shop items" ON public.shop_items;
DROP POLICY IF EXISTS "Auth users can insert shop items" ON public.shop_items;
DROP POLICY IF EXISTS "Auth users can update shop items" ON public.shop_items;

CREATE POLICY "Admins can insert shop_items" ON public.shop_items
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update shop_items" ON public.shop_items
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete shop_items" ON public.shop_items
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
