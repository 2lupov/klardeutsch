
CREATE TABLE IF NOT EXISTS public.lesson_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES public.tutoring_lessons(id) ON DELETE CASCADE,
  library_item_id UUID REFERENCES public.library_items(id) ON DELETE SET NULL,
  inline_payload JSONB,
  block_type TEXT NOT NULL,
  title TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  duration_min INTEGER,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_blocks_lesson ON public.lesson_blocks(lesson_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_blocks TO authenticated;
GRANT ALL ON public.lesson_blocks TO service_role;

ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "lesson_blocks_admin_all" ON public.lesson_blocks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Teachers can manage blocks for lessons they own (teacher_id) or where they are creator
CREATE POLICY "lesson_blocks_teacher_manage" ON public.lesson_blocks
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.tutoring_lessons tl
      WHERE tl.id = lesson_blocks.lesson_id
        AND (tl.teacher_id = auth.uid())
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.tutoring_lessons tl
      WHERE tl.id = lesson_blocks.lesson_id
        AND (tl.teacher_id = auth.uid())
    )
  );

-- Students can read blocks for their own lessons
CREATE POLICY "lesson_blocks_student_read" ON public.lesson_blocks
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tutoring_lessons tl
      WHERE tl.id = lesson_blocks.lesson_id
        AND tl.student_id = auth.uid()
    )
  );

CREATE TRIGGER update_lesson_blocks_updated_at
  BEFORE UPDATE ON public.lesson_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
