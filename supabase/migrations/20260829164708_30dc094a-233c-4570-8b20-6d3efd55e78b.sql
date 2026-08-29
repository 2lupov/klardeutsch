CREATE TABLE public.student_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('test','homework','writing','audio')),
  title text NOT NULL,
  instructions text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  level text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned','submitted','graded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_assignments TO authenticated;
GRANT ALL ON public.student_assignments TO service_role;
ALTER TABLE public.student_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sa_select" ON public.student_assignments FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sa_teacher_insert" ON public.student_assignments FOR INSERT TO authenticated
  WITH CHECK (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sa_teacher_update" ON public.student_assignments FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "sa_teacher_delete" ON public.student_assignments FOR DELETE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.student_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.student_assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  answers jsonb,
  text text,
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  audio_path text,
  auto_score integer,
  ai_feedback text,
  grade integer,
  teacher_feedback text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','graded')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_submissions TO authenticated;
GRANT ALL ON public.student_submissions TO service_role;
ALTER TABLE public.student_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ss_select" ON public.student_submissions FOR SELECT TO authenticated
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.student_assignments a WHERE a.id = assignment_id AND a.teacher_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ss_student_insert" ON public.student_submissions FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "ss_update" ON public.student_submissions FOR UPDATE TO authenticated
  USING (student_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.student_assignments a WHERE a.id = assignment_id AND a.teacher_id = auth.uid()
  ) OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_sa_student ON public.student_assignments(student_id);
CREATE INDEX idx_sa_teacher ON public.student_assignments(teacher_id);
CREATE INDEX idx_ss_assignment ON public.student_submissions(assignment_id);

CREATE TRIGGER trg_sa_updated BEFORE UPDATE ON public.student_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ss_updated BEFORE UPDATE ON public.student_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();