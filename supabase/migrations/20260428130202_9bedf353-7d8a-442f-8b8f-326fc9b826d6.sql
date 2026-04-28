CREATE TABLE public.tutoring_lesson_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  level text NOT NULL DEFAULT 'A1',
  topic text,
  focus text,
  default_meeting_link text,
  default_duration_minutes integer NOT NULL DEFAULT 60,
  words_count integer NOT NULL DEFAULT 10,
  exercises_count integer NOT NULL DEFAULT 8,
  exercise_types jsonb NOT NULL DEFAULT '["quiz","cloze","translation"]'::jsonb,
  vocabulary jsonb NOT NULL DEFAULT '[]'::jsonb,
  theory_template text,
  structure jsonb NOT NULL DEFAULT '{}'::jsonb,
  use_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutoring_lesson_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers manage own templates"
ON public.tutoring_lesson_templates
FOR ALL
TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE INDEX idx_tutoring_templates_teacher ON public.tutoring_lesson_templates(teacher_id, created_at DESC);

CREATE TRIGGER update_tutoring_templates_updated_at
BEFORE UPDATE ON public.tutoring_lesson_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();