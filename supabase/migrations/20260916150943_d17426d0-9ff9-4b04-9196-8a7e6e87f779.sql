CREATE TABLE public.tutoring_reading_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.tutoring_lessons(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'reading',
  title text NOT NULL DEFAULT 'Lesetext',
  level text,
  images text[] NOT NULL DEFAULT '{}',
  body text NOT NULL DEFAULT '',
  gaps jsonb NOT NULL DEFAULT '[]',
  quiz jsonb NOT NULL DEFAULT '[]',
  student_answers jsonb NOT NULL DEFAULT '{}',
  quiz_answers jsonb NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  created_by uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutoring_reading_tasks TO authenticated;
GRANT ALL ON public.tutoring_reading_tasks TO service_role;

ALTER TABLE public.tutoring_reading_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lesson participants read reading tasks"
ON public.tutoring_reading_tasks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tutoring_lessons l
  WHERE l.id = tutoring_reading_tasks.lesson_id
    AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid())
));

CREATE POLICY "Teachers insert reading tasks"
ON public.tutoring_reading_tasks FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tutoring_lessons l
  WHERE l.id = tutoring_reading_tasks.lesson_id AND l.teacher_id = auth.uid()
));

CREATE POLICY "Lesson participants update reading tasks"
ON public.tutoring_reading_tasks FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tutoring_lessons l
  WHERE l.id = tutoring_reading_tasks.lesson_id
    AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tutoring_lessons l
  WHERE l.id = tutoring_reading_tasks.lesson_id
    AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid())
));

CREATE POLICY "Teachers delete reading tasks"
ON public.tutoring_reading_tasks FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tutoring_lessons l
  WHERE l.id = tutoring_reading_tasks.lesson_id AND l.teacher_id = auth.uid()
));

CREATE TRIGGER trg_trt_updated BEFORE UPDATE ON public.tutoring_reading_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_trt_lesson ON public.tutoring_reading_tasks(lesson_id);

-- Storage: reading/{lesson_id}/... inside the existing private tutoring-materials bucket
CREATE POLICY "Teachers upload reading photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'reading'
  AND EXISTS (
    SELECT 1 FROM public.tutoring_lessons l
    WHERE l.id::text = (storage.foldername(name))[2] AND l.teacher_id = auth.uid()
  )
);

CREATE POLICY "Lesson participants read reading photos"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'reading'
  AND EXISTS (
    SELECT 1 FROM public.tutoring_lessons l
    WHERE l.id::text = (storage.foldername(name))[2]
      AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid())
  )
);

CREATE POLICY "Teachers delete reading photos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'tutoring-materials'
  AND (storage.foldername(name))[1] = 'reading'
  AND EXISTS (
    SELECT 1 FROM public.tutoring_lessons l
    WHERE l.id::text = (storage.foldername(name))[2] AND l.teacher_id = auth.uid()
  )
);