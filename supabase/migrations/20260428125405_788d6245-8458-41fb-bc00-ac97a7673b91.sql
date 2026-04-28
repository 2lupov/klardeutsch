
-- ===== TUTORING RELATIONSHIPS =====
CREATE TABLE public.tutoring_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | active | declined
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(student_id, teacher_id)
);
ALTER TABLE public.tutoring_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tr_student_select" ON public.tutoring_relationships FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "tr_student_insert" ON public.tutoring_relationships FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id AND has_role(teacher_id, 'teacher'));

CREATE POLICY "tr_teacher_update" ON public.tutoring_relationships FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id OR auth.uid() = student_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "tr_delete" ON public.tutoring_relationships FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id OR auth.uid() = student_id OR has_role(auth.uid(), 'admin'));

-- ===== TUTORING LESSONS =====
CREATE TABLE public.tutoring_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL,
  student_id uuid NOT NULL,
  title text NOT NULL,
  topic text,
  level text NOT NULL DEFAULT 'A1',
  theory text,
  meeting_link text,
  scheduled_at timestamptz,
  duration_minutes integer DEFAULT 60,
  status text NOT NULL DEFAULT 'draft', -- draft | scheduled | completed | cancelled
  notes text,
  ai_prompt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tutoring_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tl_select" ON public.tutoring_lessons FOR SELECT TO authenticated
  USING (auth.uid() = teacher_id OR auth.uid() = student_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "tl_teacher_insert" ON public.tutoring_lessons FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = teacher_id AND has_role(auth.uid(), 'teacher'));

CREATE POLICY "tl_teacher_update" ON public.tutoring_lessons FOR UPDATE TO authenticated
  USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "tl_teacher_delete" ON public.tutoring_lessons FOR DELETE TO authenticated
  USING (auth.uid() = teacher_id OR has_role(auth.uid(), 'admin'));

-- ===== LESSON WORDS =====
CREATE TABLE public.tutoring_lesson_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.tutoring_lessons(id) ON DELETE CASCADE,
  german text NOT NULL,
  article text,
  russian text NOT NULL,
  example text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tutoring_lesson_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tlw_select" ON public.tutoring_lesson_words FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "tlw_teacher_write" ON public.tutoring_lesson_words FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

-- ===== LESSON EXERCISES =====
CREATE TABLE public.tutoring_lesson_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.tutoring_lessons(id) ON DELETE CASCADE,
  exercise_type text NOT NULL DEFAULT 'quiz', -- quiz | cloze | translation | open
  question text NOT NULL,
  options jsonb DEFAULT '[]'::jsonb,
  correct_answer text,
  explanation text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tutoring_lesson_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tle_select" ON public.tutoring_lesson_exercises FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "tle_teacher_write" ON public.tutoring_lesson_exercises FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))))
  WITH CHECK (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

-- ===== HOMEWORK =====
CREATE TABLE public.tutoring_homework (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.tutoring_lessons(id) ON DELETE CASCADE,
  description text NOT NULL,
  due_at timestamptz,
  submission text,
  submitted_at timestamptz,
  feedback text,
  grade integer,
  status text NOT NULL DEFAULT 'assigned', -- assigned | submitted | graded
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.tutoring_homework ENABLE ROW LEVEL SECURITY;

CREATE POLICY "th_select" ON public.tutoring_homework FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "th_teacher_insert" ON public.tutoring_homework FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "th_update" ON public.tutoring_homework FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR l.student_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

CREATE POLICY "th_teacher_delete" ON public.tutoring_homework FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM tutoring_lessons l WHERE l.id = lesson_id 
    AND (l.teacher_id = auth.uid() OR has_role(auth.uid(), 'admin'))));

-- Indexes
CREATE INDEX idx_tr_student ON public.tutoring_relationships(student_id);
CREATE INDEX idx_tr_teacher ON public.tutoring_relationships(teacher_id);
CREATE INDEX idx_tl_teacher ON public.tutoring_lessons(teacher_id);
CREATE INDEX idx_tl_student ON public.tutoring_lessons(student_id);

-- updated_at triggers
CREATE TRIGGER trg_tr_updated BEFORE UPDATE ON public.tutoring_relationships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tl_updated BEFORE UPDATE ON public.tutoring_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_th_updated BEFORE UPDATE ON public.tutoring_homework
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: search teachers by nickname/display_name
CREATE OR REPLACE FUNCTION public.search_teachers(p_query text)
RETURNS TABLE(user_id uuid, display_name text, avatar_url text, nickname text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.user_id, p.display_name, p.avatar_url, p.nickname
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.user_id AND r.role = 'teacher'
  WHERE p_query IS NULL OR p_query = '' 
     OR p.display_name ILIKE '%' || p_query || '%'
     OR p.nickname ILIKE '%' || p_query || '%'
  LIMIT 20;
$$;
