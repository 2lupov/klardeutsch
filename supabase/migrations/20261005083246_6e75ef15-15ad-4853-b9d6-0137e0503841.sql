CREATE TABLE public.skill_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_code text NOT NULL,
  can_do_key text NOT NULL,
  lesson_id text,
  exercise_id text,
  with_support boolean NOT NULL DEFAULT true,
  new_situation boolean NOT NULL DEFAULT false,
  rubric jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.skill_attempts TO authenticated;
GRANT ALL ON public.skill_attempts TO service_role;
ALTER TABLE public.skill_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own attempts read" ON public.skill_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "Own attempts insert" ON public.skill_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own attempts delete" ON public.skill_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX idx_skill_attempts_user ON public.skill_attempts (user_id, course_code);