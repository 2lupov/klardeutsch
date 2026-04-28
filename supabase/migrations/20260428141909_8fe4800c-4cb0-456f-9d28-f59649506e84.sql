CREATE TABLE IF NOT EXISTS public.tutoring_lesson_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL UNIQUE REFERENCES public.tutoring_lessons(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tutoring_lesson_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tln_participants_read"
  ON public.tutoring_lesson_notes FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tutoring_lessons l
    WHERE l.id = tutoring_lesson_notes.lesson_id
      AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "tln_teacher_insert"
  ON public.tutoring_lesson_notes FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tutoring_lessons l
    WHERE l.id = tutoring_lesson_notes.lesson_id
      AND (l.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

CREATE POLICY "tln_teacher_update"
  ON public.tutoring_lesson_notes FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.tutoring_lessons l
    WHERE l.id = tutoring_lesson_notes.lesson_id
      AND (l.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  ));

ALTER PUBLICATION supabase_realtime ADD TABLE public.tutoring_lesson_notes;
ALTER TABLE public.tutoring_lesson_notes REPLICA IDENTITY FULL;