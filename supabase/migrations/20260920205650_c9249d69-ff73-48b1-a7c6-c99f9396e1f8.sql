CREATE TABLE public.lesson_slot_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  teacher_id UUID,
  week_start DATE NOT NULL,
  slots JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_slot_requests TO authenticated;
GRANT ALL ON public.lesson_slot_requests TO service_role;

ALTER TABLE public.lesson_slot_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own slot requests" ON public.lesson_slot_requests
FOR SELECT TO authenticated
USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students create own slot requests" ON public.lesson_slot_requests
FOR INSERT TO authenticated
WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students update own pending requests" ON public.lesson_slot_requests
FOR UPDATE TO authenticated
USING ((student_id = auth.uid() AND status = 'pending') OR public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Teachers delete slot requests" ON public.lesson_slot_requests
FOR DELETE TO authenticated
USING (student_id = auth.uid() OR public.has_role(auth.uid(), 'teacher'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_lesson_slot_requests_student ON public.lesson_slot_requests (student_id, week_start DESC);
CREATE INDEX idx_lesson_slot_requests_status ON public.lesson_slot_requests (status, created_at DESC);

CREATE TRIGGER trg_lesson_slot_requests_updated
BEFORE UPDATE ON public.lesson_slot_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();