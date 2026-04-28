CREATE TABLE IF NOT EXISTS public.teacher_student_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL,
  student_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  pinned BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tsn_teacher_student ON public.teacher_student_notes (teacher_id, student_id, created_at DESC);

ALTER TABLE public.teacher_student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tsn_teacher_all"
ON public.teacher_student_notes
FOR ALL
TO authenticated
USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = teacher_id);

CREATE TRIGGER trg_tsn_updated_at
BEFORE UPDATE ON public.teacher_student_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
