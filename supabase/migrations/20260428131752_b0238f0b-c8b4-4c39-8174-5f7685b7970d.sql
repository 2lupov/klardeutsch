CREATE TABLE public.tutoring_placement_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL CHECK (level IN ('A1','A2','B1','B2','C1')),
  question_type text NOT NULL CHECK (question_type IN ('grammar','vocab','cloze','listening','reading')),
  question text NOT NULL,
  context text,
  audio_url text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  correct_index integer NOT NULL,
  explanation text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_placement_questions_level ON public.tutoring_placement_questions(level);
CREATE INDEX idx_placement_questions_type ON public.tutoring_placement_questions(question_type);

ALTER TABLE public.tutoring_placement_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read placement questions"
ON public.tutoring_placement_questions FOR SELECT
TO authenticated USING (true);

CREATE POLICY "Admins manage placement questions"
ON public.tutoring_placement_questions FOR ALL
TO authenticated
USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.tutoring_placement_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed')),
  question_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  scores_by_level jsonb DEFAULT '{}'::jsonb,
  recommended_level text,
  total_score integer DEFAULT 0,
  total_questions integer DEFAULT 0,
  duration_seconds integer,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_placement_assign_student ON public.tutoring_placement_assignments(student_id);
CREATE INDEX idx_placement_assign_teacher ON public.tutoring_placement_assignments(teacher_id);

ALTER TABLE public.tutoring_placement_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teacher and student can read assignments"
ON public.tutoring_placement_assignments FOR SELECT
TO authenticated
USING (auth.uid() = teacher_id OR auth.uid() = student_id);

CREATE POLICY "Teacher can create assignments"
ON public.tutoring_placement_assignments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(),'teacher'::app_role));

CREATE POLICY "Student or teacher can update assignment"
ON public.tutoring_placement_assignments FOR UPDATE
TO authenticated
USING (auth.uid() = student_id OR auth.uid() = teacher_id);

CREATE POLICY "Teacher can delete own assignments"
ON public.tutoring_placement_assignments FOR DELETE
TO authenticated
USING (auth.uid() = teacher_id);

CREATE TRIGGER update_placement_assignments_updated_at
BEFORE UPDATE ON public.tutoring_placement_assignments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();