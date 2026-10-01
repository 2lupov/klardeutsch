CREATE TABLE public.presentation_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  presentation_id uuid NOT NULL,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, presentation_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.presentation_progress TO authenticated;
GRANT ALL ON public.presentation_progress TO service_role;
ALTER TABLE public.presentation_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pp_access" ON public.presentation_progress FOR ALL TO authenticated
USING (student_id = auth.uid() OR has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = presentation_progress.student_id AND r.teacher_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = presentation_progress.student_id AND p.created_by_teacher_id = auth.uid()))
WITH CHECK (student_id = auth.uid() OR has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = presentation_progress.student_id AND r.teacher_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = presentation_progress.student_id AND p.created_by_teacher_id = auth.uid()));
CREATE TRIGGER presentation_progress_updated_at BEFORE UPDATE ON public.presentation_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
ALTER TABLE public.student_assignments DROP CONSTRAINT student_assignments_type_check;
ALTER TABLE public.student_assignments ADD CONSTRAINT student_assignments_type_check CHECK (type = ANY (ARRAY['test','homework','writing','audio','modular','book','book_plan','blocks','kit','minicourse','reading','grammar','presentation']));