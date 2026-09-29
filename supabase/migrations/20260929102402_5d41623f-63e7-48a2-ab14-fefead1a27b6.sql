CREATE TABLE public.live_class_reading (
  class_id uuid PRIMARY KEY REFERENCES public.live_classes(id) ON DELETE CASCADE,
  text text NOT NULL DEFAULT '',
  topic jsonb,
  notes text NOT NULL DEFAULT '',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_class_reading TO authenticated;
GRANT ALL ON public.live_class_reading TO service_role;

ALTER TABLE public.live_class_reading ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Class members manage reading" ON public.live_class_reading
FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = live_class_reading.class_id AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid() OR public.has_role(auth.uid(),'admin'))))
WITH CHECK (EXISTS (SELECT 1 FROM public.live_classes c WHERE c.id = live_class_reading.class_id AND (c.teacher_id = auth.uid() OR c.student_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));

CREATE TRIGGER live_class_reading_updated_at BEFORE UPDATE ON public.live_class_reading
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.student_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  teacher_id uuid,
  folder text NOT NULL DEFAULT 'Нотатки',
  title text NOT NULL DEFAULT 'Нотатка',
  body text NOT NULL DEFAULT '',
  level text,
  source jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX student_notes_student_idx ON public.student_notes(student_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_notes TO authenticated;
GRANT ALL ON public.student_notes TO service_role;

ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Student and teacher manage notes" ON public.student_notes
FOR ALL TO authenticated
USING (
  student_id = auth.uid()
  OR teacher_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = student_notes.student_id AND r.teacher_id = auth.uid())
)
WITH CHECK (
  student_id = auth.uid()
  OR teacher_id = auth.uid()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.tutoring_relationships r WHERE r.student_id = student_notes.student_id AND r.teacher_id = auth.uid())
);

CREATE TRIGGER student_notes_updated_at BEFORE UPDATE ON public.student_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_class_reading;
ALTER PUBLICATION supabase_realtime ADD TABLE public.student_notes;