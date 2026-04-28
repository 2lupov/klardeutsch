-- Flag on profile: is the student a kid (9–12)?
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_kid boolean NOT NULL DEFAULT false;

-- Kids placement questions (separate table)
CREATE TABLE IF NOT EXISTS public.kids_placement_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('A1','A2')),
  emoji text NOT NULL DEFAULT '🐼',
  question_de text NOT NULL,
  hint_ru text,
  options jsonb NOT NULL,
  correct integer NOT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.kids_placement_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read kids_placement_questions"
  ON public.kids_placement_questions FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins manage kids_placement_questions"
  ON public.kids_placement_questions FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_kids_placement_level ON public.kids_placement_questions(level, sort_order);