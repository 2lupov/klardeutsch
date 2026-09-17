CREATE TABLE public.tutoring_lesson_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES public.tutoring_lessons(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  sort_order integer NOT NULL DEFAULT 0,
  visible_to_student boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'manual',
  book_page_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tlb_lesson ON public.tutoring_lesson_blocks(lesson_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutoring_lesson_blocks TO authenticated;
GRANT ALL ON public.tutoring_lesson_blocks TO service_role;

ALTER TABLE public.tutoring_lesson_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lesson participants can view blocks"
ON public.tutoring_lesson_blocks FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tutoring_lessons l
  WHERE l.id = tutoring_lesson_blocks.lesson_id
    AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Teacher can insert blocks"
ON public.tutoring_lesson_blocks FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tutoring_lessons l
  WHERE l.id = tutoring_lesson_blocks.lesson_id
    AND (l.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Teacher can update blocks"
ON public.tutoring_lesson_blocks FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tutoring_lessons l
  WHERE l.id = tutoring_lesson_blocks.lesson_id
    AND (l.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE POLICY "Teacher can delete blocks"
ON public.tutoring_lesson_blocks FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.tutoring_lessons l
  WHERE l.id = tutoring_lesson_blocks.lesson_id
    AND (l.teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
));

CREATE TRIGGER trg_tlb_updated_at
BEFORE UPDATE ON public.tutoring_lesson_blocks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.tutoring_block_answers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id uuid NOT NULL REFERENCES public.tutoring_lesson_blocks(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 0,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (block_id, student_id)
);

CREATE INDEX idx_tba_block ON public.tutoring_block_answers(block_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tutoring_block_answers TO authenticated;
GRANT ALL ON public.tutoring_block_answers TO service_role;

ALTER TABLE public.tutoring_block_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view block answers"
ON public.tutoring_block_answers FOR SELECT TO authenticated
USING (
  student_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.tutoring_lesson_blocks b
    JOIN public.tutoring_lessons l ON l.id = b.lesson_id
    WHERE b.id = tutoring_block_answers.block_id AND l.teacher_id = auth.uid()
  )
);

CREATE POLICY "Student can save own block answers"
ON public.tutoring_block_answers FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Student or teacher can update block answers"
ON public.tutoring_block_answers FOR UPDATE TO authenticated
USING (
  student_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.tutoring_lesson_blocks b
    JOIN public.tutoring_lessons l ON l.id = b.lesson_id
    WHERE b.id = tutoring_block_answers.block_id AND l.teacher_id = auth.uid()
  )
);

CREATE TRIGGER trg_tba_updated_at
BEFORE UPDATE ON public.tutoring_block_answers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();